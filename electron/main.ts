import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: 'La Molienda - Café & Bar | POS & Control de Inventario',
    backgroundColor: '#0e0b08',
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

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const distPath = process.env.DIST || path.join(__dirname, '../dist');
    win.loadFile(path.join(distPath, 'index.html'));
  }
}

app.on('window-all-closed', () => {
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

  createWindow();
});
