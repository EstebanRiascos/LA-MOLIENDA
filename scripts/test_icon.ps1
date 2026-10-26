Add-Type -AssemblyName System.Drawing
$exe = (Resolve-Path 'release/La Molienda POS.exe').Path
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exe)
if ($icon) {
    $bmp = $icon.ToBitmap()
    $bmp.Save('extracted_icon_test.png')
    Write-Host "Width: $($icon.Width), Height: $($icon.Height)"
} else {
    Write-Host "No icon found"
}
