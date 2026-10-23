const { contextBridge, ipcRenderer } = require('electron');

const api = {
  openExcelDialog: () => ipcRenderer.invoke('dialog:openExcel'),
  saveExcelDialog: (defaultFileName) => ipcRenderer.invoke('dialog:saveExcel', defaultFileName),
  saveAndOpenExcel: (fileName, buffer) => ipcRenderer.invoke('excel:saveAndOpen', fileName, buffer),
  saveBuffer: (filePath, buffer) => ipcRenderer.invoke('file:saveBuffer', filePath, buffer),
  readBuffer: (filePath) => ipcRenderer.invoke('file:readBuffer', filePath),
  getDesktopSample: () => ipcRenderer.invoke('file:getDesktopSample'),
  openPath: (filePath) => ipcRenderer.invoke('file:openPath', filePath),
  executeAudit: (orderNumber) => ipcRenderer.invoke('audit:execute', orderNumber),
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),
  testDbConnection: (config) => ipcRenderer.invoke('config:testDb', config),
  downloadPdf: (defaultFileName) => ipcRenderer.invoke('pdf:download', defaultFileName),
  onCloseRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('app:close-requested', listener);
    return () => ipcRenderer.removeListener('app:close-requested', listener);
  },
  confirmClose: () => ipcRenderer.send('app:confirm-close'),
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', api);
