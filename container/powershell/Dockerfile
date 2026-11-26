FROM rust:1.100.0-bookworm@sha256:75d26c23c24cc6ea1cdabf0714a6bff8fd7bf3248716043fd7ae86dac7f41b94 AS host
WORKDIR /src
COPY host/ ./
RUN --mount=type=cache,target=/usr/local/cargo/registry --mount=type=cache,target=/usr/local/cargo/git --mount=type=cache,target=/src/target cargo build --release --locked
RUN cp target/release/pwsh-host /usr/local/bin/pwsh-host

FROM mcr.microsoft.com/powershell:7.5-debian-bookworm@sha256:7ab5bd5ca6f95a3351fa0c6a1205237d57048c94542355aab55519a0861a9b25
RUN --mount=type=cache,target=/var/cache/ apt update
RUN --mount=type=cache,target=/var/cache/ apt install -y --no-install-recommends tmux
RUN --mount=type=cache,target=/var/cache/ apt clean
COPY --from=host /usr/local/bin/pwsh-host /usr/local/bin/pwsh-host
COPY rootfs/ /
# The base image sets LC_ALL=en_US.UTF-8 without generating that locale; C.UTF-8 ships with Debian and keeps tmux and pwsh in UTF-8.
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV TERM=xterm-256color
ENV POWERSHELL_TELEMETRY_OPTOUT=1
ENV POWERSHELL_UPDATECHECK=Off
WORKDIR /root
CMD ["/usr/local/bin/pwsh-host"]
