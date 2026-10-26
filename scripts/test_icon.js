const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const psScript = `
Add-Type -AssemblyName System.Drawing
$exe = (Resolve-Path 'release/La Molienda POS.exe').Path
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exe)
$bmp = $icon.ToBitmap()
$bmp.Save('extracted_icon_test.png')
Write-Host "Width: $($icon.Width), Height: $($icon.Height)"
`;

fs.writeFileSync('temp_icon_test.ps1', psScript);
try {
  const out = execSync('powershell -ExecutionPolicy Bypass -File temp_icon_test.ps1').toString();
  console.log('PowerShell Output:', out);
} catch (e) {
  console.error(e.message);
} finally {
  if (fs.existsSync('temp_icon_test.ps1')) fs.unlinkSync('temp_icon_test.ps1');
}
