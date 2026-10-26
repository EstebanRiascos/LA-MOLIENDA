Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class IconHelper {
    [DllImport("shell32.dll", CharSet = CharSet.Auto)]
    public static extern int ExtractIconEx(string szFileName, int nIconIndex, out IntPtr phiconLarge, out IntPtr phiconSmall, int nIcons);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool DestroyIcon(IntPtr hIcon);
}
'@

$exe = (Resolve-Path 'release/La Molienda POS.exe').Path
[IntPtr]$hLarge = [IntPtr]::Zero
[IntPtr]$hSmall = [IntPtr]::Zero
$count = [IconHelper]::ExtractIconEx($exe, 0, [ref]$hLarge, [ref]$hSmall, 1)
Write-Host "ExtractIconEx count: $count"
if ($hLarge -ne [IntPtr]::Zero) {
    $large = [System.Drawing.Icon]::FromHandle($hLarge)
    Write-Host "Large icon size: $($large.Width) x $($large.Height)"
    $large.ToBitmap().Save('extracted_large.png')
    [IconHelper]::DestroyIcon($hLarge)
}
if ($hSmall -ne [IntPtr]::Zero) {
    $small = [System.Drawing.Icon]::FromHandle($hSmall)
    Write-Host "Small icon size: $($small.Width) x $($small.Height)"
    [IconHelper]::DestroyIcon($hSmall)
}
