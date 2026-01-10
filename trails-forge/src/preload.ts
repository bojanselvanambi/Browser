import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  trails: {
    createTrailView: (id: string, url: string, bounds: { x: number; y: number; width: number; height: number }) =>
      ipcRenderer.send('create-trail-view', { id, url, bounds }),
    updateViewBounds: (bounds: { x: number; y: number; width: number; height: number }) =>
      ipcRenderer.send('update-view-bounds', bounds),
    setActiveView: (id: string) => ipcRenderer.send('set-active-view', id),
    navigateView: (id: string, url: string) => ipcRenderer.send('navigate-view', { id, url }),
    goBack: (id: string) => ipcRenderer.send('go-back', id),
    goForward: (id: string) => ipcRenderer.send('go-forward', id),
    reload: (id: string) => ipcRenderer.send('reload-view', id),
    destroyView: (id: string) => ipcRenderer.send('destroy-view', id),
    hideView: () => ipcRenderer.send('hide-view'),
    showView: () => ipcRenderer.send('show-view'),
    openPath: (path: string) => ipcRenderer.send('open-path', path),
    showInFolder: (path: string) => ipcRenderer.send('show-in-folder', path),
    setContentTheme: (theme: 'default' | 'light' | 'dark') => ipcRenderer.send('set-content-theme', theme),

    onViewTitleUpdated: (callback: (event: unknown, data: { id: string; title: string }) => void) =>
      ipcRenderer.on('view-title-updated', callback),
    onViewNavigated: (callback: (event: unknown, data: { id: string; url: string }) => void) =>
      ipcRenderer.on('view-navigated', callback),
    onViewNewWindow: (callback: (event: unknown, data: { sourceId: string; url: string }) => void) =>
      ipcRenderer.on('view-new-window', callback),
    onViewFaviconUpdated: (callback: (event: unknown, data: { id: string; favicon: string }) => void) =>
      ipcRenderer.on('view-favicon-updated', callback),
    onViewLinkClicked: (callback: (event: unknown, data: { sourceId: string; url: string }) => void) =>
      ipcRenderer.on('view-link-clicked', callback),
    onFullscreenEnter: (callback: () => void) =>
      ipcRenderer.on('fullscreen:enter', callback),
    onFullscreenLeave: (callback: () => void) =>
      ipcRenderer.on('fullscreen:leave', callback),
    onDownloadStarted: (callback: (event: unknown, data: unknown) => void) =>
      ipcRenderer.on('download-started', callback),
    onDownloadProgress: (callback: (event: unknown, data: unknown) => void) =>
      ipcRenderer.on('download-progress', callback),
    onDownloadDone: (callback: (event: unknown, data: unknown) => void) =>
      ipcRenderer.on('download-done', callback),
    onMediaPlaying: (callback: (event: unknown, data: { id: string; isPlaying: boolean; title: string }) => void) =>
      ipcRenderer.on('view-media-playing', callback),
    onMediaPaused: (callback: (event: unknown, data: { id: string; isPlaying: boolean }) => void) =>
      ipcRenderer.on('view-media-paused', callback),
    mediaControl: (id: string, action: 'play' | 'pause' | 'forward' | 'backward' | 'togglePiP') =>
      ipcRenderer.send('media-control', { id, action }),
    onAdblockDebug: (callback: (event: unknown, data: unknown) => void) =>
      ipcRenderer.on('adblock-debug', callback),
    getAdblockDebug: () => ipcRenderer.invoke('get-adblock-debug'),
    onPasswordDetected: (callback: (event: unknown, data: { website: string; url: string; username: string; password: string }) => void) =>
      ipcRenderer.on('password-detected', callback),
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('view-title-updated')
      ipcRenderer.removeAllListeners('view-navigated')
      ipcRenderer.removeAllListeners('view-new-window')
      ipcRenderer.removeAllListeners('view-favicon-updated')
      ipcRenderer.removeAllListeners('view-link-clicked')
      ipcRenderer.removeAllListeners('download-started')
      ipcRenderer.removeAllListeners('download-progress')
      ipcRenderer.removeAllListeners('download-done')
      ipcRenderer.removeAllListeners('view-media-playing')
      ipcRenderer.removeAllListeners('view-media-paused')
      ipcRenderer.removeAllListeners('fullscreen:enter')
      ipcRenderer.removeAllListeners('fullscreen:leave')
      ipcRenderer.removeAllListeners('fullscreen:leave')
      ipcRenderer.removeAllListeners('view-media-update')
      ipcRenderer.removeAllListeners('context:openInNewTrail')
      ipcRenderer.removeAllListeners('context:openAsSubTrail')
    },
    onMediaUpdate: (callback: (event: unknown, data: any) => void) =>
      ipcRenderer.on('view-media-update', callback),
    onContextOpenInNewTrail: (callback: (event: unknown, data: { url: string }) => void) =>
      ipcRenderer.on('context:openInNewTrail', callback),
    onContextOpenAsSubTrail: (callback: (event: unknown, data: { sourceId: string; url: string }) => void) =>
      ipcRenderer.on('context:openAsSubTrail', callback)
  },
  adblock: {
    set: (enabled: boolean) => ipcRenderer.send('adblock:set', enabled)
  },
  settings: {
    getPath: () => ipcRenderer.invoke('settings:getPath'),
    setSearchEngine: (engine: string) => ipcRenderer.send('settings:setSearchEngine', engine),
    setAdblock: (enabled: boolean) => ipcRenderer.send('settings:setAdblock', enabled),
    onSearchEngineChanged: (callback: (event: unknown, engine: string) => void) =>
      ipcRenderer.on('settings:searchEngineChanged', callback),
    onAdblockChanged: (callback: (event: unknown, enabled: boolean) => void) =>
      ipcRenderer.on('settings:adblockChanged', callback)
  },
  downloads: {
    getPath: () => ipcRenderer.invoke('downloads:getPath')
  },

  archive: {
    getPath: () => ipcRenderer.invoke('archive:getPath'),
    sync: (closedTrails: unknown[]) => ipcRenderer.send('archive:sync', closedTrails),
    onRestoreTrail: (callback: (event: unknown, id: string) => void) =>
      ipcRenderer.on('archive:restoreTrail', callback),
    onDeleteTrail: (callback: (event: unknown, id: string) => void) =>
      ipcRenderer.on('archive:deleteTrail', callback),
    onClearAll: (callback: () => void) =>
      ipcRenderer.on('archive:clearAllTrails', callback)
  }
}

