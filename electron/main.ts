import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
let isQuitConfirmed = false;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: 'La Molienda - Café & Bar | POS & Control de Inventario',
    backgroundColor: '#0e0b08',
    icon: path.join(__dirname, '../build/icon.ico'),
    show: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
    },
  });

  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer Console ${level}] ${message} (${sourceId}:${line})`);
  });

  win.once('ready-to-show', () => {
    win?.show();
  });

  // Interceptar el cierre (botón X) para pedir confirmación en la interfaz
  win.on('close', (event) => {
    if (isQuitConfirmed) return;
    event.preventDefault();
    win?.webContents.send('app:close-requested');
  });

  win.on('closed', () => {
    win = null;
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const distPath = process.env.DIST || path.join(__dirname, '../dist');
    win.loadFile(path.join(distPath, 'index.html'));
  }
}

import {
  startLocalServer,
  stopLocalServer,
  updateServerState,
  getLocalIpAddress,
  getAvailableNetworkInterfaces,
  getConnectedClientsCount,
} from './server';

let serverInfo = { port: 4545, ip: '127.0.0.1', url: 'http://127.0.0.1:4545' };

app.on('window-all-closed', () => {
  stopLocalServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  // El usuario confirmó el cierre desde la ventana de confirmación
  ipcMain.on('app:confirm-close', () => {
    isQuitConfirmed = true;
    app.quit();
  });

  // SERVIDOR LOCAL WI-FI PARA CELULARES DE MESEROS
  ipcMain.handle('server:getInfo', () => {
    const ip = getLocalIpAddress();
    const availableInterfaces = getAvailableNetworkInterfaces();
    return {
      ip,
      port: serverInfo.port || 4545,
      url: `http://${ip}:${serverInfo.port || 4545}`,
      clientsCount: getConnectedClientsCount(),
      availableInterfaces,
    };
  });

  ipcMain.on('server:broadcastState', (_event, state) => {
    updateServerState(state);
  });

  // Abrir carpeta del archivo APK para compartir por WhatsApp
  ipcMain.handle('apk:openFolder', async () => {
    const candidatePaths = [
      path.join(process.cwd(), 'release', 'LaMolienda_Comandero.apk'),
      path.join(__dirname, '../../release/LaMolienda_Comandero.apk'),
      path.join(__dirname, '../release/LaMolienda_Comandero.apk'),
      path.join(process.cwd(), 'release'),
    ];
    for (const p of candidatePaths) {
      try {
        await fs.access(p);
        shell.showItemInFolder(p);
        return { success: true };
      } catch {}
    }
    shell.openPath(path.join(process.cwd(), 'release'));
    return { success: true };
  });

  // Copiar archivo APK al portapapeles de Windows para pegar en WhatsApp con Ctrl + V
  ipcMain.handle('apk:copyToClipboard', async () => {
    const candidatePaths = [
      path.join(process.cwd(), 'release', 'LaMolienda_Comandero.apk'),
      path.join(__dirname, '../../release/LaMolienda_Comandero.apk'),
      path.join(__dirname, '../release/LaMolienda_Comandero.apk'),
    ];
    let foundPath = '';
    for (const p of candidatePaths) {
      try {
        await fs.access(p);
        foundPath = p;
        break;
      } catch {}
    }
    if (!foundPath) {
      return { success: false, error: 'Archivo APK no encontrado en carpeta release' };
    }

    return new Promise((resolve) => {
      exec(`powershell -NoProfile -Command "Set-Clipboard -Path '${foundPath}'"`, (err) => {
        if (err) {
          console.error('Error al copiar APK a portapapeles:', err);
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true, filePath: foundPath });
        }
      });
    });
  });

  // Guardar y abrir reporte de Excel inmediatamente en la computadora
  ipcMain.handle('excel:saveAndOpen', async (_event, fileName: string, buffer: ArrayBuffer) => {
    try {
      const downloadsDir = app.getPath('downloads');
      let targetPath = path.join(downloadsDir, fileName);

      try {
        await fs.writeFile(targetPath, Buffer.from(buffer));
      } catch (writeErr: any) {
        if (writeErr.code === 'EBUSY' || writeErr.code === 'EPERM') {
          const ext = path.extname(fileName);
          const base = path.basename(fileName, ext);
          const timeTag = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
          targetPath = path.join(downloadsDir, `${base}_${timeTag}${ext}`);
          await fs.writeFile(targetPath, Buffer.from(buffer));
        } else {
          throw writeErr;
        }
      }

      await shell.openPath(targetPath);
      return { success: true, filePath: targetPath };
    } catch (err: any) {
      console.error('Error al guardar y abrir Excel:', err);
      return { success: false, error: err.message };
    }
  });

  // Save Excel or export file dialog
  ipcMain.handle('dialog:saveExcel', async (_event, defaultFileName: string) => {
    if (!win) return null;
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Guardar Reporte - La Molienda Café & Bar',
      defaultPath: defaultFileName || 'La_Molienda_Reporte.xlsx',
      filters: [{ name: 'Archivos de Excel (*.xlsx)', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) return null;
    return filePath;
  });

  ipcMain.handle('file:saveBuffer', async (_event, filePath: string, buffer: ArrayBuffer) => {
    try {
      await fs.writeFile(filePath, Buffer.from(buffer));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('file:openPath', async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Direct PDF Download / Export without printer dialog
  ipcMain.handle('pdf:download', async (_event, defaultFileName: string) => {
    if (!win) return { success: false, error: 'Ventana principal no disponible' };
    try {
      const { canceled, filePath } = await dialog.showSaveDialog(win, {
        title: 'Guardar Documento PDF LisCore',
        defaultPath: defaultFileName || 'Documento_LisCore.pdf',
        filters: [{ name: 'Documentos PDF (*.pdf)', extensions: ['pdf'] }],
      });
      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      const pdfData = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'Letter',
        margins: {
          marginType: 'none',
        },
      });

      await fs.writeFile(filePath, pdfData);
      shell.openPath(filePath);
      return { success: true, filePath };
    } catch (err: any) {
      console.error('Error al generar PDF:', err);
      return { success: false, error: err.message };
    }
  });

  // Auto-Updater con GitHub Releases
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      return { status: 'dev', message: 'Las actualizaciones automáticas solo funcionan en la app empaquetada.' };
    }
    try {
      const res = await autoUpdater.checkForUpdates();
      return { status: 'success', updateInfo: res?.updateInfo };
    } catch (err: any) {
      return { status: 'error', error: err?.message || String(err) };
    }
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    isQuitConfirmed = true;
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true);
    });
    return { success: true };
  });

  createWindow();

  // Inicializar listeners del Auto-Updater
  initAutoUpdater(win);

  // Iniciar servidor local Wi-Fi
  startLocalServer(win, 4545)
    .then((info) => {
      serverInfo = info;
    })
    .catch((err) => {
      console.error('Error al iniciar servidor local Wi-Fi:', err);
    });
});

function initAutoUpdater(targetWin: BrowserWindow | null) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    targetWin?.webContents.send('updater:status', {
      status: 'checking',
      message: 'Buscando actualizaciones...',
    });
  });

  autoUpdater.on('update-available', (info) => {
    targetWin?.webContents.send('updater:status', {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      message: `¡Nueva versión v${info.version} disponible! Descargando en segundo plano...`,
    });
  });

  autoUpdater.on('update-not-available', () => {
    targetWin?.webContents.send('updater:status', {
      status: 'not-available',
      message: 'El sistema está actualizado a la última versión.',
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater Error]', err);
    targetWin?.webContents.send('updater:status', {
      status: 'error',
      message: err?.message || 'Error al verificar actualizaciones.',
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    targetWin?.webContents.send('updater:status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
      message: `Descargando actualización: ${Math.round(progress.percent)}%`,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    targetWin?.webContents.send('updater:status', {
      status: 'downloaded',
      version: info.version,
      message: `¡Versión v${info.version} lista para instalar!`,
    });
  });

  // Chequeo diferido en producción al abrir la aplicación
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[AutoUpdater] Falló chequeo automático:', err?.message);
      });
    }, 6000);
  }
}
