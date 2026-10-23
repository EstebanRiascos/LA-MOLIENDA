// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron');

const api = {
  openExcelDialog: () => ipcRenderer.invoke('dialog:openExcel'),
  saveExcelDialog: (defaultFileName: string) => ipcRenderer.invoke('dialog:saveExcel', defaultFileName),
  saveAndOpenExcel: (fileName: string, buffer: ArrayBuffer) => ipcRenderer.invoke('excel:saveAndOpen', fileName, buffer),
  saveBuffer: (filePath: string, buffer: ArrayBuffer) => ipcRenderer.invoke('file:saveBuffer', filePath, buffer),
  readBuffer: (filePath: string) => ipcRenderer.invoke('file:readBuffer', filePath),
  getDesktopSample: () => ipcRenderer.invoke('file:getDesktopSample'),
  openPath: (filePath: string) => ipcRenderer.invoke('file:openPath', filePath),
  executeAudit: (orderNumber: string) => ipcRenderer.invoke('audit:execute', orderNumber),
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config: any) => ipcRenderer.invoke('config:save', config),
  testDbConnection: (config: any) => ipcRenderer.invoke('config:testDb', config),
  downloadPdf: (defaultFileName: string) => ipcRenderer.invoke('pdf:download', defaultFileName),
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', api);
