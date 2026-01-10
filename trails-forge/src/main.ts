import { app, shell, BrowserWindow, ipcMain, session, nativeTheme } from 'electron'
import path from 'path'
import fs from 'fs'
import started from 'electron-squirrel-startup'
import ViewManager from './ViewManager'
import { shouldBlockUrl } from './trackerList'
import { cleanUrl } from './urlCleaner'

// ============= PERFORMANCE OPTIMIZATION =============
// Enable GPU acceleration and hardware rendering
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-accelerated-video-decode')
app.commandLine.appendSwitch('enable-accelerated-mjpeg-decode')

// V8 optimizations for faster JavaScript execution
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096 --optimize-for-size')

// Smooth scrolling and rendering
app.commandLine.appendSwitch('enable-smooth-scrolling')
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,VaapiVideoEncoder')

// Reduce memory footprint
app.commandLine.appendSwitch('disable-renderer-backgrounding')

// ============= PRIVACY CONFIGURATION =============
// Disable telemetry and reporting
app.commandLine.appendSwitch('disable-features', 'Reporting,CrashReporting,MetricsReportingService')
app.commandLine.appendSwitch('disable-breakpad') // Disable crash reporter
app.commandLine.appendSwitch('no-pings') // Disable hyperlink auditing

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

// Forge/Vite specific globals
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

