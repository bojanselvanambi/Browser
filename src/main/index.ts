import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import icon from '../../resources/Icon.png?asset'
import ViewManager from './ViewManager'

// castLabs Widevine components (only available in castLabs Electron fork)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const electron = require('electron')
const components = electron.components as { whenReady: () => Promise<void> } | undefined

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#121212',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#121212',
      symbolColor: '#E0E0E0',
      height: 32
    },
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Wait for Widevine CDM to be ready (castLabs fork only)
  if (components && components.whenReady) {
    await components.whenReady()
    console.log('[Widevine] CDM components ready')
  } else {
    console.log('[Widevine] Standard Electron - no Widevine support')
  }

  // Set app user model id for windows
  app.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    // Register F12 and Ctrl+Shift+I to toggle DevTools
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

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  const mainWindow = createWindow()
  const viewManager = new ViewManager(mainWindow, app.getAppPath())

  // Downloads storage - must be before download tracking
  let downloadsStore: unknown[] = []

  // Adblock extension tracking
  let uBlockId: string | null = null

  // Download tracking
  const trailsSession = session.fromPartition('persist:trails-browser')

  // Auto-load adblock on startup if enabled (default is true)
  const fs = require('fs')
  const path = require('path')
  let extPath = path.join(process.cwd(), 'resources', 'adblock', 'uBlock0.chromium')
  if (app.isPackaged) {
    extPath = path.join(process.resourcesPath, 'adblock', 'uBlock0.chromium')
  }
  if (fs.existsSync(extPath)) {
    trailsSession.loadExtension(extPath).then((ext: { id: string }) => {
      uBlockId = ext.id
      console.log('Adblock auto-loaded on startup:', uBlockId)
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

    // Store in downloadsStore for downloads page
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
      
      // Update in downloadsStore
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
      
      // Update in downloadsStore
      const index = downloadsStore.findIndex((d: any) => d.id === downloadId)
      if (index >= 0) {
        downloadsStore[index] = { ...(downloadsStore[index] as any), ...doneData }
      }
      
      if (!mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('download-done', doneData)
      }
    })
  })

  // Media control handler
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

  // Handle detailed media state updates from views (via view-preload.js)
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




  // Return settings page path
  ipcMain.handle('settings:getPath', async () => {
    const path = require('path')

    if (!app.isPackaged) {
      return 'http://localhost:5173/settings.html'
    }
    const settingsPath = path.join(__dirname, '../renderer/settings.html')
    return 'file://' + settingsPath.replace(/\\/g, '/')
  })

  // Settings IPC handlers - relay to renderer and store values
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



  // Downloads page path
  ipcMain.handle('downloads:getPath', async () => {
    const path = require('path')

    if (!app.isPackaged) {
      return 'http://localhost:5173/downloads.html'
    }
    const downloadsPath = path.join(__dirname, '../renderer/downloads.html')
    return 'file://' + downloadsPath.replace(/\\/g, '/')
  })

  // Downloads IPC handlers
  ipcMain.handle('downloads:get', async () => {
    return downloadsStore
  })

  ipcMain.on('downloads:openFolder', async () => {
    const { shell } = require('electron')
    shell.openPath(app.getPath('downloads'))
  })

  ipcMain.on('downloads:remove', (_, id) => {
    downloadsStore = downloadsStore.filter((d: any) => d.id !== id)
  })

  ipcMain.on('downloads:clearAll', () => {
    downloadsStore = []
  })

  // Archive page path
  ipcMain.handle('archive:getPath', async () => {
    const path = require('path')

    if (!app.isPackaged) {
      return 'http://localhost:5173/archive.html'
    }
    const archivePath = path.join(__dirname, '../renderer/archive.html')
    return 'file://' + archivePath.replace(/\\/g, '/')
  })

  // Archive store for closed trails
  let closedTrailsStore: unknown[] = []

  // Sync closed trails from renderer to main (called when trails are closed)
  ipcMain.on('archive:sync', (_, closedTrails) => {
    closedTrailsStore = closedTrails || []
  })

  // Archive IPC handlers
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

  // Store downloads from session events
  ipcMain.on('download-store-update', (_, download) => {
    const index = downloadsStore.findIndex((d: any) => d.id === download.id)
    if (index >= 0) {
      downloadsStore[index] = download
    } else {
      downloadsStore.push(download)
    }
  })

  ipcMain.on('adblock:set', async (_, enabled) => {
    const fs = require('fs')
    const path = require('path')
    
    // Determine path - uBlock Origin 1.62.0 extracts to uBlock0.chromium subfolder
    let extPath = path.join(process.cwd(), 'resources', 'adblock', 'uBlock0.chromium')
    if (app.isPackaged) {
       extPath = path.join(process.resourcesPath, 'adblock', 'uBlock0.chromium')
    }

    if (enabled) {
        if (!uBlockId && fs.existsSync(extPath)) {
            try {
                const ext = await trailsSession.loadExtension(extPath)
                uBlockId = ext.id
                console.log('Adblock Loaded:', uBlockId)
            } catch (e) {
                console.error('Failed to load Adblock:', e)
            }
        }
    } else {
        if (uBlockId) {
            try {
                trailsSession.removeExtension(uBlockId)
                uBlockId = null
                console.log('Adblock Removed')
            } catch (e) {
                console.error('Failed to remove Adblock:', e)
            }
        }
    }
  })







  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
