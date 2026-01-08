// Preload script for downloads page
const { contextBridge, ipcRenderer, shell } = require('electron')

contextBridge.exposeInMainWorld('downloadsAPI', {
  getDownloads: () => ipcRenderer.invoke('downloads:get'),
  openFile: (path) => shell.openPath(path),
  showInFolder: (path) => shell.showItemInFolder(path),
  openDownloadsFolder: () => ipcRenderer.send('downloads:openFolder'),
  removeDownload: (id) => ipcRenderer.send('downloads:remove', id),
  clearAll: () => ipcRenderer.send('downloads:clearAll')
})
