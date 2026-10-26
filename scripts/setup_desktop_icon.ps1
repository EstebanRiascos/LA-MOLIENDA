Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ShellHelper {
    [DllImport("shell32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern void SHChangeNotify(uint wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
'@

$desktopPath = [Environment]::GetFolderPath('Desktop')
Write-Host "Desktop folder: $desktopPath"

$exePath = (Resolve-Path 'release/La Molienda POS.exe').Path
$icoPath = (Resolve-Path 'build/icon.ico').Path

# 1. Crear Acceso Directo oficial en el Escritorio con icono vinculado
$wsh = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktopPath "La Molienda POS.lnk"
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = [System.IO.Path]::GetDirectoryName($exePath)
$shortcut.IconLocation = "$icoPath,0"
$shortcut.Description = "La Molienda POS - Sistema Integral de Ventas y Control de Mesas"
$shortcut.Save()

Write-Host "Acceso directo creado en: $shortcutPath"

# 2. Notificar al Explorador de Windows que recargue la cach de iconos (SHCNE_ASSOCCHANGED = 0x08000000, SHCNF_IDLIST = 0)
[ShellHelper]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)

# 3. Invocar ie4uinit para refrescar la cach en Windows 10/11
Start-Process -FilePath "ie4uinit.exe" -ArgumentList "-show" -Wait -NoNewWindow -ErrorAction SilentlyContinue

Write-Host "Icon cache refreshed successfully!"
