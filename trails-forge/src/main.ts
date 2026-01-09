import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import path from 'path'
import fs from 'fs'
import ViewManager from './ViewManager'

// Forge/Vite specific globals
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

function createWindow(): BrowserWindow {
  console.error('DEBUG: createWindow() called')
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: true,
    autoHideMenuBar: true,
    backgroundColor: '#121212',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#74b1be',
      height: 30
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Ensure window is centered on screen
  mainWindow.center()
  
  // Fallback: ensure window shows even if ready-to-show never fires
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow.isDestroyed()) mainWindow.show()
  })
  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('DEBUG: did-fail-load', errorCode, errorDescription)
    if (!mainWindow.isDestroyed()) mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load URL
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  return mainWindow
}

app.whenReady().then(() => {
  // Set app user model id for windows
  app.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    window.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || 
          (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        if (window.webContents.isDevToolsOpened()) {
          window.webContents.closeDevTools()
        } else {
          window.webContents.openDevTools()
        }
        event.preventDefault()
      }
    })
  })

  const mainWindow = createWindow()
  const viewManager = new ViewManager(mainWindow, app.getAppPath())

  // Cleanup all views when window is closed
  mainWindow.on('close', () => {
    viewManager.destroyAll()
  })

  // Downloads storage
  let downloadsStore: unknown[] = []

  // Adblock extension tracking
  let uBlockId: string | null = null

  // Download tracking
  const trailsSession = session.fromPartition('persist:trails-browser')

  // Auto-load adblock logic
  let extPath = path.join(process.cwd(), 'resources', 'adblock', 'uBlock0.chromium')
  if (app.isPackaged) {
    extPath = path.join(process.resourcesPath, 'adblock', 'uBlock0.chromium')
  }
  if (fs.existsSync(extPath)) {
    trailsSession.loadExtension(extPath).then((ext: { id: string }) => {
      uBlockId = ext.id
    }).catch((e: Error) => {
      console.error('Failed to auto-load Adblock:', e)
    })
  }

  trailsSession.on('will-download', (_, item) => {
    const downloadId = Math.random().toString(36).substr(2, 9)
    const filename = item.getFilename()
    const url = item.getURL()
    const totalBytes = item.getTotalBytes()

    const downloadData = {
      id: downloadId,
      filename,
      url,
      savePath: item.getSavePath(),
      receivedBytes: 0,
      totalBytes,
      state: 'progressing',
      startTime: Date.now()
    }

    downloadsStore.push(downloadData)

    if (!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('download-started', downloadData)
    }

    item.on('updated', (_, state) => {
      const updateData = {
        id: downloadId,
        receivedBytes: item.getReceivedBytes(),
        totalBytes: item.getTotalBytes(),
        state: state === 'progressing' ? 'progressing' : 'interrupted'
      }
      
      const index = downloadsStore.findIndex((d: any) => d.id === downloadId)
      if (index >= 0) {
        downloadsStore[index] = { ...(downloadsStore[index] as any), ...updateData }
      }
      
      if (!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('download-progress', updateData)
      }
    })

    item.once('done', (_, state) => {
      const doneData = {
        id: downloadId,
        state: state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'interrupted',
        savePath: item.getSavePath()
      }
      
      const index = downloadsStore.findIndex((d: any) => d.id === downloadId)
      if (index >= 0) {
        downloadsStore[index] = { ...(downloadsStore[index] as any), ...doneData }
      }
      
      if (!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('download-done', doneData)
      }
    })
  })

  // IPC Handlers
  ipcMain.on('media-control', (_, { id, action }) => {
    const view = viewManager.getView(id)
    if (view) {
      const script = `
        if (window.__trailsMediaControl) {
          window.__trailsMediaControl.${action}();
        }
      `
      view.webContents.executeJavaScript(script, true).catch(() => {})
    }
  })

  ipcMain.on('view-media-update', (event, data) => {
    const viewId = viewManager.getViewIdByWebContents(event.sender)
    if (viewId && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('view-media-update', { id: viewId, ...data })
    }
  })

  ipcMain.on('create-trail-view', (_, { id, url, bounds }) => {
    viewManager.createView(id, url, bounds)
    viewManager.setActive(id)
  })

  ipcMain.on('update-view-bounds', (_, bounds) => {
    viewManager.updateBounds(bounds)
  })

  ipcMain.on('set-active-view', (_, id) => {
    viewManager.setActive(id)
  })

  ipcMain.on('navigate-view', (_, { id, url }) => {
      viewManager.loadURL(id, url)
  })

  ipcMain.on('go-back', (_, id) => {
      viewManager.goBack(id)
  })

  ipcMain.on('go-forward', (_, id) => {
      viewManager.goForward(id)
  })

  ipcMain.on('reload-view', (_, id) => {
      viewManager.reload(id)
  })

  ipcMain.on('destroy-view', (_, id) => {
      viewManager.destroyView(id)
  })

  ipcMain.on('hide-view', () => {
      viewManager.hideActiveView()
  })

  ipcMain.on('show-view', () => {
      viewManager.showActiveView()
  })

  ipcMain.handle('settings:getPath', async () => {
    if (!app.isPackaged) {
      return 'http://localhost:5173/settings.html'
    }
    const settingsPath = path.join(__dirname, '../renderer/settings.html')
    return 'file://' + settingsPath.replace(/\\/g, '/')
  })

  let currentSettings = { searchEngine: 'grok', adblockEnabled: true }

  ipcMain.handle('settings:get', async () => {
    return currentSettings
  })

  ipcMain.on('settings:setSearchEngine', (_, engine) => {
    currentSettings.searchEngine = engine
    mainWindow.webContents.send('settings:searchEngineChanged', engine)
  })

  ipcMain.on('settings:setAdblock', (_, enabled) => {
    currentSettings.adblockEnabled = enabled
    mainWindow.webContents.send('settings:adblockChanged', enabled)
  })

  ipcMain.handle('downloads:getPath', async () => {
    if (!app.isPackaged) {
      return 'http://localhost:5173/downloads.html'
    }
    const downloadsPath = path.join(__dirname, '../renderer/downloads.html')
    return 'file://' + downloadsPath.replace(/\\/g, '/')
  })

  ipcMain.handle('downloads:get', async () => {
    return downloadsStore
  })

  ipcMain.on('downloads:openFolder', async () => {
    shell.openPath(app.getPath('downloads'))
  })

  ipcMain.on('downloads:remove', (_, id) => {
    downloadsStore = downloadsStore.filter((d: any) => d.id !== id)
  })

  ipcMain.on('downloads:clearAll', () => {
    downloadsStore = []
  })

  ipcMain.handle('archive:getPath', async () => {
    if (!app.isPackaged) {
      return 'http://localhost:5173/archive.html'
    }
    const archivePath = path.join(__dirname, '../renderer/archive.html')
    return 'file://' + archivePath.replace(/\\/g, '/')
  })

  let closedTrailsStore: unknown[] = []

  ipcMain.on('archive:sync', (_, closedTrails) => {
    closedTrailsStore = closedTrails || []
  })

  ipcMain.handle('archive:get', async () => {
    return closedTrailsStore
  })

  ipcMain.on('archive:restore', (_, id) => {
    mainWindow.webContents.send('archive:restoreTrail', id)
  })

  ipcMain.on('archive:delete', (_, id) => {
    mainWindow.webContents.send('archive:deleteTrail', id)
  })

  ipcMain.on('archive:clearAll', () => {
    mainWindow.webContents.send('archive:clearAllTrails')
  })

  ipcMain.on('download-store-update', (_, download) => {
    const index = downloadsStore.findIndex((d: any) => d.id === download.id)
    if (index >= 0) {
      downloadsStore[index] = download
    } else {
      downloadsStore.push(download)
    }
  })

  ipcMain.on('adblock:set', async (_, enabled) => {
    // Logic for setting adblock using loadExtension/removeExtension
    let extPath = path.join(process.cwd(), 'resources', 'adblock', 'uBlock0.chromium')
    if (app.isPackaged) {
       extPath = path.join(process.resourcesPath, 'adblock', 'uBlock0.chromium')
    }

    if (enabled) {
        if (!uBlockId && fs.existsSync(extPath)) {
            try {
                const ext = await trailsSession.loadExtension(extPath)
                uBlockId = ext.id
            } catch (e) {
                console.error('Failed to load Adblock:', e)
            }
        }
    } else {
        if (uBlockId) {
            try {
                trailsSession.removeExtension(uBlockId)
                uBlockId = null
            } catch (e) {
                console.error('Failed to remove Adblock:', e)
            }
        }
    }
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
})
