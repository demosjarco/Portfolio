//! PowerShell host: the container's main process.
//!
//! - Control API (axum on :8080). The sandbox Durable Object calls it through `ctx.container.getTcpPort(8080)`; the container has no Internet ingress, so nothing else can reach it. The contract is mirrored as Zod schemas in `do/PowerShellSandbox.ts`, which also validates every response.
//! - Sessions. Each browser window gets a detached tmux session (named by the window's UUIDv7) running pwsh, so PowerShell outlives any socket, request, or Durable Object eviction.
//! - Output push. `tmux pipe-pane` writes each pane's raw output into a FIFO; this process reads every FIFO, coalesces bursts, and POSTs them in order to a virtual hostname the Durable Object intercepts. Nothing in the Durable Object holds a stream open, so it can hibernate between bursts.
//!
//! Written in Rust rather than Node to fit `lite` (256 MiB): measured ~3.4 MB RSS and ready in ~90 ms on 1/16 vCPU, versus ~94 MB and ~3.3 s for the same host in Node.

use std::time::Duration;

use axum::{
	Json, Router,
	extract::Path,
	http::StatusCode,
	response::{IntoResponse, Response},
	routing::{get, post, put},
};
use serde::{Deserialize, Serialize};
use tokio::{io::AsyncReadExt, process::Command, sync::mpsc, time::Instant};

const PORT: u16 = 8080;
const FIFO_DIR: &str = "/run/pwsh";
const FLUSH_DELAY: Duration = Duration::from_millis(12);
const MAX_BATCH: usize = 64 * 1024;
const RETRY_FOR: Duration = Duration::from_secs(10);
const MAX_INPUT_CHARS: usize = 16_384;

/* ---------------------------------------------------------- validation */

/// Canonical lowercase UUIDv7, or 400.
fn window_id(raw: &str) -> Result<String, StatusCode> {
	let id = uuid::Uuid::try_parse(raw.trim()).map_err(|_| StatusCode::BAD_REQUEST)?;
	if id.get_version_num() != 7 {
		return Err(StatusCode::BAD_REQUEST);
	}
	Ok(id.hyphenated().to_string())
}

#[derive(Deserialize)]
struct Size {
	cols: u16,
	rows: u16,
}

impl Size {
	fn valid(&self) -> bool {
		(20..=300).contains(&self.cols) && (5..=200).contains(&self.rows)
	}
}

#[derive(Deserialize)]
struct Open {
	cols: u16,
	rows: u16,
	max: u8,
}

#[derive(Deserialize)]
struct Input {
	data: String,
}