function createWindow(): BrowserWindow {
  console.error('DEBUG: createWindow() called')
  // Determine icon path based on environment
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, '../../resources/icon.ico')

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    icon: iconPath,
    show: true,
    autoHideMenuBar: true,
    backgroundMaterial: 'acrylic',  // Windows 11 native acrylic blur
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#74b1be',
      height: 32
    },
    minimizable: true,
    maximizable: true,
    closable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // Performance optimizations for main UI
      backgroundThrottling: false,  // Keep main UI responsive
      webgl: true,  // Enable WebGL for GPU acceleration
      enableBlinkFeatures: 'AcceleratedSmallCanvases',  // GPU accelerate canvases
      v8CacheOptions: 'bypassHeatCheck'  // Aggressive V8 caching
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
  app.setAppUserModelId('com.trails.browser')

  // Settings state
  let currentSettings: any = { 
    searchEngine: 'perplexity', 
    adblockEnabled: true,
    clearUrls: false,
    scrollToTop: false,
    cookieConsentHider: false,
    canvasDefender: false,
    hoverZoom: false,
    sponsorBlock: false,
    fastForward: false
  }

  // ============= PRIVACY: Session Configuration =============
  const defaultSession = session.defaultSession
  
  // Block third-party cookies
  defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders }
    
    // Set strict referrer policy
    if (requestHeaders['Referer']) {
      try {
        const refererUrl = new URL(requestHeaders['Referer'])
        const requestUrl = new URL(details.url)
        // Only send referrer to same origin
        if (refererUrl.origin !== requestUrl.origin) {
          requestHeaders['Referer'] = requestUrl.origin + '/'
        }
      } catch {
        // Invalid URL, remove referer
        delete requestHeaders['Referer']
      }
    }
    
    // Remove tracking headers
    delete requestHeaders['X-Client-Data']
    
    callback({ requestHeaders })
  })
  
  // Block known tracker requests & ClearURLs
  defaultSession.webRequest.onBeforeRequest((details, callback) => {
    // 1. Block Trackers
    if (shouldBlockUrl(details.url)) {
      console.log('[PRIVACY] Blocked tracker:', details.url.substring(0, 80))
      callback({ cancel: true })
      return
    }

    // 2. ClearURLs
    if (currentSettings.clearUrls) {
      const cleaned = cleanUrl(details.url)
      if (cleaned !== details.url) {
        console.log('[ClearURLs] Cleaned:', details.url, '->', cleaned)
        callback({ redirectURL: cleaned })
        return
      }
    }

    callback({})
  })

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
  const adblockDebugInfo: Record<string, unknown> = {
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    extPath: extPath,
    pathExists: fs.existsSync(extPath)
  }
  console.log('[ADBLOCK] Debug info:', adblockDebugInfo)
  
  // Handler for renderer to request adblock debug info
  ipcMain.handle('get-adblock-debug', () => {
    return adblockDebugInfo
  })
  
  if (fs.existsSync(extPath)) {
    trailsSession.loadExtension(extPath).then((ext: { id: string }) => {
      uBlockId = ext.id
      console.log('[ADBLOCK] Extension loaded successfully, ID:', uBlockId)
      adblockDebugInfo.loaded = true
      adblockDebugInfo.extensionId = uBlockId
    }).catch((e: Error) => {
      console.error('[ADBLOCK] Failed to auto-load Adblock:', e)
      adblockDebugInfo.loaded = false
      adblockDebugInfo.error = e.message
    })
  } else {
    console.error('[ADBLOCK] Extension path does not exist!')
    adblockDebugInfo.pathMissing = true
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

  // Adblock toggle handler
  ipcMain.on('adblock:set', (_, enabled: boolean) => {
    console.log('[ADBLOCK] Toggle requested:', enabled)
    if (!enabled && uBlockId) {
      // Disable: remove extension (synchronous)
      try {
        trailsSession.removeExtension(uBlockId)
        console.log('[ADBLOCK] Extension disabled')
        uBlockId = null
      } catch (e) {
        console.error('[ADBLOCK] Failed to disable:', e)
      }
    } else if (enabled && !uBlockId) {
      // Enable: reload extension
      if (fs.existsSync(extPath)) {
        trailsSession.loadExtension(extPath).then((ext: { id: string }) => {
          uBlockId = ext.id
          console.log('[ADBLOCK] Extension re-enabled, ID:', uBlockId)
        }).catch((e: Error) => console.error('[ADBLOCK] Failed to enable:', e))
      }
    }
  })

  // Password auto-detect handler - forward to main renderer for save prompt
  ipcMain.on('password-detected', (_, data: { website: string; url: string; username: string; password: string }) => {
    console.log('[PASSWORD] Detected login for:', data.website, 'username:', data.username)
    // Forward to main renderer window
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('password-detected', data)
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

  ipcMain.on('open-path', (_, filePath) => {
      shell.openPath(filePath)
  })

  ipcMain.on('show-in-folder', (_, filePath) => {
      shell.showItemInFolder(filePath)
  })

  ipcMain.on('set-content-theme', (_, theme) => {
    // Set nativeTheme.themeSource to affect BrowserView content (websites)
    // 'system' | 'light' | 'dark'
    nativeTheme.themeSource = theme === 'default' ? 'system' : theme
  })

  ipcMain.handle('settings:getPath', async () => {
    if (!app.isPackaged) {
      return 'http://localhost:5173/settings.html'
    }
    const settingsPath = path.join(__dirname, '../renderer/main_window/settings.html')
    return 'file://' + settingsPath.replace(/\\/g, '/')
  })

  // Settings are defined at top of readiness block now

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

  // Generic settings update from renderer
  ipcMain.on('settings:update', (_, settings) => {
    // Merge updates
    currentSettings = { ...currentSettings, ...settings }
    // Broadcast to views
    viewManager.broadcast('settings:update', currentSettings)
    // Also update main window if needed, though it sent it
  })

  ipcMain.handle('downloads:getPath', async () => {
    if (!app.isPackaged) {
      return 'http://localhost:5173/downloads.html'
    }
    const downloadsPath = path.join(__dirname, '../renderer/main_window/downloads.html')
    return 'file://' + downloadsPath.replace(/\\/g, '/')
  })

  ipcMain.handle('downloads:get', async () => {
    return downloadsStore
  })

  ipcMain.on('downloads:openFolder', async () => {
    shell.openPath(app.getPath('downloads'))
  })

  ipcMain.on('downloads:openFile', (_, path) => {
    shell.openPath(path)
  })

  ipcMain.on('downloads:showInFolder', (_, path) => {
    shell.showItemInFolder(path)
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
    const archivePath = path.join(__dirname, '../renderer/main_window/archive.html')
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
