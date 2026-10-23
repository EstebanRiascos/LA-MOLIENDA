import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const assetsDir = 'd:\\LA-MOLIENDA-main\\manual_assets';
const htmlOutPath = 'd:\\LA-MOLIENDA-main\\MANUAL_DE_USUARIO_LA_MOLIENDA.html';
const pdfOutPath = 'd:\\LA-MOLIENDA-main\\MANUAL_DE_USUARIO_LA_MOLIENDA.pdf';

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Convert image to Base64 Data URI for standalone PDF rendering
function imgToBase64(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const ext = path.extname(filePath).replace('.', '');
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:image/${ext};base64,${data}`;
}

async function run() {
  console.log('--- 1. Launching Edge via Puppeteer-core ---');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

  const captureTasks = [
    { name: '01_login.png', url: 'http://localhost:5173/?login=1&theme=light', waitMs: 1400 },
    { name: '02_mesas_salon.png', url: 'http://localhost:5173/?mockAdmin=1&section=mesas&theme=light', waitMs: 1400 },
    { name: '03_detalle_comanda.png', url: 'http://localhost:5173/?mockAdmin=1&section=mesas&modal=table&theme=light', waitMs: 1400 },
    { name: '04_ticket_precuenta.png', url: 'http://localhost:5173/?mockAdmin=1&section=mesas&modal=ticket&theme=light', waitMs: 1400 },
    { name: '05_pos_ventas.png', url: 'http://localhost:5173/?mockAdmin=1&section=pos&cart=1&theme=light', waitMs: 1500 },
    { name: '06_inventario.png', url: 'http://localhost:5173/?mockAdmin=1&section=inventario&theme=light', waitMs: 1400 },
    { name: '07_caja_ventas.png', url: 'http://localhost:5173/?mockAdmin=1&section=caja&theme=light', waitMs: 1400 },
    { name: '08_cierre_caja.png', url: 'http://localhost:5173/?mockAdmin=1&section=caja&modal=closing&theme=light', waitMs: 1400 },
    { name: '09_gestion_usuarios.png', url: 'http://localhost:5173/?mockAdmin=1&modal=users&theme=light', waitMs: 1400 },
    { name: '10_acerca_sistema.png', url: 'http://localhost:5173/?mockAdmin=1&modal=about&theme=light', waitMs: 1400 },
  ];

  console.log('--- 2. Capturing high-res system screenshots in LIGHT MODE ---');
  for (const t of captureTasks) {
    console.log(`Capturing: ${t.name} (Light Mode)...`);
    await page.goto(t.url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('lamolienda_theme_v1', 'light');
    });
    await wait(t.waitMs);
    const savePath = path.join(assetsDir, t.name);
    await page.screenshot({ path: savePath });
    console.log(`  ✓ Saved light mode: ${t.name}`);
  }

  console.log('--- 3. Assembling HTML Manual with Base64 embedded assets ---');
  const logoBase64 = imgToBase64('d:\\LA-MOLIENDA-main\\src\\assets\\la_molienda_logo.png');
  const shots = {};
  for (const t of captureTasks) {
    shots[t.name] = imgToBase64(path.join(assetsDir, t.name));
  }

  const manualHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Manual de Usuario — La Molienda POS</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    @page {
      size: A4;
      margin: 16mm 18mm 18mm 18mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 8pt;
        color: #7d6550;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      color: #21160d;
      background: #ffffff;
      line-height: 1.55;
      font-size: 9.5pt;
      -webkit-font-smoothing: antialiased;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* COVER PAGE */
    .cover-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      padding: 40px 20px 20px;
    }

    .cover-logo-wrapper {
      width: 110px;
      height: 110px;
      border-radius: 28px;
      padding: 8px;
      background: radial-gradient(circle, #251a11 0%, #0d0a07 100%);
      border: 2px solid #d97706;
      box-shadow: 0 10px 30px rgba(217, 119, 6, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }

    .cover-logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .cover-brand-title {
      font-size: 30pt;
      font-weight: 800;
      color: #1a0f05;
      letter-spacing: -0.03em;
      margin-bottom: 6px;
    }

    .cover-brand-subtitle {
      font-size: 13pt;
      font-weight: 600;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 25px;
    }

    .cover-divider {
      width: 80px;
      height: 3px;
      background: linear-gradient(90deg, #d97706, #b45309);
      margin: 0 auto 30px;
      border-radius: 2px;
    }

    .cover-doc-title {
      font-size: 21pt;
      font-weight: 800;
      color: #21160d;
      margin-bottom: 12px;
      line-height: 1.25;
    }

    .cover-doc-desc {
      font-size: 10pt;
      color: #6b533f;
      max-width: 520px;
      margin: 0 auto 30px;
      line-height: 1.6;
    }

    .cover-meta-card {
      background: #fbf7f2;
      border: 1.5px solid #ebdccb;
      border-radius: 16px;
      padding: 18px 26px;
      width: 100%;
      max-width: 480px;
      margin: 0 auto 20px;
      text-align: left;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 8.5pt;
    }

    .meta-row:last-child {
      margin-bottom: 0;
    }

    .meta-label {
      color: #8c735d;
      font-weight: 600;
    }

    .meta-value {
      color: #21160d;
      font-weight: 700;
    }

    .cover-footer {
      font-size: 8pt;
      color: #8c735d;
      padding-top: 15px;
      border-top: 1px solid #ebdccb;
      width: 100%;
    }

    /* GENERAL CHAPTER STYLING */
    .chapter-header {
      margin-bottom: 18px;
      padding-bottom: 10px;
      border-bottom: 2px solid #ebdccb;
    }

    .chapter-badge {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #b45309;
      background: #fdf5ea;
      border: 1px solid #f1cf9e;
      padding: 3px 9px;
      border-radius: 6px;
      margin-bottom: 6px;
    }

    .chapter-title {
      font-size: 16pt;
      font-weight: 800;
      color: #1a0f05;
      letter-spacing: -0.02em;
    }

    .chapter-lead {
      font-size: 9.5pt;
      color: #5a4433;
      margin-top: 4px;
      line-height: 1.5;
    }

    /* SCREENSHOT DISPLAY */
    .screenshot-figure {
      margin: 16px 0 20px;
      border-radius: 12px;
      overflow: hidden;
      border: 1.5px solid #e0d1c0;
      box-shadow: 0 8px 24px rgba(45, 26, 11, 0.08);
      background: #ffffff;
    }

    .screenshot-img {
      width: 100%;
      height: auto;
      display: block;
    }

    .screenshot-caption {
      background: #fbf7f2;
      padding: 7px 14px;
      font-size: 8pt;
      color: #7d6550;
      font-weight: 600;
      border-top: 1px solid #ebdccb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* FEATURE BLOCKS & LISTS */
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 14px 0 18px;
    }

    .feature-card {
      background: #fdfaf6;
      border: 1px solid #ebdccb;
      border-radius: 10px;
      padding: 10px 14px;
    }

    .feature-card h4 {
      font-size: 9pt;
      font-weight: 750;
      color: #b45309;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .feature-card p {
      font-size: 8.5pt;
      color: #5a4433;
      line-height: 1.45;
    }

    .steps-list {
      list-style: none;
      counter-reset: step-counter;
      margin: 12px 0 16px;
    }

    .steps-list li {
      counter-increment: step-counter;
      position: relative;
      padding-left: 28px;
      margin-bottom: 10px;
      font-size: 9pt;
      color: #3b2a1d;
    }

    .steps-list li::before {
      content: counter(step-counter);
      position: absolute;
      left: 0;
      top: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #d97706;
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .callout-box {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 14px 0;
      font-size: 8.5pt;
      color: #92400e;
      line-height: 1.5;
    }

    .callout-box strong {
      color: #78350f;
    }

    /* TABLE OF CONTENTS */
    .toc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    .toc-table tr {
      border-bottom: 1px dotted #d1bda9;
    }

    .toc-table td {
      padding: 10px 6px;
      font-size: 9.5pt;
    }

    .toc-num {
      font-weight: 800;
      color: #d97706;
      width: 35px;
    }

    .toc-name {
      font-weight: 700;
      color: #21160d;
    }

    .toc-desc {
      font-size: 8pt;
      color: #7d6550;
      display: block;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <!-- ==================== PÁGINA 1: PORTADA EJECUTIVA ==================== -->
  <div class="cover-container page-break">
    <div>
      <div class="cover-logo-wrapper">
        <img src="${logoBase64}" alt="La Molienda" class="cover-logo-img" />
      </div>
      <h1 class="cover-brand-title">La Molienda</h1>
      <h2 class="cover-brand-subtitle">Café & Bar</h2>
      <div class="cover-divider"></div>
      <h3 class="cover-doc-title">MANUAL OFICIAL DE USUARIO</h3>
      <p class="cover-doc-desc">
        Guía integral de operación, flujos de trabajo en sala, punto de venta táctil,
        control de inventario valorizado, arqueos de caja y auditoría financiera.
      </p>
    </div>

    <div class="cover-meta-card">
      <div class="meta-row">
        <span class="meta-label">Sistema:</span>
        <span class="meta-value">La Molienda POS — Suite Gastronómica</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Versión de Software:</span>
        <span class="meta-value">v1.0.0 (Edición de Producción)</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Arquitectura:</span>
        <span class="meta-value">Offline-First • React + Electron Engine</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Ingeniero Desarrollador:</span>
        <span class="meta-value">Juan Esteban Riascos Madarriaga</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Título Profesional:</span>
        <span class="meta-value">Ingeniero de Sistemas</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Fecha de Publicación:</span>
        <span class="meta-value">${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>

    <div class="cover-footer">
      Documento Confidencial de Operación Interna &bull; &copy; ${new Date().getFullYear()} La Molienda Café Bar
    </div>
  </div>

  <!-- ==================== PÁGINA 2: ÍNDICE GENERAL & ARQUITECTURA ==================== -->
  <div class="page-break">
    <div class="chapter-header">
      <span class="chapter-badge">Contenido Oficial</span>
      <h2 class="chapter-title">Tabla de Contenidos</h2>
      <p class="chapter-lead">Estructura temática para el dominio operativo de cada área del sistema.</p>
    </div>

    <table class="toc-table">
      <tr>
        <td class="toc-num">01</td>
        <td>
          <span class="toc-name">Control de Acceso, Autenticación y Seguridad</span>
          <span class="toc-desc">Inicio de turno, credenciales administrativas, teclado PIN para meseros y roles.</span>
        </td>
      </tr>
      <tr>
        <td class="toc-num">02</td>
        <td>
          <span class="toc-name">Módulo 1: Mesas & Cuentas (Gestión de Sala)</span>
          <span class="toc-desc">Monitoreo en vivo de mesas, apertura de comanda, estados libre/ocupada/cuenta y filtros de zona.</span>
        </td>
      </tr>
      <tr>
        <td class="toc-num">03</td>
        <td>
          <span class="toc-name">Gestión de Comandas, Pre-cuenta & Operaciones de Mesa</span>
          <span class="toc-desc">Adición de productos, notas de preparación, división de cuentas (Split Bill) y traslado de mesas.</span>
        </td>
      </tr>
      <tr>
        <td class="toc-num">04</td>
        <td>
          <span class="toc-name">Módulo 2: Punto de Venta (POS Táctil & Barra)</span>
          <span class="toc-desc">Catálogo categorizado, carrito activo, venta para llevar y despacho inmediato.</span>
        </td>
      </tr>
      <tr>
        <td class="toc-num">05</td>
        <td>
          <span class="toc-name">Módulo 3: Gestión de Inventario & Control de Costos</span>
          <span class="toc-desc">Semáforo de existencias, ajuste rápido de unidades, costos de insumo y márgenes de utilidad.</span>
        </td>
      </tr>
      <tr>
        <td class="toc-num">06</td>
        <td>
          <span class="toc-name">Módulo 4: Caja, Arqueo de Turno & Historial de Ventas</span>
          <span class="toc-desc">Registro histórico fiscal, filtro por medio de pago, reimpresión y cuadre de caja ciego.</span>
        </td>
      </tr>
      <tr>
        <td class="toc-num">07</td>
        <td>
          <span class="toc-name">Administración de Usuarios & Ficha del Desarrollador</span>
          <span class="toc-desc">Creación de perfiles, permisos por rol, soporte técnico y créditos de ingeniería.</span>
        </td>
      </tr>
    </table>

    <div class="callout-box">
      <strong>Filosofía Offline-First:</strong> El sistema opera 100% de manera local y autónoma. No depende de conexión externa a internet para cobrar, abrir comandas ni generar tickets térmicos, garantizando cero caídas de servicio durante horas pico de servicio.
    </div>
  </div>

  <!-- ==================== PÁGINA 3: CAPÍTULO 1 - LOGIN ==================== -->
  <div class="page-break">
    <div class="chapter-header">
      <span class="chapter-badge">Capítulo 01</span>
      <h2 class="chapter-title">Control de Acceso, Autenticación y Seguridad</h2>
      <p class="chapter-lead">Mecanismo seguro de identificación para inicio y cambio de turno del personal.</p>
    </div>

    <p>
      El sistema cuenta con un portal de acceso blindado que protege las funciones administrativas y facilita el ingreso ágil para el personal operativo en sala:
    </p>

    <div class="features-grid">
      <div class="feature-card">
        <h4>🔒 Modo Administrador</h4>
        <p>Acceso mediante nombre de usuario y contraseña alfanumérica. Permite configuración completa de precios, usuarios, anulaciones y arqueos.</p>
      </div>
      <div class="feature-card">
        <h4>🔢 Modo PIN Rápido</h4>
        <p>Teclado numérico táctil de 4 dígitos especialmente optimizado para meseros y cajeros, con auto-envío al digitar el cuarto dígito.</p>
      </div>
    </div>

    <div class="screenshot-figure">
      <img src="${shots['01_login.png']}" alt="Pantalla de Login" class="screenshot-img" />
      <div class="screenshot-caption">
        <span>Figura 1: Pantalla principal de inicio de turno y autenticación del sistema POS.</span>
        <span>Módulo de Seguridad</span>
      </div>
    </div>

    <h3 style="font-size: 10pt; font-weight: 750; margin-bottom: 8px;">Paso a Paso para Iniciar Turno:</h3>
    <ol class="steps-list">
      <li>Seleccione el modo deseado: <strong>Administrador</strong> o <strong>PIN Rápido</strong>.</li>
      <li>Para meseros, ingrese su PIN personal de 4 dígitos utilizando el teclado táctil o el teclado físico de la terminal.</li>
      <li>Al validarse, el sistema cargará automáticamente el panel de control correspondiente a los permisos de su rol.</li>
    </ol>
  </div>

  <!-- ==================== PÁGINA 4: CAPÍTULO 2 - MESAS & CUENTAS ==================== -->
  <div class="page-break">
    <div class="chapter-header">
      <span class="chapter-badge">Capítulo 02</span>
      <h2 class="chapter-title">Módulo 1: Mesas & Cuentas (Control de Sala)</h2>
      <p class="chapter-lead">Supervisión en tiempo real del plano gastronómico, estados de ocupación y pedidos activos.</p>
    </div>

    <p>
      La vista de <strong>Mesas & Cuentas</strong> es el núcleo operativo de atención en sala. Ofrece un semáforo visual inmediato para identificar mesas disponibles, consumos en curso y cuentas por cobrar:
    </p>

    <div class="screenshot-figure">
      <img src="${shots['02_mesas_salon.png']}" alt="Mapa de Mesas" class="screenshot-img" />
      <div class="screenshot-caption">
        <span>Figura 2: Plano visual de mesas con tarjetas de estado, KPIs superiores y selector de zonas.</span>
        <span>Salón Principal &bull; Mesas</span>
      </div>
    </div>

    <div class="features-grid">
      <div class="feature-card">
        <h4>🟢 Mesa Libre</h4>
        <p>Lista para recibir comensales. Al pulsar sobre ella se abre el asistente para seleccionar el mesero a cargo y la cantidad de comensales.</p>
      </div>
      <div class="feature-card">
        <h4>🟠 Mesa Ocupada</h4>
        <p>Muestra el tiempo de estadía, mesero responsable, número de artículos pedidos y el subtotal acumulado hasta el momento.</p>
      </div>
      <div class="feature-card">
        <h4>🔵 Cuenta Pedida (Pre-cuenta)</h4>
        <p>Indica que el cliente ha solicitado la cuenta. Los meseros y cajeros saben que está lista para el proceso de facturación y pago.</p>
      </div>
      <div class="feature-card">
        <h4>📍 Filtro por Zonas</h4>
        <p>Navegue instantáneamente entre <em>Salón Principal</em>, <em>Terraza Exterior</em> y <em>Barra VIP</em> para gestionar cada ambiente.</p>
      </div>
    </div>
  </div>

  <!-- ==================== PÁGINA 5: CAPÍTULO 3 - COMANDAS Y PRECUENTA ==================== -->
  <div class="page-break">
    <div class="chapter-header">
      <span class="chapter-badge">Capítulo 03</span>
      <h2 class="chapter-title">Comanda de Mesa, Pre-cuenta & Cobro</h2>
      <p class="chapter-lead">Gestión detallada de artículos, adición rápida, separación de cuentas e impresión térmica.</p>
    </div>

    <p>
      Al hacer clic en cualquier mesa ocupada, se despliega el <strong>Cajón Lateral de Comanda</strong> con el desglose exacto de los consumos y las herramientas de servicio:
    </p>

    <div class="screenshot-figure">
      <img src="${shots['03_detalle_comanda.png']}" alt="Detalle de Comanda" class="screenshot-img" />
      <div class="screenshot-caption">
        <span>Figura 3: Panel lateral de comanda activa con opciones de Pre-cuenta, División, Traslado y Cobro.</span>
        <span>Detalle de Mesa</span>
      </div>
    </div>

    <div class="screenshot-figure" style="max-width: 580px; margin: 0 auto 16px;">
      <img src="${shots['04_ticket_precuenta.png']}" alt="Ticket de Precuenta" class="screenshot-img" />
      <div class="screenshot-caption">
        <span>Figura 4: Pre-cuenta térmica oficial de 80mm con desglose de propina voluntaria y código de control.</span>
        <span>Recibo Térmico</span>
      </div>
    </div>

    <h3 style="font-size: 10pt; font-weight: 750; margin-bottom: 6px;">Acciones Operativas Disponibles:</h3>
    <ul style="padding-left: 20px; font-size: 8.5pt; color: #5a4433; line-height: 1.6;">
      <li><strong>Imprimir Pre-cuenta:</strong> Emite el ticket de control previo al cobro sin cerrar la mesa en el sistema.</li>
      <li><strong>Dividir Cuenta (Split Bill):</strong> Permite separar artículos para grupos que desean pagar individualmente.</li>
      <li><strong>Trasladar Mesa:</strong> Mueve la cuenta activa a otra mesa disponible en caso de reubicación de clientes.</li>
      <li><strong>Cobrar Mesa:</strong> Conduce a la pasarela de cierre seleccionando Efectivo, Tarjeta, Transferencia o Mixto.</li>
    </ul>
  </div>

  <!-- ==================== PÁGINA 6: CAPÍTULO 4 - PUNTO DE VENTA (POS) ==================== -->
  <div class="page-break">
    <div class="chapter-header">
      <span class="chapter-badge">Capítulo 04</span>
      <h2 class="chapter-title">Módulo 2: Punto de Venta (POS Táctil & Barra)</h2>
      <p class="chapter-lead">Terminal de alta velocidad para venta directa, despacho en barra y pedidos para llevar.</p>
    </div>

    <p>
      El módulo de <strong>Punto de Venta (POS)</strong> está diseñado para brindar la máxima rapidez de pedido. Es ideal para atención en barra, despachos express de café y ventas sin asignación de mesa:
    </p>

    <div class="screenshot-figure">
      <img src="${shots['05_pos_ventas.png']}" alt="Punto de Venta POS" class="screenshot-img" />
      <div class="screenshot-caption">
        <span>Figura 5: Terminal POS táctil con catálogo de productos por categorías y carrito activo en barra lateral.</span>
        <span>POS &bull; Venta Rápida</span>
      </div>
    </div>

    <div class="features-grid">
      <div class="feature-card">
        <h4>☕ Filtro por Categorías</h4>
        <p>Navegue ágilmente entre Café de Especialidad, Coctelería de Autor, Cervezas Artesanales, Licores, Platos y Snacks.</p>
      </div>
      <div class="feature-card">
        <h4>🛒 Comanda Activa & Notas</h4>
        <p>Controle cantidades con botones táctiles (+ / -) y añada especificaciones de preparación (ej: "sin azúcar", "leche de almendras").</p>
      </div>
      <div class="feature-card">
        <h4>💵 Propina Sugerida Dinámica</h4>
        <p>Botones de acceso rápido para calcular el 0%, 10% o 15% de propina de forma transparente y legal.</p>
      </div>
      <div class="feature-card">
        <h4>⚡ Cobro Directo en 1 Clic</h4>
        <p>Cierre la venta al instante recibiendo efectivo con cálculo automático de vueltos/cambio o registro de voucher electrónico.</p>
      </div>
    </div>
  </div>

  <!-- ==================== PÁGINA 7: CAPÍTULO 5 - INVENTARIO & PRECIOS ==================== -->
  <div class="page-break">
    <div class="chapter-header">
      <span class="chapter-badge">Capítulo 05</span>
      <h2 class="chapter-title">Módulo 3: Gestión de Inventario & Costos</h2>
      <p class="chapter-lead">Control de existencias en tiempo real, semáforos de reposición y márgenes de utilidad comercial.</p>
    </div>

    <p>
      El inventario de La Molienda está <strong>sincronizado en tiempo real</strong> con las comandas abiertas y las ventas en barra. Cuando un producto se ordena en una mesa, el sistema descuenta automáticamente la unidad disponible:
    </p>

    <div class="screenshot-figure">
      <img src="${shots['06_modulo_inventario_precios.png']}" alt="Inventario de Productos" class="screenshot-img" />
      <div class="screenshot-caption">
        <span>Figura 6: Tabla maestra de inventario con semáforo de existencias, ajuste de stock y rentabilidad.</span>
        <span>Inventario &bull; Auditoría</span>
      </div>
    </div>

    <div class="features-grid">
      <div class="feature-card">
        <h4>🚦 Semáforo de Existencias</h4>
        <p><strong>Verde:</strong> Nivel óptimo. <strong>Ámbar:</strong> Stock cercano al umbral de alerta. <strong>Rojo:</strong> Stock crítico (urgente compra).</p>
      </div>
      <div class="feature-card">
        <h4>📈 Margen de Utilidad en Vivo</h4>
        <p>Calcula el porcentaje exacto de ganancia comparando el precio de venta al público frente al costo de insumos cargado.</p>
      </div>
      <div class="feature-card">
        <h4>✏️ Edición Rápida de Precios</h4>
        <p>Los administradores pueden actualizar precios y costos en cuestión de segundos sin navegar por formularios complejos.</p>
      </div>
      <div class="feature-card">
        <h4>📦 Ajuste Rápido de Stock (+ / -)</h4>
        <p>Permite ingresar compras del día o registrar mermas operativas con un solo clic sobre la fila del producto.</p>
      </div>
    </div>
  </div>

  <!-- ==================== PÁGINA 8: CAPÍTULO 6 - CAJA Y ARQUEO ==================== -->
  <div class="page-break">
    <div class="chapter-header">
      <span class="chapter-badge">Capítulo 06</span>
      <h2 class="chapter-title">Módulo 4: Caja, Arqueo de Turno & Ventas</h2>
      <p class="chapter-lead">Auditoría de facturación, consolidado de medios de pago y cierre ciego de turno.</p>
    </div>

    <p>
      El módulo de <strong>Caja & Ventas</strong> recopila el historial fiscal de todas las transacciones realizadas durante el turno, permitiendo filtrar por medio de pago (Efectivo, Tarjeta, Nequi/Daviplata):
    </p>

    <div class="screenshot-figure">
      <img src="${shots['07_caja_ventas.png']}" alt="Historial de Ventas" class="screenshot-img" />
      <div class="screenshot-caption">
        <span>Figura 7: Historial cronológico de ventas con desglose de subtotales, propinas y medios de pago.</span>
        <span>Caja &bull; Ventas Oficiales</span>
      </div>
    </div>

    <div class="screenshot-figure" style="max-width: 580px; margin: 0 auto 16px;">
      <img src="${shots['08_cierre_caja.png']}" alt="Arqueo de Turno" class="screenshot-img" />
      <div class="screenshot-caption">
        <span>Figura 8: Modal de arqueo ciego y cuadre de caja con contador de denominaciones de billetes y monedas.</span>
        <span>Cierre de Turno</span>
      </div>
    </div>

    <div class="callout-box">
      <strong>Procedimiento de Cierre Ciego:</strong> Al finalizar la jornada, el cajero realiza el conteo físico del efectivo sin ver el total teórico del sistema. El software calcula automáticamente el sobrante o faltante de caja para garantizar transparencia contable.
    </div>
  </div>

  <!-- ==================== PÁGINA 9: CAPÍTULO 7 - USUARIOS Y FICHA TÉCNICA ==================== -->
  <div class="page-break">
    <div class="chapter-header">
      <span class="chapter-badge">Capítulo 07</span>
      <h2 class="chapter-title">Administración de Usuarios & Ficha Técnica</h2>
      <p class="chapter-lead">Gestión de personal, asignación de permisos multi-rol y autoría oficial del software.</p>
    </div>

    <p>
      La administración de usuarios permite crear perfiles específicos para cada integrante del equipo, protegiendo las áreas críticas del negocio según sus responsabilidades:
    </p>

    <div class="screenshot-figure">
      <img src="${shots['09_gestion_usuarios_seguridad.png']}" alt="Gestión de Usuarios" class="screenshot-img" />
      <div class="screenshot-caption">
        <span>Figura 9: Panel de administración de cuentas, cambio de contraseña, roles y PIN rápido.</span>
        <span>Seguridad &bull; Usuarios</span>
      </div>
    </div>

    <div class="screenshot-figure" style="max-width: 540px; margin: 0 auto 20px;">
      <img src="${shots['10_acerca_sistema.png']}" alt="Acerca del Sistema" class="screenshot-img" />
      <div class="screenshot-caption">
        <span>Figura 10: Ficha técnica del sistema y créditos oficiales de desarrollo de software.</span>
        <span>Autoría del Sistema</span>
      </div>
    </div>

    <div class="cover-meta-card" style="margin-top: 15px;">
      <h4 style="color: #b45309; font-size: 9.5pt; font-weight: 750; margin-bottom: 8px;">
        Ficha Técnica de Autoría y Soporte:
      </h4>
      <p style="font-size: 8.5pt; color: #5a4433; line-height: 1.5; margin-bottom: 8px;">
        El sistema <strong>La Molienda POS</strong> fue diseñado, programado y estructurado a medida para las necesidades comerciales y operativas del establecimiento por:
      </p>
      <div class="meta-row">
        <span class="meta-label">Desarrollador:</span>
        <span class="meta-value">Juan Esteban Riascos Madarriaga</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Título:</span>
        <span class="meta-value">Ingeniero de Sistemas</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Especialidad:</span>
        <span class="meta-value">Arquitectura de Software Full-Stack & Soluciones Gastronómicas</span>
      </div>
    </div>
  </div>

</body>
</html>
`;

  fs.writeFileSync(htmlOutPath, manualHtml, 'utf8');
  console.log(`Saved HTML Manual: ${htmlOutPath}`);

  console.log('--- 4. Rendering publication-quality PDF via Puppeteer Page.pdf() ---');
  const fileUrl = 'file:///' + htmlOutPath.replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await wait(1500);

  await page.pdf({
    path: pdfOutPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '16mm',
      right: '16mm',
      bottom: '16mm',
      left: '16mm',
    },
  });

  const pdfStats = fs.statSync(pdfOutPath);
  console.log(`PDF successfully generated: ${pdfOutPath} (${(pdfStats.size / 1024 / 1024).toFixed(2)} MB)`);

  await browser.close();
  console.log('--- Process completed successfully! ---');
}

run().catch((err) => {
  console.error('Fatal error in manual generation:', err);
  process.exit(1);
});
