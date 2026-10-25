import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { BrowserWindow } from 'electron';

export interface ServerState {
  tables: any[];
  products: any[];
  staffList: string[];
  systemUsers?: any[];
  updatedAt: string;
}

const DEFAULT_SERVER_TABLES = [
  { id: 'tbl-salon-1', number: 'Mesa 01', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-salon-2', number: 'Mesa 02', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-salon-3', number: 'Mesa 03', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-salon-4', number: 'Mesa 04', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-salon-5', number: 'Mesa 05', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-salon-6', number: 'Mesa 06', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-salon-7', number: 'Mesa 07', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-salon-8', number: 'Mesa 08', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-salon-9', number: 'Mesa 09', zone: 'salon', capacity: 4, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-salon-10', number: 'Mesa 10 (Lounge)', zone: 'salon', capacity: 6, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-barra-1', number: 'Barra Cerveza', zone: 'barra', capacity: 5, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-barra-2', number: 'Barra Vinos & Café', zone: 'barra', capacity: 5, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
  { id: 'tbl-barra-3', number: 'Barra Cocineta', zone: 'barra', capacity: 3, status: 'libre', items: [], subtotal: 0, tipPercentage: 0, tipAmount: 0, total: 0 },
];

let server: http.Server | null = null;
let sseClients: http.ServerResponse[] = [];
let heartbeatInterval: NodeJS.Timeout | null = null;
let currentState: ServerState = {
  tables: DEFAULT_SERVER_TABLES,
  products: [],
  staffList: ['Administrador', 'Mesero 1', 'Mesero 2'],
  updatedAt: new Date().toISOString(),
};

/**
 * Obtiene la dirección IP local v4 de la máquina en la red Wi-Fi o Ethernet
 */
export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const devName of Object.keys(interfaces)) {
    const iface = interfaces[devName];
    if (!iface) continue;
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal && alias.address !== '127.0.0.1') {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * Mapeo de extensiones para servir la app web estática en producción
 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

/**
 * Emite un evento Server-Sent Events (SSE) a todos los celulares conectados
 */
export function broadcastToMobileClients(event: string, data: any): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      // Ignorar clientes que cerraron la conexión bruscamente
    }
  });
}

/**
 * Actualiza el estado en memoria guardado desde el PC del cajero
 */
