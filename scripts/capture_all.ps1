$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$out = 'd:\LA-MOLIENDA-main\manual_assets'
if (!(Test-Path $out)) {
    New-Item -ItemType Directory -Path $out -Force | Out-Null
}

$shots = @(
    @{ file = "$out\01_login.png"; url = 'http://localhost:5173/?login=1' },
    @{ file = "$out\02_mesas_salon.png"; url = 'http://localhost:5173/?mockAdmin=1&section=mesas' },
    @{ file = "$out\03_detalle_comanda.png"; url = 'http://localhost:5173/?mockAdmin=1&section=mesas&modal=table' },
    @{ file = "$out\04_ticket_precuenta.png"; url = 'http://localhost:5173/?mockAdmin=1&section=mesas&modal=ticket' },
    @{ file = "$out\05_pos_ventas.png"; url = 'http://localhost:5173/?mockAdmin=1&section=pos&cart=1' },
    @{ file = "$out\06_inventario.png"; url = 'http://localhost:5173/?mockAdmin=1&section=inventario' },
    @{ file = "$out\07_caja_ventas.png"; url = 'http://localhost:5173/?mockAdmin=1&section=caja' },
    @{ file = "$out\08_cierre_caja.png"; url = 'http://localhost:5173/?mockAdmin=1&section=caja&modal=closing' },
    @{ file = "$out\09_gestion_usuarios.png"; url = 'http://localhost:5173/?mockAdmin=1&modal=users' },
    @{ file = "$out\10_acerca_sistema.png"; url = 'http://localhost:5173/?mockAdmin=1&modal=about' }
)

Write-Host "Iniciando captura de $($shots.Count) pantallas oficiales del sistema..."

foreach ($s in $shots) {
    $f = $s.file
    $u = $s.url
    $fname = [System.IO.Path]::GetFileName($f)
    Write-Host "Capturando $fname..."
    $argScreenshot = "--screenshot=$f"
    Start-Process -FilePath $edge -ArgumentList '--headless=new', $argScreenshot, '--window-size=1440,900', '--virtual-time-budget=2000', $u -Wait
    if (Test-Path $f) {
        $len = (Get-Item $f).Length
        Write-Host "  [OK] $fname ($len bytes)"
    } else {
        Write-Host "  [FAIL] $fname"
    }
}

Write-Host "Capturas finalizadas con exito."
