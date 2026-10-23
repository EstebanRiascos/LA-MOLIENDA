import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = 'd:\\LA-MOLIENDA-main\\.edge_manual_profile';
const outputDir = 'd:\\LA-MOLIENDA-main\\manual_assets';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) {
            rej(new Error(data.error.message));
          } else {
            res(data.result);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = ++this.msgId;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return res.result?.value;
  }

  async captureScreenshot(filename) {
    const res = await this.send('Page.captureScreenshot', {
      format: 'png',
    });
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`Saved screenshot: ${filename} (${(res.data.length / 1024).toFixed(1)} KB)`);
  }
}

async function run() {
  console.log('Launching headless Edge for manual screenshot captures...');
  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,900',
    'http://localhost:5173',
  ]);

  try {
    await wait(2500);
    const targets = await httpGetJson('http://127.0.0.1:9222/json/list');
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1.5,
      mobile: false,
    });

    console.log('Page loaded. Waiting for UI initialization...');
    await wait(1800);

    // 1. CAPTURA 1: Pantalla de Login
    console.log('Capturing Screenshot 1: Login');
    await client.captureScreenshot('01_pantalla_login.png');

    // Iniciar Sesión como Admin
    console.log('Submitting login credentials...');
    await client.eval(`
      (() => {
        const passInput = document.querySelector('input[type="password"]');
        if (passInput) {
          passInput.value = 'admin';
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    await wait(1500);

    // 2. CAPTURA 2: Mesas & Cuentas (Salón Principal)
    console.log('Capturing Screenshot 2: Mesas');
    await client.captureScreenshot('02_modulo_mesas_salon.png');

    // 3. CAPTURA 3: Detalle de Comanda / Mesa Abierta
    console.log('Opening active table detail modal...');
    await client.eval(`
      (() => {
        // Click on Mesa 2 or first occupied table card
        const occupiedCard = Array.from(document.querySelectorAll('.table-card')).find(c => !c.classList.contains('status-libre'));
        if (occupiedCard) {
          occupiedCard.click();
        } else {
          const firstCard = document.querySelector('.table-card');
          if (firstCard) firstCard.click();
        }
      })()
    `);
    await wait(800);
    console.log('Capturing Screenshot 3: Detalle de Comanda de Mesa');
    await client.captureScreenshot('03_comanda_mesa_detalle.png');

    // 4. CAPTURA 4: Pre-cuenta / Ticket Térmico
    console.log('Opening Pre-cuenta Ticket modal...');
    await client.eval(`
      (() => {
        const preBillBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Pre-cuenta'));
        if (preBillBtn) preBillBtn.click();
      })()
    `);
    await wait(800);
    console.log('Capturing Screenshot 4: Ticket Precuenta Térmica');
    await client.captureScreenshot('04_ticket_termico_precuenta.png');

    // Cerrar ticket y drawer
    await client.eval(`
      (() => {
        const closeBtns = Array.from(document.querySelectorAll('.btn-modal-cancel, .btn-drawer-close, .modal-close-btn, button[title*="Cerrar"]'));
        closeBtns.forEach(b => b.click());
      })()
    `);
    await wait(600);

    // 5. CAPTURA 5: Punto de Venta (POS)
    console.log('Navigating to Punto de Venta (POS)...');
    await client.eval(`
      (() => {
        const posTab = Array.from(document.querySelectorAll('.nav-pill')).find(p => p.textContent.includes('POS'));
        if (posTab) posTab.click();
      })()
    `);
    await wait(1000);

    // Agregar un producto al carrito para mostrar comanda activa
    await client.eval(`
      (() => {
        const firstProductCard = document.querySelector('.pos-product-card');
        if (firstProductCard) firstProductCard.click();
        const secondProductCard = document.querySelectorAll('.pos-product-card')[1];
        if (secondProductCard) secondProductCard.click();
      })()
    `);
    await wait(600);
    console.log('Capturing Screenshot 5: POS Visual y Carrito');
    await client.captureScreenshot('05_modulo_pos_punto_venta.png');

    // 6. CAPTURA 6: Gestión de Inventario & Precios
    console.log('Navigating to Inventario & Precios...');
    await client.eval(`
      (() => {
        const invTab = Array.from(document.querySelectorAll('.nav-pill')).find(p => p.textContent.includes('Inventario'));
        if (invTab) invTab.click();
      })()
    `);
    await wait(1000);
    console.log('Capturing Screenshot 6: Inventario y Precios');
    await client.captureScreenshot('06_modulo_inventario_precios.png');

    // 7. CAPTURA 7: Caja, Arqueos & Historial de Ventas
    console.log('Navigating to Caja & Ventas...');
    await client.eval(`
      (() => {
        const cajaTab = Array.from(document.querySelectorAll('.nav-pill')).find(p => p.textContent.includes('Caja'));
        if (cajaTab) cajaTab.click();
      })()
    `);
    await wait(1000);
    console.log('Capturing Screenshot 7: Historial de Ventas y Caja');
    await client.captureScreenshot('07_modulo_caja_ventas.png');

    // 8. CAPTURA 8: Modal de Arqueo y Cierre Ciego de Turno
    console.log('Opening Cash Closing modal...');
    await client.eval(`
      (() => {
        const closeShiftBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cierre de Turno') || b.textContent.includes('Arqueo'));
        if (closeShiftBtn) closeShiftBtn.click();
      })()
    `);
    await wait(800);
    console.log('Capturing Screenshot 8: Arqueo y Cierre de Caja');
    await client.captureScreenshot('08_arqueo_cierre_caja.png');

    // Cerrar modal de arqueo
    await client.eval(`
      (() => {
        const cancelBtn = document.querySelector('.btn-modal-cancel, button[title*="Cerrar"]');
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await wait(600);

    // 9. CAPTURA 9: Gestión de Usuarios y Permisos
    console.log('Opening User Management modal...');
    await client.eval(`
      (() => {
        const usersBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Usuarios') || b.title?.includes('Usuarios'));
        if (usersBtn) usersBtn.click();
      })()
    `);
    await wait(800);
    console.log('Capturing Screenshot 9: Gestión de Usuarios');
    await client.captureScreenshot('09_gestion_usuarios_seguridad.png');

    // Cerrar modal de usuarios
    await client.eval(`
      (() => {
        const closeBtn = document.querySelector('.user-modal-close, button[title*="Cerrar"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await wait(600);

    // 10. CAPTURA 10: Acerca del Sistema / Ficha Técnica del Desarrollador
    console.log('Opening About Modal from footer...');
    await client.eval(`
      (() => {
        const aboutBtn = document.querySelector('.footer-info-btn');
        if (aboutBtn) aboutBtn.click();
      })()
    `);
    await wait(800);
    console.log('Capturing Screenshot 10: Acerca del Sistema & Desarrollador');
    await client.captureScreenshot('10_acerca_del_sistema.png');

    console.log('All 10 screenshots successfully captured!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    proc.kill();
  }
}

run();
