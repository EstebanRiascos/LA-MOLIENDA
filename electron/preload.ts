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
  onCloseRequested: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('app:close-requested', listener);
    return () => ipcRenderer.removeListener('app:close-requested', listener);
  },
  confirmClose: () => ipcRenderer.send('app:confirm-close'),

  // Wi-Fi Local Server & Comandero Móvil API
  getServerInfo: () => ipcRenderer.invoke('server:getInfo'),
  broadcastState: (state: any) => ipcRenderer.send('server:broadcastState', state),
  openApkFolder: () => ipcRenderer.invoke('apk:openFolder'),
  copyApkToClipboard: () => ipcRenderer.invoke('apk:copyToClipboard'),
  onMobileOrder: (callback: (order: any) => void) => {
    const listener = (_event: any, order: any) => callback(order);
    ipcRenderer.on('mobile:new-order', listener);
    return () => ipcRenderer.removeListener('mobile:new-order', listener);
  },
  onMobileOpenTable: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('mobile:open-table', listener);
    return () => ipcRenderer.removeListener('mobile:open-table', listener);
  },
  onMobileRequestBill: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('mobile:request-bill', listener);
    return () => ipcRenderer.removeListener('mobile:request-bill', listener);
  },
  onMobileClientsChanged: (callback: (count: number) => void) => {
    const listener = (_event: any, count: number) => callback(count);
    ipcRenderer.on('server:clients-changed', listener);
    return () => ipcRenderer.removeListener('server:clients-changed', listener);
  },
  isElectron: true,
};

contextBridge.exposeInMainWorld('electronAPI', api);