#[derive(Serialize)]
struct OpenState {
	state: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot {
	screen: String,
	x: u32,
	y: u32,
	app_cursor: bool,
}

/* ---------------------------------------------------------------- tmux */

/// Run tmux; stdout on success, None on a non-zero exit.
async fn tmux(args: &[&str]) -> Option<String> {
	let out = Command::new("tmux").args(args).output().await.ok()?;
	out.status.success().then(|| String::from_utf8_lossy(&out.stdout).into_owned())
}

/// Exact session match that is also a valid pane target.
fn target(id: &str) -> String {
	format!("={id}:")
}

async fn list_sessions() -> Vec<String> {
	tmux(&["list-sessions", "-F", "#{session_name}"]).await.unwrap_or_default().lines().filter(|l| !l.is_empty()).map(str::to_owned).collect()
}

/* --------------------------------------------------------- output push */

fn sink() -> String {
	std::env::var("PS_SINK").unwrap_or_else(|_| "http://pwsh.internal".to_owned())
}

/// POST with retries for RETRY_FOR. Returns false on 410 (window or sandbox gone).
async fn push(client: &reqwest::Client, url: &str, body: Vec<u8>) -> bool {
	let deadline = Instant::now() + RETRY_FOR;
	let mut backoff = Duration::from_millis(50);
	loop {
		match client.post(url).body(body.clone()).send().await {
			Ok(res) if res.status() == reqwest::StatusCode::GONE => return false,
			Ok(res) if res.status().is_success() => return true,
			_ => {}
		}
		if Instant::now() >= deadline {
			return true;
		}
		tokio::time::sleep(backoff).await;
		backoff = (backoff * 2).min(Duration::from_secs(1));
	}
}

/// Read one pane's FIFO until pwsh exits, pushing coalesced batches in order, then report the exit.
fn pump(client: reqwest::Client, id: String, fifo: String) {
	let (tx, mut rx) = mpsc::channel::<Vec<u8>>(64);

	// Reader: opening a FIFO blocks until pipe-pane attaches; tokio does that on its blocking pool.
	let reader_fifo = fifo.clone();
	tokio::spawn(async move {
		let Ok(mut file) = tokio::fs::File::open(&reader_fifo).await else { return };
		loop {
			let mut buf = vec![0u8; 32 * 1024];
			match file.read(&mut buf).await {
				Ok(0) | Err(_) => break,
				Ok(n) => {
					buf.truncate(n);
					if tx.send(buf).await.is_err() {
						break;
					}
				}
			}
		}
	});

	// Sender: batches by time and size; one request at a time keeps ordering.
	tokio::spawn(async move {
		let out_url = format!("{}/out/{id}", sink());
		let mut batch: Vec<u8> = Vec::new();
		let mut deadline: Option<Instant> = None;
		loop {
			let next = match deadline {
				Some(at) => tokio::select! {
					msg = rx.recv() => Some(msg),
					_ = tokio::time::sleep_until(at) => None,
				},
				None => Some(rx.recv().await),
			};
			match next {
				Some(Some(chunk)) => {
					if batch.is_empty() {
						deadline = Some(Instant::now() + FLUSH_DELAY);
					}
					batch.extend_from_slice(&chunk);
					if batch.len() >= MAX_BATCH {
						push(&client, &out_url, std::mem::take(&mut batch)).await;
						deadline = None;
					}
				}
				// Timer fired: flush.
				None => {
					push(&client, &out_url, std::mem::take(&mut batch)).await;
					deadline = None;
				}
				// Reader finished: pwsh exited or the session was killed.
				Some(None) => {
					if !batch.is_empty() {
						push(&client, &out_url, std::mem::take(&mut batch)).await;
					}
					push(&client, &format!("{}/exit/{id}", sink()), Vec::new()).await;
					let _ = tokio::fs::remove_file(&fifo).await;
					return;
				}
			}
		}
	});
}

/* ------------------------------------------------------------- windows */

async fn create_window(client: reqwest::Client, id: &str, cols: u16, rows: u16) -> bool {
	let fifo = format!("{FIFO_DIR}/{id}");
	let _ = tokio::fs::create_dir_all(FIFO_DIR).await;
	let _ = tokio::fs::remove_file(&fifo).await;
	let made = Command::new("mkfifo").args(["-m", "600", &fifo]).status().await;
	if !made.is_ok_and(|s| s.success()) {
		return false;
	}

	let cmd = format!("tmux wait-for 'go-{id}'; exec pwsh -NoLogo -NoProfileLoadTime");
	let (c, r) = (cols.to_string(), rows.to_string());
	if tmux(&["new-session", "-d", "-s", id, "-x", &c, "-y", &r, "-c", "/root", &cmd]).await.is_none() {
		return false;
	}
	pump(client, id.to_owned(), fifo.clone());
	tmux(&["pipe-pane", "-O", "-t", &target(id), &format!("exec cat > '{fifo}'")]).await;
	tmux(&["wait-for", "-S", &format!("go-{id}")]).await;
	true
}

/* ---------------------------------------------------------------- API */

async fn open(client: reqwest::Client, Path(raw): Path<String>, Json(body): Json<Open>) -> Response {	let id = match window_id(&raw) {
		Ok(id) => id,
		Err(code) => return code.into_response(),
	};
	if !(Size { cols: body.cols, rows: body.rows }).valid() || !(1..=16).contains(&body.max) {
		return StatusCode::BAD_REQUEST.into_response();
	}
	let t = target(&id);
	if tmux(&["has-session", "-t", &t]).await.is_some() {
		tmux(&["resize-window", "-t", &t, "-x", &body.cols.to_string(), "-y", &body.rows.to_string()]).await;
		return Json(OpenState { state: "exists" }).into_response();
	}
	if list_sessions().await.len() >= body.max as usize {
		return Json(OpenState { state: "full" }).into_response();
	}
	let created = create_window(client, &id, body.cols, body.rows).await;
	Json(OpenState { state: if created { "created" } else { "failed" } }).into_response()
}

async fn snapshot(Path(raw): Path<String>) -> Response {
	let id = match window_id(&raw) {
		Ok(id) => id,
		Err(code) => return code.into_response(),
	};
	let t = target(&id);
	let (Some(screen), Some(state)) = (tmux(&["capture-pane", "-p", "-e", "-N", "-S", "-", "-t", &t]).await, tmux(&["display-message", "-p", "-t", &t, "#{cursor_x} #{cursor_y} #{keypad_cursor_flag}"]).await) else {
		return StatusCode::NOT_FOUND.into_response();
	};
	let mut parts = state.split_whitespace().map(|n| n.parse::<u32>().unwrap_or(0));
	let (x, y, app) = (parts.next().unwrap_or(0), parts.next().unwrap_or(0), parts.next().unwrap_or(0));
	Json(Snapshot { screen, x, y, app_cursor: app == 1 }).into_response()
}

async fn input(Path(raw): Path<String>, Json(body): Json<Input>) -> StatusCode {
	let Ok(id) = window_id(&raw) else { return StatusCode::BAD_REQUEST };
	let chars = body.data.chars().count();
	if chars == 0 || chars > MAX_INPUT_CHARS {
		return StatusCode::BAD_REQUEST;
	}
	match tmux(&["send-keys", "-t", &target(&id), "-l", "--", &body.data]).await {
		Some(_) => StatusCode::NO_CONTENT,
		None => StatusCode::NOT_FOUND,
	}
}

async fn resize(Path(raw): Path<String>, Json(size): Json<Size>) -> StatusCode {
	let Ok(id) = window_id(&raw) else { return StatusCode::BAD_REQUEST };
	if !size.valid() {
		return StatusCode::BAD_REQUEST;
	}
	match tmux(&["resize-window", "-t", &target(&id), "-x", &size.cols.to_string(), "-y", &size.rows.to_string()]).await {
		Some(_) => StatusCode::NO_CONTENT,
		None => StatusCode::NOT_FOUND,
	}
}

async fn close(Path(raw): Path<String>) -> StatusCode {
	let Ok(id) = window_id(&raw) else { return StatusCode::BAD_REQUEST };
	tmux(&["kill-session", "-t", &target(&id)]).await;
	StatusCode::NO_CONTENT
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
	let client = reqwest::Client::new();
	let open_client = client.clone();
	let app = Router::new()
		.route("/health", get(|| async { StatusCode::NO_CONTENT }))
		.route("/windows", get(|| async { Json(serde_json::json!({ "ids": list_sessions().await })) }))
		.route("/windows/{id}", put(move |path, body| open(open_client.clone(), path, body)).delete(close))
		.route("/windows/{id}/snapshot", get(snapshot))
		.route("/windows/{id}/input", post(input))
		.route("/windows/{id}/size", put(resize));
	let listener = tokio::net::TcpListener::bind(("0.0.0.0", PORT)).await.expect("bind");
	loop {
		let Ok((stream, _)) = listener.accept().await else { continue };
		let service = hyper_util::service::TowerToHyperService::new(app.clone());
		tokio::spawn(async move {
			// The Durable Object's port connection half-closes (shuts down its write side) after sending a request. hyper's default treats that EOF as the client leaving and drops the connection before a slower handler (anything that runs tmux) can answer; half_close keeps it open until the response is written. Without keep_alive(false), the Durable Object's next request on a reused connection never reaches us ("Container port connection closed unexpectedly"), so every request gets its own connection.
			if let Err(error) = hyper::server::conn::http1::Builder::new().half_close(true).keep_alive(false).serve_connection(hyper_util::rt::TokioIo::new(stream), service).await {
				eprintln!("pwsh-host: connection error: {error:?}");
			}
		});
	}
}
