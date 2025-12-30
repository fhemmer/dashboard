# Debug version of TTS script
param(
    [Parameter(Mandatory=$true)]
    [string]$Text,

    [Parameter(Mandatory=$false)]
    [string]$Voice = "en-US-AriaNeural",

    [Parameter(Mandatory=$false)]
    [int]$Rate = 0
)

$logFile = Join-Path ([System.IO.Path]::GetTempPath()) "claude_tts_debug.log"
"=== TTS Debug Log $(Get-Date) ===" | Out-File $logFile

try {
    $rateStr = if ($Rate -ne 0) { "+${Rate}%" } else { "+0%" }
    $tempPath = [System.IO.Path]::GetTempPath()
    $tempFile = Join-Path $tempPath "claude_tts.mp3"

    "Temp path: $tempPath" | Out-File $logFile -Append
    "Temp file: $tempFile" | Out-File $logFile -Append
    "Voice: $Voice" | Out-File $logFile -Append
    "Rate: $rateStr" | Out-File $logFile -Append
    "Text: $Text" | Out-File $logFile -Append

    # Run edge-tts and capture all output
    $output = & python -m edge_tts --voice $Voice --rate $rateStr --text $Text --write-media "$tempFile" 2>&1
    "edge-tts output: $output" | Out-File $logFile -Append
    "Exit code: $LASTEXITCODE" | Out-File $logFile -Append

    if (Test-Path $tempFile) {
        "Audio file created successfully" | Out-File $logFile -Append

        Add-Type -AssemblyName presentationCore
        $mediaPlayer = New-Object System.Windows.Media.MediaPlayer
        $mediaPlayer.Open([System.Uri]$tempFile)
        $mediaPlayer.Play()

        Start-Sleep -Milliseconds 500
        while ($mediaPlayer.NaturalDuration.HasTimeSpan -eq $false) {
            Start-Sleep -Milliseconds 100
        }
        $duration = $mediaPlayer.NaturalDuration.TimeSpan.TotalSeconds
        "Playing for $duration seconds" | Out-File $logFile -Append
        Start-Sleep -Seconds $duration

        $mediaPlayer.Stop()
        $mediaPlayer.Close()
        Start-Sleep -Milliseconds 200
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        "Playback complete" | Out-File $logFile -Append
    }
    else {
        "Audio file NOT created - file does not exist" | Out-File $logFile -Append
        throw "edge-tts failed to generate audio"
    }
}
catch {
    "ERROR: $_" | Out-File $logFile -Append
    "Stack trace: $($_.ScriptStackTrace)" | Out-File $logFile -Append

    # Fallback
    Add-Type -AssemblyName System.Speech
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.Speak($Text)
    "Used fallback TTS" | Out-File $logFile -Append
}
