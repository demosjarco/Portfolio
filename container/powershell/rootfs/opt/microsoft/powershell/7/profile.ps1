# AllUsersAllHosts profile: makes pwsh 7 look and behave like Windows PowerShell 2.0's console host on Windows XP.

# 2.0 had no PSReadLine; its line editing (arrow-key history, Home/End, F7-style recall) came from the console itself. pwsh's fallback reader on Linux has no history at all, so keep PSReadLine but strip it down to plain conhost-like editing: no syntax colors, no predictions, no tooltips, nothing persisted to disk.
if (Get-Module PSReadLine) {
	$plain = "`e[39;49m"
	Set-PSReadLineOption -EditMode Windows -PredictionSource None -HistorySaveStyle SaveNothing -BellStyle None -ShowToolTips:$false -ContinuationPrompt '>> ' -Colors @{
		Command            = $plain
		Comment            = $plain
		ContinuationPrompt = $plain
		Default            = $plain
		Emphasis           = $plain
		Error              = $plain
		Keyword            = $plain
		Member             = $plain
		Number             = $plain
		Operator           = $plain
		Parameter          = $plain
		String             = $plain
		Type               = $plain
		Variable           = $plain
		Selection          = "`e[7m"
	}
}

# 2.0 printed full error records (NormalView), not pwsh 7's ConciseView.
$ErrorView = 'NormalView'

# 2.0's ConsoleHost colored errors red on black and warnings/verbose/debug yellow on black.
$PSStyle.Formatting.Error = "`e[91;40m"
$PSStyle.Formatting.ErrorAccent = "`e[91;40m"
$PSStyle.Formatting.Warning = "`e[93;40m"
$PSStyle.Formatting.Verbose = "`e[93;40m"
$PSStyle.Formatting.Debug = "`e[93;40m"
# 2.0 had no colored table headers, file listings or progress bars.
$PSStyle.Formatting.FormatAccent = ''
$PSStyle.Formatting.TableHeader = ''
$PSStyle.Formatting.CustomTableHeaderLabel = ''
$PSStyle.Progress.View = 'Classic'
$PSStyle.FileInfo.Directory = ''
$PSStyle.FileInfo.SymbolicLink = ''
$PSStyle.FileInfo.Executable = ''
$PSStyle.FileInfo.Extension.Clear()

Write-Host 'Windows PowerShell'
Write-Host 'Copyright (C) 2009 Microsoft Corporation. All rights reserved.'
Write-Host ''
