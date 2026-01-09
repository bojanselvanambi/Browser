import { BrowserView, BrowserWindow, Menu, MenuItem, clipboard } from 'electron'
import path from 'path'

interface ViewBounds {
  x: number
  y: number
  width: number
  height: number
}

interface FullscreenState {
  savedBounds: ViewBounds | null
  windowWasMaximized: boolean
}

class ViewManager {
  private views: Map<string, BrowserView> = new Map()
  private mainWindow: BrowserWindow
  private activeViewId: string | null = null
  private currentBounds: ViewBounds | null = null
  private fullscreenState: FullscreenState = { savedBounds: null, windowWasMaximized: false }
  private appPath: string

  constructor(mainWindow: BrowserWindow, appPath: string) {
    this.mainWindow = mainWindow
    this.appPath = appPath
  }

  createView(id: string, url: string, bounds: ViewBounds) {
    // Ensure url is defined
    if (!url) {
      url = 'about:blank'
    }

    if (this.views.has(id)) {
      return this.views.get(id)
    }


    // Use custom preload for internal pages
    const isSettingsPage = url.includes('settings.html')
    const isDownloadsPage = url.includes('downloads.html')
    const isArchivePage = url.includes('archive.html')
    const isInternalPage = isSettingsPage || isDownloadsPage || isArchivePage
    
    let preloadPath: string | undefined
    if (isSettingsPage) {
      preloadPath = path.join(this.appPath, 'resources', 'settings-preload.js')
    } else if (isDownloadsPage) {
      preloadPath = path.join(this.appPath, 'resources', 'downloads-preload.js')
    } else if (isArchivePage) {
      preloadPath = path.join(this.appPath, 'resources', 'archive-preload.js')
    }

    // Use non-persistent partition for incognito trails
    // (Removed incognito logic: always use trail-browser partition)
    const partition = 'persist:trails-browser'

    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: isInternalPage ? false : true,
        partition,

        preload: preloadPath || path.join(this.appPath, 'resources', 'view-preload.js')
      }
    })

    this.views.set(id, view)
    
    // Load URL
    view.webContents.loadURL(url)
    
    // Initial bounds (will be updated when active)
    view.setBounds(bounds)

    // Inject media control script on page load
    view.webContents.on('did-finish-load', () => {
        const script = `
(function() {
    if (window.__trailsMediaControl) return;
    
    function getMedia() {
        const videos = Array.from(document.querySelectorAll('video'));
        const audios = Array.from(document.querySelectorAll('audio'));
        const all = [...videos, ...audios];
        return all.find(el => !el.paused) || all[0];
    }
    
    window.__trailsMediaControl = {
        play: () => { const m = getMedia(); if (m) m.play(); },
        pause: () => { const m = getMedia(); if (m) m.pause(); },
        forward: (s=10) => { const m = getMedia(); if (m) m.currentTime += s; },
        backward: (s=10) => { const m = getMedia(); if (m) m.currentTime -= s; }
    };
})();
`
        view.webContents.executeJavaScript(script).catch(() => {})
    })

    view.webContents.on('did-navigate', (_, url) => {
        if (!this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed()) {
            this.mainWindow.webContents.send('view-navigated', { id, url })
        }
    })
    
    view.webContents.setWindowOpenHandler((details) => {
        if (!this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed()) {
            this.mainWindow.webContents.send('view-new-window', { sourceId: id, url: details.url })
        }
        return { action: 'deny' }
    })
    
    view.webContents.on('page-title-updated', (_, title) => {
        if (!this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed()) {
            this.mainWindow.webContents.send('view-title-updated', { id, title })
        }
    })

    view.webContents.on('page-favicon-updated', (_, favicons) => {
        console.log('[MAIN] page-favicon-updated for view', id, 'favicons:', favicons)
        if (favicons && favicons.length > 0) {
            if (!this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed()) {
                console.log('[MAIN] Sending view-favicon-updated to renderer:', { id, favicon: favicons[0] })
                this.mainWindow.webContents.send('view-favicon-updated', { id, favicon: favicons[0] })
            }
        }
    })

    // Create sub-trails for cross-domain navigation (user clicking external links)
    view.webContents.on('will-navigate', (event, url) => {
        const currentUrl = view.webContents.getURL()
        
        // Skip if no current URL or same URL
        if (!currentUrl || currentUrl === 'about:blank' || url === currentUrl) {
            return
        }

        try {
            const currentDomain = new URL(currentUrl).hostname.replace('www.', '')
            const newDomain = new URL(url).hostname.replace('www.', '')
            
            // Only create sub-trail for cross-domain navigation
            if (currentDomain !== newDomain) {
                event.preventDefault()
                if (!this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed()) {
                    this.mainWindow.webContents.send('view-link-clicked', { sourceId: id, url })
                }
            }
            // Same domain navigation stays in place (e.g., clicking Google search results)
        } catch {
            // Invalid URL, allow navigation
        }
    })

    // Media detection - track when tab is playing audio
    view.webContents.on('media-started-playing', () => {
        if (!this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed()) {
            this.mainWindow.webContents.send('view-media-playing', { 
                id, 
                isPlaying: true,
                title: view.webContents.getTitle()
            })
        }
    })

    view.webContents.on('media-paused', () => {
        if (!this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed()) {
            this.mainWindow.webContents.send('view-media-paused', { id, isPlaying: false })
        }
    })

    // Context menu handler for right-click on webpages
    view.webContents.on('context-menu', (_event, params) => {
        const menu = new Menu()

        // Link context
        if (params.linkURL) {
            menu.append(new MenuItem({
                label: 'Open Link in New Trail',
                click: () => {
                    if (!this.mainWindow.isDestroyed()) {
                        this.mainWindow.webContents.send('context:openInNewTrail', { url: params.linkURL })
                    }
                }
            }))
            menu.append(new MenuItem({
                label: 'Open Link as Sub-Trail',
                click: () => {
                    if (!this.mainWindow.isDestroyed()) {
                        this.mainWindow.webContents.send('context:openAsSubTrail', { sourceId: id, url: params.linkURL })
                    }
                }
            }))
            menu.append(new MenuItem({ type: 'separator' }))
            menu.append(new MenuItem({
                label: 'Copy Link',
                click: () => clipboard.writeText(params.linkURL)
            }))
            menu.append(new MenuItem({ type: 'separator' }))
        }

        // Image context
        if (params.mediaType === 'image' && params.srcURL) {
            menu.append(new MenuItem({
                label: 'Open Image in New Trail',
                click: () => {
                    if (!this.mainWindow.isDestroyed()) {
                        this.mainWindow.webContents.send('context:openInNewTrail', { url: params.srcURL })
                    }
                }
            }))
            menu.append(new MenuItem({
                label: 'Save Image',
                click: () => {
                    view.webContents.downloadURL(params.srcURL)
                }
            }))
            menu.append(new MenuItem({
                label: 'Copy Image URL',
                click: () => clipboard.writeText(params.srcURL)
            }))
            menu.append(new MenuItem({ type: 'separator' }))
        }

        // Video context
        if (params.mediaType === 'video' && params.srcURL) {
            menu.append(new MenuItem({
                label: 'Open Video in New Trail',
                click: () => {
                    if (!this.mainWindow.isDestroyed()) {
                        this.mainWindow.webContents.send('context:openInNewTrail', { url: params.srcURL })
                    }
                }
            }))
            menu.append(new MenuItem({ type: 'separator' }))
        }

        // Selection context
        if (params.selectionText) {
            menu.append(new MenuItem({
                label: 'Copy',
                role: 'copy'
            }))
            menu.append(new MenuItem({
                label: 'Search in New Trail',
                click: () => {
                    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`
                    if (!this.mainWindow.isDestroyed()) {
                        this.mainWindow.webContents.send('context:openInNewTrail', { url: searchUrl })
                    }
                }
            }))
            menu.append(new MenuItem({ type: 'separator' }))
        }

        // General navigation
        if (view.webContents.canGoBack()) {
            menu.append(new MenuItem({
                label: 'Back',
                click: () => view.webContents.goBack()
            }))
        }
        if (view.webContents.canGoForward()) {
            menu.append(new MenuItem({
                label: 'Forward',
                click: () => view.webContents.goForward()
            }))
        }
        menu.append(new MenuItem({
            label: 'Reload',
            click: () => view.webContents.reload()
        }))
        menu.append(new MenuItem({ type: 'separator' }))
        menu.append(new MenuItem({
            label: 'Copy Page URL',
            click: () => clipboard.writeText(view.webContents.getURL())
        }))

        if (menu.items.length > 0) {
            menu.popup({ window: this.mainWindow })
        }
    })

    // Fullscreen handlers for true fullscreen video
    view.webContents.on('enter-html-full-screen', () => {
        // Save current state
        this.fullscreenState.savedBounds = this.currentBounds
        this.fullscreenState.windowWasMaximized = this.mainWindow.isMaximized()
        
        // Go fullscreen
        this.mainWindow.setFullScreen(true)
        
        // Notify renderer to hide UI
        if (!this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed()) {
            this.mainWindow.webContents.send('fullscreen:enter')
        }
        
        // Expand view to full screen after a small delay to ensure fullscreen transition completes
        setTimeout(() => {
            if (!view.webContents.isDestroyed()) {
                const [width, height] = this.mainWindow.getSize()
                view.setBounds({ x: 0, y: 0, width, height })
            }
        }, 100)
    })

    view.webContents.on('leave-html-full-screen', () => {
        // Exit fullscreen
        this.mainWindow.setFullScreen(false)
        
        // Notify renderer to show UI
        if (!this.mainWindow.isDestroyed() && !this.mainWindow.webContents.isDestroyed()) {
            this.mainWindow.webContents.send('fullscreen:leave')
        }
        
        // Restore previous window state
        if (this.fullscreenState.windowWasMaximized) {
            this.mainWindow.maximize()
        }
        
        // Restore view bounds after a small delay
        setTimeout(() => {
            if (!view.webContents.isDestroyed() && this.fullscreenState.savedBounds) {
                view.setBounds(this.fullscreenState.savedBounds)
                this.currentBounds = this.fullscreenState.savedBounds
            }
        }, 100)
    })

    return view
  }

  setActive(id: string) {
    const view = this.views.get(id)
    if (!view) return

    // Detach current
    if (this.activeViewId && this.views.get(this.activeViewId)) {
      this.mainWindow.removeBrowserView(this.views.get(this.activeViewId)!)
    }

    this.activeViewId = id
    this.mainWindow.setBrowserView(view)
    
    if (this.currentBounds) {
      view.setBounds(this.currentBounds)
    }
  }

  updateBounds(bounds: ViewBounds) {
    this.currentBounds = bounds
    if (this.activeViewId) {
      const view = this.views.get(this.activeViewId)
      if (view) {
        view.setBounds(bounds)
      }
    }
  }

  getView(id: string) {
    return this.views.get(id)
  }
  
  loadURL(id: string, url: string) {
      const view = this.views.get(id)
      if (view) {
          view.webContents.loadURL(url)
      }
  }

  goBack(id: string) {
      const view = this.views.get(id)
      if (view && view.webContents.canGoBack()) {
          view.webContents.goBack()
      }
  }

  goForward(id: string) {
      const view = this.views.get(id)
      if (view && view.webContents.canGoForward()) {
          view.webContents.goForward()
      }
  }

  reload(id: string) {
      const view = this.views.get(id)
      if (view) {
          view.webContents.reload()
      }
  }

  destroyView(id: string) {
    const view = this.views.get(id)
    if (view) {
      if (this.activeViewId === id) {
        this.mainWindow.removeBrowserView(view)
        this.activeViewId = null
      }
      (view.webContents as any).destroy()
      this.views.delete(id)
    }
  }

  hideActiveView() {
    if (this.activeViewId) {
      const view = this.views.get(this.activeViewId)
      if (view) {
        this.mainWindow.removeBrowserView(view)
      }
    }
  }

  showActiveView() {
    if (this.activeViewId) {
      const view = this.views.get(this.activeViewId)
      if (view) {
        this.mainWindow.setBrowserView(view)
        if (this.currentBounds) {
          view.setBounds(this.currentBounds)
        }
      }
    }
  }


  getViewIdByWebContents(webContents: any): string | undefined {
    for (const [id, view] of this.views) {
      if (view.webContents.id === webContents.id) {
        return id
      }
    }
    return undefined
  }

  // Destroy all views - call on app close for proper cleanup
  destroyAll() {
    for (const [_id, view] of this.views) {
      try {
        this.mainWindow.removeBrowserView(view);
        (view.webContents as any).destroy()
      } catch {
        // View already destroyed
      }
    }
    this.views.clear()
    this.activeViewId = null
  }
}

export default ViewManager
