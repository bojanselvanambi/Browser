// Preload script for downloads page
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('downloadsAPI', {
  getDownloads: () => ipcRenderer.invoke('downloads:get'),
  openFile: (path) => ipcRenderer.send('downloads:openFile', path),
  showInFolder: (path) => ipcRenderer.send('downloads:showInFolder', path),
  openDownloadsFolder: () => ipcRenderer.send('downloads:openFolder'),
  removeDownload: (id) => ipcRenderer.send('downloads:remove', id),
  clearAll: () => ipcRenderer.send('downloads:clearAll')
})
