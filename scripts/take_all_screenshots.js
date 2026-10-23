import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outDir = 'd:\\LA-MOLIENDA-main\\manual_assets';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const shots = [
  { file: '01_login.png', url: 'http://localhost:5173/?login=1' },
  { file: '02_mesas_salon.png', url: 'http://localhost:5173/?mockAdmin=1&section=mesas' },
  { file: '03_detalle_comanda.png', url: 'http://localhost:5173/?mockAdmin=1&section=mesas&modal=table' },
  { file: '04_ticket_precuenta.png', url: 'http://localhost:5173/?mockAdmin=1&section=mesas&modal=ticket' },
  { file: '05_pos_ventas.png', url: 'http://localhost:5173/?mockAdmin=1&section=pos&cart=1' },
  { file: '06_inventario.png', url: 'http://localhost:5173/?mockAdmin=1&section=inventario' },
  { file: '07_caja_ventas.png', url: 'http://localhost:5173/?mockAdmin=1&section=caja' },
  { file: '08_cierre_caja.png', url: 'http://localhost:5173/?mockAdmin=1&section=caja&modal=closing' },
  { file: '09_gestion_usuarios.png', url: 'http://localhost:5173/?mockAdmin=1&modal=users' },
  { file: '10_acerca_sistema.png', url: 'http://localhost:5173/?mockAdmin=1&modal=about' },
];

console.log(`Starting automated capture of ${shots.length} module screenshots...`);

for (let i = 0; i < shots.length; i++) {
  const item = shots[i];
  const targetFile = path.join(outDir, item.file);
  console.log(`[${i + 1}/${shots.length}] Capturing ${item.file}...`);
  const cmd = `"${edgePath}" --headless=new --screenshot="${targetFile}" --window-size=1440,900 --virtual-time-budget=2000 "${item.url}"`;
  try {
    execSync(cmd, { stdio: 'ignore' });
    if (fs.existsSync(targetFile)) {
      const size = (fs.statSync(targetFile).size / 1024).toFixed(1);
      console.log(`  ✓ OK: ${item.file} (${size} KB)`);
    } else {
      console.warn(`  ✗ Failed: ${item.file} not found`);
    }
  } catch (err) {
    console.error(`  ✗ Error capturing ${item.file}:`, err.message);
  }
}

console.log('Capture process finished successfully.');
