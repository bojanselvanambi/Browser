// Preload script for settings page
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('settingsAPI', {
  setSearchEngine: (engine) => ipcRenderer.send('settings:setSearchEngine', engine),
  setAdblock: (enabled) => ipcRenderer.send('settings:setAdblock', enabled),
  getSettings: () => ipcRenderer.invoke('settings:get')
})