export function updateServerState(partial: Partial<ServerState>): void {
  currentState = {
    ...currentState,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  broadcastToMobileClients('state-update', currentState);
}

export function getCurrentState(): ServerState {
  return currentState;
}

export function getConnectedClientsCount(): number {
  return sseClients.length;
}

/**
 * Inicia el servidor HTTP local para comandero móvil
 */
export function startLocalServer(win: BrowserWindow | null, port: number = 4545): Promise<{ port: number; ip: string; url: string }> {
  return new Promise((resolve, reject) => {
    if (server) {
      const ip = getLocalIpAddress();
      resolve({ port, ip, url: `http://${ip}:${port}` });
      return;
    }

    server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;

      // Habilitar CORS para permitir llamadas tanto desde localhost como desde la IP Wi-Fi
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // 1. ENDPOINT: Información del servidor local
      if (pathname === '/api/info' && req.method === 'GET') {
        const ip = getLocalIpAddress();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'online',
            localIp: ip,
            port,
            url: `http://${ip}:${port}`,
            connectedClients: sseClients.length,
            updatedAt: currentState.updatedAt,
          })
        );
        return;
      }

      // 2. ENDPOINT: Obtener estado inicial (Mesas, Productos, Personal)
      if (pathname === '/api/state' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: currentState }));
        return;
      }

      // 2.1 ENDPOINT: Sincronizar estado completo desde el PC (mesas, productos, personal)
      if (pathname === '/api/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const syncData = JSON.parse(body);
            updateServerState(syncData);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, clients: sseClients.length }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }

      // 3. ENDPOINT: Server-Sent Events (SSE) para sincronización en tiempo real
      if (pathname === '/api/stream' && req.method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'X-Accel-Buffering': 'no',
        });

        // Configurar reintento rápido en el cliente móvil si se desconecta
        res.write('retry: 2500\n\n');
        res.write(`event: init\ndata: ${JSON.stringify(currentState)}\n\n`);
        sseClients.push(res);

        // Notificar al PC que un celular se conectó
        if (win && !win.isDestroyed()) {
          win.webContents.send('server:clients-changed', sseClients.length);
        }

        req.on('close', () => {
          sseClients = sseClients.filter((c) => c !== res);
          if (win && !win.isDestroyed()) {
            win.webContents.send('server:clients-changed', sseClients.length);
          }
        });
        return;
      }

      // 4. ENDPOINT: Recibir comanda enviada desde un celular
      if (pathname === '/api/order' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const orderData = JSON.parse(body);
            if (!orderData.tableId || !orderData.items || !Array.isArray(orderData.items)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Datos de comanda incompletos' }));
              return;
            }

            // Actualizar el estado en memoria de la mesa en el servidor
            if (currentState.tables && Array.isArray(currentState.tables)) {
              const targetIdx = currentState.tables.findIndex(
                (t: any) =>
                  t.id === orderData.tableId ||
                  (t.number && orderData.tableId && t.number.toLowerCase() === orderData.tableId.toLowerCase()) ||
                  (orderData.tableName && t.number && t.number.toLowerCase() === orderData.tableName.toLowerCase())
              );
              if (targetIdx >= 0) {
                const target = currentState.tables[targetIdx];
                let merged = [...(target.items || [])];
                orderData.items.forEach((newItem: any) => {
                  const existIdx = merged.findIndex(
                    (i: any) => i.productId === newItem.productId && (i.notes || '') === (newItem.notes || '')
                  );
                  if (existIdx >= 0) {
                    merged[existIdx] = {
                      ...merged[existIdx],
                      quantity: merged[existIdx].quantity + newItem.quantity,
                    };
                  } else {
                    merged.push({
                      ...newItem,
                      id: newItem.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                      status: newItem.status || 'pending',
                    });
                  }
                });

                const subtotal = merged.reduce((acc: number, i: any) => acc + (i.unitPrice || 0) * (i.quantity || 1), 0);
                const tipAmount = target.tipPercentage ? Math.round((subtotal * target.tipPercentage) / 100) : 0;
                const total = subtotal + tipAmount;

                currentState.tables[targetIdx] = {
                  ...target,
                  status: 'ocupada',
                  openedAt: target.openedAt || new Date().toISOString(),
                  waiter: orderData.waiter || target.waiter || 'Mesero',
                  items: merged,
                  subtotal,
                  tipAmount,
                  total,
                };
                currentState.updatedAt = new Date().toISOString();
              }
            }

            // Enviar orden al proceso de renderizado (Pantalla del Cajero en PC vía IPC)
            if (win && !win.isDestroyed()) {
              win.webContents.send('mobile:new-order', orderData);
            }

            // Notificar a todos los dispositivos (móviles y PC conectados) con el estado actualizado
            broadcastToMobileClients('state-update', currentState);
            broadcastToMobileClients('new-order-broadcast', {
              ...orderData,
              timestamp: new Date().toISOString(),
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                message: 'Comanda recibida en PC y enviada a cocina/barra',
              })
            );
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }

      // 5. ENDPOINT: Abrir mesa desde el celular
      if (pathname === '/api/table/open' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (currentState.tables && Array.isArray(currentState.tables)) {
              const targetIdx = currentState.tables.findIndex((t: any) => t.id === data.tableId);
              if (targetIdx >= 0) {
                const target = currentState.tables[targetIdx];
                currentState.tables[targetIdx] = {
                  ...target,
                  status: 'ocupada',
                  openedAt: new Date().toISOString(),
                  patronName: data.patronName || 'Cliente',
                  waiter: data.waiter || 'Mesero',
                  capacity: data.diners || target.capacity,
                  items: [],
                  subtotal: 0,
                  tipAmount: 0,
                  total: 0,
                };
                currentState.updatedAt = new Date().toISOString();
                broadcastToMobileClients('state-update', currentState);
              }
            }
            if (win && !win.isDestroyed()) {
              win.webContents.send('mobile:open-table', data);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }

      // 6. ENDPOINT: Pedir cuenta / Precuenta desde el celular
      if (pathname === '/api/table/request-bill' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (currentState.tables && Array.isArray(currentState.tables)) {
              const targetIdx = currentState.tables.findIndex((t: any) => t.id === data.tableId);
              if (targetIdx >= 0 && currentState.tables[targetIdx].items.length > 0) {
                currentState.tables[targetIdx].status = 'por_cobrar';
                currentState.updatedAt = new Date().toISOString();
                broadcastToMobileClients('state-update', currentState);
              }
            }
            if (win && !win.isDestroyed()) {
              win.webContents.send('mobile:request-bill', data);
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }

      // 7. SERVIR ARCHIVOS ESTÁTICOS DE LA APLICACIÓN WEB
      // En producción busca en dist/; en dev redirige a Vite dev server o busca en dist/
      const distDir = path.join(__dirname, '../dist');
      let sanitizedPath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
      if (sanitizedPath === '/' || sanitizedPath === '\\') {
        sanitizedPath = 'index.html';
      }

      let filePath = path.join(distDir, sanitizedPath);

      // Si el archivo solicitado no existe, servir index.html (SPA routing)
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        return;
      }

      // Si no existe build en dist/ (modo desarrollo inicial), mensaje informativo
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>La Molienda POS - Servidor Activo</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #0e0b08; color: #fdfaf7; text-align: center; padding: 2rem; }
              .card { background: #1a140f; border: 1px solid #d97706; border-radius: 12px; padding: 2rem; max-width: 480px; margin: 0 auto; }
              h1 { color: #d97706; margin-bottom: 0.5rem; font-size: 1.5rem; }
              p { color: #a39282; line-height: 1.5; font-size: 0.95rem; }
              .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; padding: 0.35rem 0.85rem; border-radius: 999px; font-weight: bold; margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">● Servidor Local Wi-Fi Online</div>
              <h1>La Molienda - Comandero</h1>
              <p>El servidor local está activo en el puerto <strong>${port}</strong>.</p>
              <p>Los celulares de los meseros se sincronizan en tiempo real con la caja.</p>
            </div>
          </body>
        </html>
      `);
    });

    server.listen(port, '0.0.0.0', () => {
      const ip = getLocalIpAddress();
      console.log(`[La Molienda Server] Servidor local Wi-Fi activo en: http://${ip}:${port}`);

      // Mantener viva la conexión SSE con ping periódico (evita que Safari en iOS corte la conexión)
      if (!heartbeatInterval) {
        heartbeatInterval = setInterval(() => {
          sseClients.forEach((client) => {
            try {
              client.write(': keep-alive\n\n');
            } catch {}
          });
        }, 12000);
      }

      resolve({ port, ip, url: `http://${ip}:${port}` });
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[La Molienda Server] Puerto ${port} en uso, intentando con ${port + 1}...`);
        startLocalServer(win, port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

export function stopLocalServer(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (server) {
    server.close();
    server = null;
  }
  sseClients = [];
}
