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

  // Wi-Fi Local Server & Comandero Móvil API
  getServerInfo: () => ipcRenderer.invoke('server:getInfo'),
  broadcastState: (state) => ipcRenderer.send('server:broadcastState', state),
  openApkFolder: () => ipcRenderer.invoke('apk:openFolder'),
  copyApkToClipboard: () => ipcRenderer.invoke('apk:copyToClipboard'),
  onMobileOrder: (callback) => {
    const listener = (_event, order) => callback(order);
    ipcRenderer.on('mobile:new-order', listener);
    return () => ipcRenderer.removeListener('mobile:new-order', listener);
  },
  onMobileOpenTable: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('mobile:open-table', listener);
    return () => ipcRenderer.removeListener('mobile:open-table', listener);
  },
  onMobileRequestBill: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('mobile:request-bill', listener);
    return () => ipcRenderer.removeListener('mobile:request-bill', listener);
  },
  onMobileClientsChanged: (callback) => {
    const listener = (_event, count) => callback(count);
    ipcRenderer.on('server:clients-changed', listener);
    return () => ipcRenderer.removeListener('server:clients-changed', listener);
  },

  // Auto-Updater con GitHub Releases
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:quitAndInstall'),
  onUpdateStatus: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('updater:status', listener);
    return () => ipcRenderer.removeListener('updater:status', listener);
  },
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', api);
