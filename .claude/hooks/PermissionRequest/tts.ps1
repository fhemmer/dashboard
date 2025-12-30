# High-quality TTS using edge-tts with neural voices
param(
    [Parameter(Mandatory=$true)]
    [string]$Text,

    [Parameter(Mandatory=$false)]
    [string]$Voice = "en-US-AriaNeural",

    [Parameter(Mandatory=$false)]
    [int]$Rate = 0  # -50 to +50, 0 is normal speed
)

try {
    # Use edge-tts to speak the text with a high-quality neural voice
    # Voices: en-US-AriaNeural (female), en-US-GuyNeural (male), en-US-JennyNeural (female)

    $rateStr = if ($Rate -ne 0) { "+${Rate}%" } else { "+0%" }

    # Create a temporary file for the audio - use GetTempPath() for reliability
    $tempPath = [System.IO.Path]::GetTempPath()
    $tempFile = Join-Path $tempPath "claude_tts.mp3"

    # Generate the audio file using edge-tts via direct Python call
    $ErrorActionPreference = "Continue"
    & python -m edge_tts --voice $Voice --rate $rateStr --text $Text --write-media "$tempFile" 2>&1 | Out-Null

    if (Test-Path $tempFile) {
        # Play the audio using Add-Type for better compatibility
        Add-Type -AssemblyName presentationCore
        $mediaPlayer = New-Object System.Windows.Media.MediaPlayer
        $mediaPlayer.Open([System.Uri]$tempFile)
        $mediaPlayer.Play()

        # Wait for playback to complete
        Start-Sleep -Milliseconds 500  # Give it time to start
        while ($mediaPlayer.NaturalDuration.HasTimeSpan -eq $false) {
            Start-Sleep -Milliseconds 100
        }
        $duration = $mediaPlayer.NaturalDuration.TimeSpan.TotalSeconds
        Start-Sleep -Seconds $duration

        # Cleanup
        $mediaPlayer.Stop()
        $mediaPlayer.Close()
        Start-Sleep -Milliseconds 200
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    }
    else {
        throw "edge-tts failed to generate audio"
    }
}
catch {
    # Fallback to basic Windows TTS if edge-tts fails
    Add-Type -AssemblyName System.Speech
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.Speak($Text)
}