// Dedicated APIs for internal pages (Settings, Downloads, Archive)
const settingsAPI = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSearchEngine: (engine: string) => ipcRenderer.send('settings:setSearchEngine', engine),
  setAdblock: (enabled: boolean) => ipcRenderer.send('settings:setAdblock', enabled)
}

const downloadsAPI = {
  getDownloads: () => ipcRenderer.invoke('downloads:get'),
  openFile: (path: string) => ipcRenderer.send('downloads:openFile', path),
  showInFolder: (path: string) => ipcRenderer.send('downloads:showInFolder', path),
  removeDownload: (id: string) => ipcRenderer.send('downloads:remove', id),
  clearAll: () => ipcRenderer.send('downloads:clearAll'),
  openDownloadsFolder: () => ipcRenderer.send('downloads:openFolder')
}

const archiveAPI = {
  getArchive: () => ipcRenderer.invoke('archive:get'),
  restore: (id: string) => ipcRenderer.send('archive:restore', id),
  delete: (id: string) => ipcRenderer.send('archive:delete', id),
  clearAll: () => ipcRenderer.send('archive:clearAll')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('settingsAPI', settingsAPI)
    contextBridge.exposeInMainWorld('downloadsAPI', downloadsAPI)
    contextBridge.exposeInMainWorld('archiveAPI', archiveAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.settingsAPI = settingsAPI
  // @ts-ignore (define in dts)
  window.downloadsAPI = downloadsAPI
  // @ts-ignore (define in dts)
  window.archiveAPI = archiveAPI
}
