$desktop = [Environment]::GetFolderPath('Desktop')
Write-Host "Target Desktop: $desktop"

$sourceExe = (Resolve-Path 'release/La Molienda POS.exe').Path
$destExe = Join-Path $desktop 'La Molienda POS.exe'
Write-Host "Copying $sourceExe to $destExe..."
Copy-Item $sourceExe $destExe -Force
Write-Host "File copy completed successfully! Size: $((Get-Item $destExe).Length) bytes"

# Run setup_desktop_icon to create the shortcut and refresh the icon cache
& (Join-Path (Get-Location).Path 'scripts/setup_desktop_icon.ps1')

Write-Host "All done!"
