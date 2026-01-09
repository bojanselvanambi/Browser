// Preload script for archive page
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('archiveAPI', {
  getArchive: () => ipcRenderer.invoke('archive:get'),
  restore: (id) => ipcRenderer.send('archive:restore', id),
  delete: (id) => ipcRenderer.send('archive:delete', id),
  clearAll: () => ipcRenderer.send('archive:clearAll')
})
