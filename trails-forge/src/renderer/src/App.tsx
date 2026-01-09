import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toast, ToastMessage } from './components/Toast'

import { TrailsState, TrailNode, ClosedTrailEntry, DownloadItem, SearchEngine, ContentTheme, SEARCH_ENGINE_URLS } from './types'
import { ArrowClockwiseIcon, HamburgerIcon, ArchiveIcon, DownloadIcon, SettingsIcon, SidebarIcon } from './components/Icons'

const IconButton = ({ onClick, children, title }: { onClick: () => void, children: React.ReactNode, title?: string }) => (
  <button
    onClick={(e) => {
      e.stopPropagation()
      onClick()
    }}
    title={title}
    style={{
      background: 'transparent',
      border: 'none',
      color: '#B0B0B0',
      cursor: 'pointer',
      padding: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '4px',
      transition: 'background 0.15s, color 0.15s'
    }}
    className="icon-btn"
  >
    {children}
  </button>
)

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9)

// URL deduplication: Track recently created trail URLs to prevent duplicates
const recentlyCreatedUrls = new Map<string, number>()

function App(): React.JSX.Element {


  const [adblockEnabled, setAdblockEnabled] = useState(() => localStorage.getItem('adblock') !== 'false')

  const handleToggleAdblock = useCallback(() => {
    setAdblockEnabled(prev => {
      const next = !prev
      localStorage.setItem('adblock', String(next))
      return next
    })
  }, [])

  useEffect(() => {
    // Set Adblock State logic handled in main via IPC or property
    // We'll use a simple invoke
    ; (window as any).api.adblock.set(adblockEnabled)
  }, [adblockEnabled])


  // Menu State
  const [showMainMenu, setShowMainMenu] = useState(false)
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false)

  // Active page state: 'main' shows BrowserViews, others show inline panels
  const [activePage, setActivePage] = useState<'main' | 'settings' | 'downloads' | 'archive'>('main')

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem('sidebar_collapsed') === 'true'
  )

  const handleToggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }, [])

  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'error') => {
    const id = generateId()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const [state, setState] = useState<TrailsState>(() => {
    const saved = localStorage.getItem('browser_state_v1')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Reset downloading state to interrupted as processes are gone
        parsed.downloads = (parsed.downloads || []).map((d: DownloadItem) =>
          d.state === 'progressing' ? { ...d, state: 'interrupted' } : d
        )
        // Ensure settings exist
        if (!parsed.settings) parsed.settings = { searchEngine: 'grok', extensionPaths: [], contentTheme: 'default' }
        if (!parsed.settings.extensionPaths) parsed.settings.extensionPaths = []
        if (!parsed.settings.contentTheme) parsed.settings.contentTheme = 'default'
        // Migration: Ensure type exists
        if (parsed.nodes) {
          Object.values(parsed.nodes).forEach((n: any) => {
            if (!n.type) n.type = 'link'
          })
        }
        // Migration: Add pinnedTabs if missing
        if (!parsed.pinnedTabs) parsed.pinnedTabs = []
        // Migration: Add activePinnedTabId if missing
        if (parsed.activePinnedTabId === undefined) parsed.activePinnedTabId = null
        return parsed
      } catch (err) {
        console.error('Failed to load state', err)
      }
    }
    return {
      nodes: {},
      activeNodeId: null,
      activePinnedTabId: null,
      rootNodeIds: [],
      closedTrails: [],
      downloads: [],
      settings: { searchEngine: 'grok', extensionPaths: [], contentTheme: 'default' },
      selectedNodeIds: [],
      pinnedTabs: []
    }
  })

  // Persist state
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('browser_state_v1', JSON.stringify(state))
    }, 500)
    return () => clearTimeout(timeout)
  }, [state])

  // Hide/Show BrowserView when switching to internal pages
  useEffect(() => {
    const api = (window as any).api
    if (activePage === 'main') {
      api?.trails?.showView?.()
    } else {
      api?.trails?.hideView?.()
    }
  }, [activePage])

  // Request adblock debug info from main process
  useEffect(() => {
    const api = (window as any).api
    // Delay to allow extension to finish loading
    setTimeout(async () => {
      if (api?.trails?.getAdblockDebug) {
        try {
          const debugInfo = await api.trails.getAdblockDebug()
          console.log('[ADBLOCK DEBUG]', debugInfo)
        } catch (e) {
          console.error('[ADBLOCK DEBUG] Failed to get info:', e)
        }
      }
    }, 2000)
  }, [])

  const contentRef = useRef<HTMLDivElement>(null)

  // Load extensions on startup
  useEffect(() => {
    const paths = state.settings.extensionPaths || []
    const api = (window as any).api
    if (!api?.extensions?.load) {
      return
    }
    paths.forEach(async (path) => {
      try {
        await api.extensions.load(path)
      } catch (e) {
        console.error('Failed to restore extension', e)
      }
    })
  }, [])

  // Initialize or Restore Views
  useEffect(() => {
    const initViews = () => {
      if (!contentRef.current) return

      const rect = contentRef.current.getBoundingClientRect()
      const bounds = {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }

      if (state.rootNodeIds.length === 0) {
        // Initialize with default tab
        const id = generateId()
        const newNode: TrailNode = {
          id,
          url: 'https://google.com',
          title: 'New Tab',
          parentId: null,
          children: [],
          timestamp: Date.now(),
          isExpanded: true,
          type: 'link'
        }

        setState(prev => ({
          ...prev,
          nodes: { [id]: newNode },
          rootNodeIds: [id],
          activeNodeId: id
        }))

        try {
          window.api.trails.createTrailView(id, 'https://google.com', bounds)
        } catch (err) {
          console.error('Failed to create initial view:', err)
          showToast('Failed to create browser view')
        }
      } else {
        // Restore existing views
        Object.keys(state.nodes).forEach(id => {
          const node = state.nodes[id]
          if (node && node.type === 'link') {
            try {
              window.api.trails.createTrailView(id, node.url, bounds)
            } catch (err) {
              console.error(`Failed to restore view ${id}:`, err)
            }
          }
        })
        if (state.activeNodeId) {
          window.api.trails.setActiveView(state.activeNodeId)
        }
      }
    }

    // Small delay to ensure layout is computed
    const timer = setTimeout(initViews, 100)
    return () => clearTimeout(timer)
  }, []) // Run once on mount

  // Update bounds logic with ResizeObserver for Sidebar resizing
  useEffect(() => {
    const updateBounds = () => {
      if (contentRef.current && state.activeNodeId) {
        const rect = contentRef.current.getBoundingClientRect()
        window.api.trails.updateViewBounds({
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        })
      }
    }

    updateBounds()

    // Observe size changes (Sidebar resize)
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateBounds)
    })

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }

    window.addEventListener('resize', updateBounds)
    return () => {
      window.removeEventListener('resize', updateBounds)
      resizeObserver.disconnect()
    }
  }, [state.activeNodeId, sidebarCollapsed])


  // Handle IPC Events (Title, Navigation, New Windows)
  useEffect(() => {
    window.api.trails.onViewTitleUpdated((_, { id, title }) => {
      setState(prev => {
        // Update trail node if exists
        const node = prev.nodes[id]
        const updatedNodes = node
          ? { ...prev.nodes, [id]: { ...node, title } }
          : prev.nodes

        // Also update pinned tab if this is a pinned tab view
        const updatedPinnedTabs = prev.pinnedTabs.map(tab =>
          tab.id === id ? { ...tab, title } : tab
        )

        return {
          ...prev,
          nodes: updatedNodes,
          pinnedTabs: updatedPinnedTabs
        }
      })
    })

    window.api.trails.onViewNavigated((_, { id, url }) => {
      setState(prev => {
        const node = prev.nodes[id]
        if (!node) return prev
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [id]: { ...node, url }
          }
        }
      })
    })

    window.api.trails.onViewNewWindow((_, { sourceId, url }) => {
      // Deduplicate: Skip if this URL was recently created (within 1 second)
      const now = Date.now()
      const lastCreated = recentlyCreatedUrls.get(url)
      if (lastCreated && now - lastCreated < 1000) {
        return
      }
      recentlyCreatedUrls.set(url, now)
      // Cleanup old entries
      for (const [u, t] of recentlyCreatedUrls) {
        if (now - t > 2000) recentlyCreatedUrls.delete(u)
      }

      const newId = generateId()

      setState(prev => {
        const sourceNode = prev.nodes[sourceId]

        // Check if source is a pinned tab (not in nodes)
        const isPinnedTab = prev.pinnedTabs.some(tab => tab.id === sourceId)

        if (!sourceNode || isPinnedTab) {
          // Source is a pinned tab or unknown - create root trail
          const newNode: TrailNode = {
            id: newId,
            url,
            title: url,
            parentId: null,
            children: [],
            timestamp: Date.now(),
            isExpanded: true,
            type: 'link'
          }
          return {
            ...prev,
            nodes: { ...prev.nodes, [newId]: newNode },
            rootNodeIds: [...prev.rootNodeIds, newId],
            activeNodeId: newId,
            activePinnedTabId: null  // Switch away from pinned tab
          }
        }

        // Source is a regular trail - create sub-trail
        const newNode: TrailNode = {
          id: newId,
          url,
          title: url,
          parentId: sourceId,
          children: [],
          timestamp: Date.now(),
          isExpanded: true,
          type: 'link'
        }

        // Prevent duplicate children
        if (sourceNode.children.includes(newId)) return prev
        const updatedSource = {
          ...sourceNode,
          children: [...sourceNode.children, newId],
          isExpanded: true
        }
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [sourceId]: updatedSource,
            [newId]: newNode
          },
          rootNodeIds: prev.rootNodeIds,
          activeNodeId: newId,
          activePinnedTabId: null  // Switch away from pinned tab
        }
      })

      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect()
        window.api.trails.createTrailView(newId, url, {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        })
        window.api.trails.setActiveView(newId)
      }
    })

    window.api.trails.onViewFaviconUpdated((_, { id, favicon }) => {
      console.log('[FAVICON] Received for id:', id, 'favicon:', favicon)
      setState(prev => {
        // Update trail node if exists
        const node = prev.nodes[id]
        const updatedNodes = node
          ? { ...prev.nodes, [id]: { ...node, favicon } }
          : prev.nodes

        // Also update pinned tab if this is a pinned tab view
        const updatedPinnedTabs = prev.pinnedTabs.map(tab =>
          tab.id === id ? { ...tab, favicon } : tab
        )

        return {
          ...prev,
          nodes: updatedNodes,
          pinnedTabs: updatedPinnedTabs
        }
      })
    })

    // AUTOMATIC SUB-TRAIL CREATION: Every link click creates a child trail
    window.api.trails.onViewLinkClicked((_, { sourceId, url }) => {
      // Deduplicate: Skip if this URL was recently created (within 1 second)
      const now = Date.now()
      const lastCreated = recentlyCreatedUrls.get(url)
      if (lastCreated && now - lastCreated < 1000) {
        return
      }
      recentlyCreatedUrls.set(url, now)
      // Cleanup old entries
      for (const [u, t] of recentlyCreatedUrls) {
        if (now - t > 2000) recentlyCreatedUrls.delete(u)
      }

      const newId = generateId()

      setState(prev => {
        const sourceNode = prev.nodes[sourceId]

        // Check if source is a pinned tab (not in nodes)
        const isPinnedTab = prev.pinnedTabs.some(tab => tab.id === sourceId)

        if (!sourceNode || isPinnedTab) {
          // Source is a pinned tab or unknown - create root trail
          const newNode: TrailNode = {
            id: newId,
            url,
            title: url,
            parentId: null,
            children: [],
            timestamp: Date.now(),
            isExpanded: true,
            type: 'link'
          }
          return {
            ...prev,
            nodes: { ...prev.nodes, [newId]: newNode },
            rootNodeIds: [...prev.rootNodeIds, newId],
            activeNodeId: newId,
            activePinnedTabId: null  // Switch away from pinned tab
          }
        }

        // Source is a regular trail - create sub-trail
        const newNode: TrailNode = {
          id: newId,
          url,
          title: url,
          parentId: sourceId,
          children: [],
          timestamp: Date.now(),
          isExpanded: true,
          type: 'link'
        }

        const updatedSource = {
          ...sourceNode,
          children: [...sourceNode.children, newId],
          isExpanded: true
        }

        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [sourceId]: updatedSource,
            [newId]: newNode
          },
          activeNodeId: newId,
          activePinnedTabId: null  // Switch away from pinned tab
        }
      })

      // Create the BrowserView for the new trail
      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect()
        window.api.trails.createTrailView(newId, url, {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        })
        window.api.trails.setActiveView(newId)
      }
    })

    // Context menu: Open link in new trail (creates root trail)
    window.api.trails.onContextOpenInNewTrail((_, { url }) => {
      const newId = generateId()
      const newNode: TrailNode = {
        id: newId,
        url,
        title: url,
        parentId: null,
        children: [],
        timestamp: Date.now(),
        isExpanded: true,
        type: 'link'
      }

      setState(prev => ({
        ...prev,
        nodes: { ...prev.nodes, [newId]: newNode },
        rootNodeIds: [...prev.rootNodeIds, newId],
        activeNodeId: newId
      }))

      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect()
        window.api.trails.createTrailView(newId, url, {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        })
        window.api.trails.setActiveView(newId)
      }
    })

    // Context menu: Open link as sub-trail (creates child under source trail)
    window.api.trails.onContextOpenAsSubTrail((_, { sourceId, url }) => {
      const newId = generateId()
      const newNode: TrailNode = {
        id: newId,
        url,
        title: url,
        parentId: sourceId,
        children: [],
        timestamp: Date.now(),
        isExpanded: true,
        type: 'link'
      }

      setState(prev => {
        const sourceNode = prev.nodes[sourceId]
        if (!sourceNode) {
          // If source not found, create as root trail
          return {
            ...prev,
            nodes: { ...prev.nodes, [newId]: { ...newNode, parentId: null } },
            rootNodeIds: [...prev.rootNodeIds, newId],
            activeNodeId: newId
          }
        }

        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [sourceId]: {
              ...sourceNode,
              children: [...sourceNode.children, newId],
              isExpanded: true
            },
            [newId]: newNode
          },
          activeNodeId: newId
        }
      })

      if (contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect()
        window.api.trails.createTrailView(newId, url, {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        })
        window.api.trails.setActiveView(newId)
      }
    })

    // Download event listeners
    window.api.trails.onDownloadStarted((_, data) => {
      const download = data as DownloadItem
      setState(prev => ({
        ...prev,
        downloads: [download, ...prev.downloads]
      }))
      // Show toast notification
      setToasts(prev => [...prev, {
        id: `download-${download.id}`,
        message: `⬇️ Downloading: ${download.filename}`,
        type: 'success'
      }])
    })

    window.api.trails.onDownloadProgress((_, data) => {
      const { id, receivedBytes, totalBytes, state: downloadState } = data as { id: string; receivedBytes: number; totalBytes: number; state: string }
      setState(prev => ({
        ...prev,
        downloads: prev.downloads.map(d =>
          d.id === id ? { ...d, receivedBytes, totalBytes, state: downloadState as DownloadItem['state'] } : d
        )
      }))
    })

    window.api.trails.onDownloadDone((_, data) => {
      const { id, state: downloadState, savePath } = data as { id: string; state: string; savePath: string }
      setState(prev => ({
        ...prev,
        downloads: prev.downloads.map(d =>
          d.id === id ? { ...d, state: downloadState as DownloadItem['state'], savePath } : d
        )
      }))
    })

    // Settings change handlers - receive from settings page
    window.api.settings.onSearchEngineChanged((_, engine) => {
      setState(prev => ({
        ...prev,
        settings: { ...prev.settings, searchEngine: engine as SearchEngine }
      }))
    })

    window.api.settings.onAdblockChanged((_, enabled) => {
      setAdblockEnabled(enabled)
      window.api.adblock.set(enabled)
      localStorage.setItem('adblock', String(enabled))
    })

    // Media event handlers
    window.api.trails.onMediaPlaying((_, { id, title }) => {
      setState(prev => ({
        ...prev,
        currentMedia: {
          trailId: id,
          title: title || prev.nodes[id]?.title || 'Playing',
          thumbnail: prev.nodes[id]?.favicon || null,
          isPlaying: true,
          currentTime: 0,
          duration: 0
        },
        nodes: {
          ...prev.nodes,
          [id]: { ...prev.nodes[id], isPlayingAudio: true }
        }
      }))
    })

    window.api.trails.onMediaPaused((_, { id }) => {
      setState(prev => {
        const updatedMedia = prev.currentMedia && prev.currentMedia.trailId === id
          ? { ...prev.currentMedia, isPlaying: false } as const
          : prev.currentMedia
        return {
          ...prev,
          currentMedia: updatedMedia ? { ...updatedMedia, isPlaying: updatedMedia.isPlaying } : undefined,
          nodes: {
            ...prev.nodes,
            [id]: prev.nodes[id] ? { ...prev.nodes[id], isPlayingAudio: false } : prev.nodes[id]
          }
        }
      })
    })

    window.api.trails.onMediaUpdate((_, data) => {
      const mediaState = data as { isPlaying: boolean; currentTime: number; duration: number; volume: number; id?: string }
      const id = (data as any).id
      if (!id) return;

      setState(prev => {
        const current = prev.currentMedia
        if (current && current.trailId === id) {
          return {
            ...prev,
            currentMedia: {
              ...current,
              isPlaying: mediaState.isPlaying,
              currentTime: mediaState.currentTime,
              duration: mediaState.duration
            }
          }
        } else if (mediaState.isPlaying && (!current || !current.isPlaying)) {
          const node = prev.nodes[id]
          return {
            ...prev,
            currentMedia: {
              trailId: id,
              title: node?.title || 'Media',
              thumbnail: node?.favicon || null,
              isPlaying: true,
              currentTime: mediaState.currentTime,
              duration: mediaState.duration
            },
            nodes: {
              ...prev.nodes,
              [id]: prev.nodes[id] ? { ...prev.nodes[id], isPlayingAudio: true } : prev.nodes[id]
            }
          }
        }
        return prev
      })
    })

    // Fullscreen listeners for video
    window.api.trails.onFullscreenEnter(() => {
      setIsVideoFullscreen(true)
    })

    window.api.trails.onFullscreenLeave(() => {
      setIsVideoFullscreen(false)
    })

    return () => {
      window.api.trails.removeAllListeners()
    }
  }, [])




  const handleNodeClick = useCallback((id: string) => {
    const node = state.nodes[id]

    // For folders/areas, just toggle without navigation
    if (node?.type === 'folder' || node?.type === 'area') {
      setState(prev => ({
        ...prev,
        activeNodeId: id,
        nodes: {
          ...prev.nodes,
          [id]: { ...prev.nodes[id], isExpanded: !prev.nodes[id].isExpanded }
        }
      }))
      return
    }

    // For links, just switch to that view (don't reload/navigate)
    setState(prev => ({ ...prev, activeNodeId: id, selectedNodeIds: [] }))
    window.api.trails.setActiveView(id)
  }, [state.nodes])

  const handleToggleExpand = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [id]: { ...prev.nodes[id], isExpanded: !prev.nodes[id].isExpanded }
      }
    }))
  }, [])

  const handleBack = useCallback(() => {
    if (state.activeNodeId) {
      window.api.trails.goBack(state.activeNodeId)
    }
  }, [state.activeNodeId])

  const handleForward = useCallback(() => {
    if (state.activeNodeId) {
      window.api.trails.goForward(state.activeNodeId)
    }
  }, [state.activeNodeId])

  const handleReload = useCallback(() => {
    if (state.activeNodeId) {
      window.api.trails.reload(state.activeNodeId)
    }
  }, [state.activeNodeId])

  const handleAddTrail = useCallback((initialInput?: string) => {
    const id = generateId()

    let startUrl = 'https://grok.com' // DefaultFallback

    // Determine start URL based on input
    if (initialInput) {
      // Simple heuristic: if it has a dot and no spaces, assume URL. Otherwise search.
      // Or if it starts with http/https.
      const hasProtocol = initialInput.startsWith('http://') || initialInput.startsWith('https://') || initialInput.startsWith('file://')
      const hasSpace = initialInput.includes(' ')
      const hasDot = initialInput.includes('.')

      if (hasProtocol) {
        startUrl = initialInput
      } else if (hasDot && !hasSpace) {
        startUrl = 'https://' + initialInput
      } else {
        // Search
        if (state.settings.searchEngine === 'google') startUrl = `https://google.com/search?q=${encodeURIComponent(initialInput)}`
        else if (state.settings.searchEngine === 'duckduckgo') startUrl = `https://duckduckgo.com/?q=${encodeURIComponent(initialInput)}`
        else if (state.settings.searchEngine === 'bing') startUrl = `https://bing.com/search?q=${encodeURIComponent(initialInput)}`
        else if (state.settings.searchEngine === 'ecosia') startUrl = `https://www.ecosia.org/search?q=${encodeURIComponent(initialInput)}`
        else startUrl = `https://grok.com/search?q=${encodeURIComponent(initialInput)}`
      }
    } else {
      // No input -> New Tab Page
      if (state.settings.searchEngine === 'google') startUrl = 'https://google.com'
      else if (state.settings.searchEngine === 'duckduckgo') startUrl = 'https://duckduckgo.com'
      else if (state.settings.searchEngine === 'bing') startUrl = 'https://bing.com'
      else if (state.settings.searchEngine === 'ecosia') startUrl = 'https://ecosia.org'
      else startUrl = 'https://grok.com'
    }


    const newNode: TrailNode = {
      id,
      url: startUrl,
      title: initialInput || 'New Tab',
      parentId: null,
      children: [],
      timestamp: Date.now(),
      isExpanded: true,
      type: 'link'
    }

    setState(prev => ({
      ...prev,
      nodes: { ...prev.nodes, [id]: newNode },
      rootNodeIds: [...prev.rootNodeIds, id],
      activeNodeId: id
    }))

    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      window.api.trails.createTrailView(id, startUrl, {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      })
      window.api.trails.setActiveView(id)
    }
  }, [state.settings.searchEngine])

  const handleAddSubTrail = useCallback((parentId: string) => {
    const id = generateId()
    let startUrl = 'https://grok.com'
    if (state.settings.searchEngine === 'google') startUrl = 'https://google.com'
    else if (state.settings.searchEngine === 'duckduckgo') startUrl = 'https://duckduckgo.com'
    else if (state.settings.searchEngine === 'bing') startUrl = 'https://bing.com'
    else if (state.settings.searchEngine === 'ecosia') startUrl = 'https://ecosia.org'

    const newNode: TrailNode = {
      id,
      url: startUrl,
      title: 'New Tab',
      parentId,
      children: [],
      timestamp: Date.now(),
      isExpanded: true,
      type: 'link'
    }

    setState(prev => {
      const parent = prev.nodes[parentId]
      if (!parent) return prev
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [parentId]: { ...parent, children: [...parent.children, id], isExpanded: true },
          [id]: newNode
        },
        activeNodeId: id
      }
    })

    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      window.api.trails.createTrailView(id, startUrl, {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      })
      window.api.trails.setActiveView(id)
    }
  }, [state.settings.searchEngine])

  const handleAddFolder = useCallback(() => {
    const id = generateId()
    const newNode: TrailNode = {
      id,
      url: '',
      title: 'New Folder',
      parentId: null,
      children: [],
      timestamp: Date.now(),
      isExpanded: true,
      type: 'folder'
    }

    setState(prev => ({
      ...prev,
      nodes: { ...prev.nodes, [id]: newNode },
      rootNodeIds: [...prev.rootNodeIds, id]
    }))
  }, [])

  // Open internal pages (settings, downloads, archive) as trail nodes
  const handleOpenInternalPage = useCallback((page: 'settings' | 'downloads' | 'archive') => {
    const id = generateId()
    const pageInfo = {
      settings: { url: 'trails://settings', title: '⚙️ Settings' },
      downloads: { url: 'trails://downloads', title: '📥 Downloads' },
      archive: { url: 'trails://archive', title: '📁 Archive' }
    }
    const { url, title } = pageInfo[page]

    const newNode: TrailNode = {
      id,
      url,
      title,
      parentId: null,
      children: [],
      timestamp: Date.now(),
      isExpanded: true,
      type: 'link'
    }

    setState(prev => ({
      ...prev,
      nodes: { ...prev.nodes, [id]: newNode },
      rootNodeIds: [...prev.rootNodeIds, id],
      activeNodeId: id,
      activePinnedTabId: null
    }))

    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      window.api.trails.createTrailView(id, url, {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      })
      window.api.trails.setActiveView(id)
    }
  }, [])

  const handleMoveTrail = useCallback((draggedId: string, targetId: string, position: 'inside' | 'before' | 'after') => {


    setState(prev => {
      const draggedNode = prev.nodes[draggedId]
      const targetNode = prev.nodes[targetId]

      // Basic validation
      if (!draggedNode || !targetNode || draggedId === targetId) {
        return prev
      }

      // Determine the new parent based on position
      let newParentId: string | null
      if (position === 'inside') {
        newParentId = targetId
      } else {
        newParentId = targetNode.parentId
      }

      // VALIDATION: Check for self-reference (can't be child of self)
      if (newParentId === draggedId) {
        return prev
      }

      // VALIDATION: Check for cycle (can't be child of own descendant)
      if (newParentId) {
        let check: typeof targetNode | undefined = prev.nodes[newParentId]
        while (check) {
          if (check.id === draggedId) {
            return prev
          }
          check = check.parentId ? prev.nodes[check.parentId] : undefined
        }
      }

      // All validations passed - now do the actual move
      const newNodes = { ...prev.nodes }
      let newRootNodeIds = [...prev.rootNodeIds]

      // Step 1: Remove from old location
      const oldParentId = draggedNode.parentId
      if (oldParentId && newNodes[oldParentId]) {
        newNodes[oldParentId] = {
          ...newNodes[oldParentId],
          children: newNodes[oldParentId].children.filter(id => id !== draggedId)
        }
      }
      newRootNodeIds = newRootNodeIds.filter(id => id !== draggedId)

      // Step 2: Add to new location
      if (position === 'inside') {
        // Add as child of target
        newNodes[targetId] = {
          ...newNodes[targetId],
          children: [...newNodes[targetId].children, draggedId],
          isExpanded: true
        }
        newNodes[draggedId] = { ...draggedNode, parentId: targetId }
      } else {
        // Add as sibling of target
        if (newParentId && newNodes[newParentId]) {
          // Add to parent's children
          const parent = newNodes[newParentId]
          const targetIdx = parent.children.indexOf(targetId)
          const insertIdx = position === 'before' ? targetIdx : targetIdx + 1
          const newChildren = [...parent.children]
          newChildren.splice(insertIdx, 0, draggedId)
          newNodes[newParentId] = { ...parent, children: newChildren }
          newNodes[draggedId] = { ...draggedNode, parentId: newParentId }
        } else {
          // Add to root level
          const targetIdx = newRootNodeIds.indexOf(targetId)
          const insertIdx = position === 'before' ? targetIdx : targetIdx + 1
          newRootNodeIds.splice(insertIdx, 0, draggedId)
          newNodes[draggedId] = { ...draggedNode, parentId: null }
        }
      }

      console.log('[App] Move complete')
      return { ...prev, nodes: newNodes, rootNodeIds: newRootNodeIds }
    })
  }, [])

  // Simple function to move any trail to root level
  const handleMoveToRoot = useCallback((id: string) => {

    setState(prev => {
      const node = prev.nodes[id]
      if (!node) {
        return prev
      }



      // Already at root? Skip
      if (node.parentId === null && prev.rootNodeIds.includes(id)) {
        return prev
      }

      const newNodes = { ...prev.nodes }
      let newRootNodeIds = [...prev.rootNodeIds]

      // Remove from old parent if it has one
      if (node.parentId && newNodes[node.parentId]) {
        const oldParent = newNodes[node.parentId]
        newNodes[node.parentId] = {
          ...oldParent,
          children: oldParent.children.filter(cid => cid !== id)
        }
      }

      // Add to root (at the end)
      if (!newRootNodeIds.includes(id)) {
        newRootNodeIds.push(id)
      }

      // Update the node's parentId to null
      newNodes[id] = { ...node, parentId: null }


      return {
        ...prev,
        nodes: newNodes,
        rootNodeIds: newRootNodeIds
      }
    })
  }, [])

  // Pinned Tabs handlers
  const handlePinTab = useCallback((url: string, title: string, favicon?: string) => {
    setState(prev => {
      // Check if already pinned
      if (prev.pinnedTabs.some(tab => tab.url === url)) {
        return prev
      }
      const newTab = {
        id: generateId(),
        url,
        title,
        favicon
      }
      return { ...prev, pinnedTabs: [...prev.pinnedTabs, newTab] }
    })
  }, [])

  const handleUnpinTab = useCallback((id: string) => {
    setState(prev => {
      // Find the pinned tab being unpinned
      const pinnedTab = prev.pinnedTabs.find(tab => tab.id === id)
      if (!pinnedTab) {
        return {
          ...prev,
          pinnedTabs: prev.pinnedTabs.filter(tab => tab.id !== id)
        }
      }

      // Create a new trail node from the pinned tab
      const newNodeId = generateId()
      const newNode: TrailNode = {
        id: newNodeId,
        url: pinnedTab.url,
        title: pinnedTab.title || pinnedTab.url,
        favicon: pinnedTab.favicon,
        parentId: null,
        children: [],
        timestamp: Date.now(),
        isExpanded: true,
        type: 'link'
      }

      // Create view for the new trail
      const contentBounds = contentRef.current?.getBoundingClientRect()
      if (contentBounds) {
        window.api.trails.createTrailView(newNodeId, pinnedTab.url, {
          x: Math.round(contentBounds.x),
          y: Math.round(contentBounds.y),
          width: Math.round(contentBounds.width),
          height: Math.round(contentBounds.height)
        })
        window.api.trails.setActiveView(newNodeId)
      }

      // Destroy the old pinned tab view
      window.api.trails.destroyView(id)

      return {
        ...prev,
        pinnedTabs: prev.pinnedTabs.filter(tab => tab.id !== id),
        nodes: { ...prev.nodes, [newNodeId]: newNode },
        rootNodeIds: [...prev.rootNodeIds, newNodeId],
        activeNodeId: newNodeId,
        activePinnedTabId: null
      }
    })
  }, [])

  const handleClickPinnedTab = useCallback((pinnedTabId: string) => {
    // Find the pinned tab
    const pinnedTab = state.pinnedTabs.find(t => t.id === pinnedTabId)
    if (!pinnedTab) return

    // Set this pinned tab as active and clear trail selection
    setState(prev => ({
      ...prev,
      activeNodeId: null,  // Deselect any trail
      activePinnedTabId: pinnedTabId
    }))

    // Create or switch to this pinned tab's view
    const contentBounds = contentRef.current?.getBoundingClientRect()
    if (contentBounds) {
      window.api.trails.createTrailView(pinnedTabId, pinnedTab.url, {
        x: Math.round(contentBounds.x),
        y: Math.round(contentBounds.y),
        width: Math.round(contentBounds.width),
        height: Math.round(contentBounds.height)
      })
      window.api.trails.setActiveView(pinnedTabId)
    }
  }, [state.pinnedTabs])

  const handleCloseTrail = useCallback((id: string) => {
    setState(prev => {
      const node = prev.nodes[id]
      if (!node) return prev

      // Don't allow closing locked trails
      if (node.isLocked) return prev

      const newNodes = { ...prev.nodes }
      let newRootNodeIds = [...prev.rootNodeIds]

      // Get the children of this node - they will be promoted
      const childrenIds = node.children

      // Promote children to the parent (or root if no parent)
      const parentId = node.parentId
      if (parentId && newNodes[parentId]) {
        // Add children to grandparent, in place of the closed node
        const parent = newNodes[parentId]
        const nodeIndex = parent.children.indexOf(id)
        const newChildren = [...parent.children]
        newChildren.splice(nodeIndex, 1, ...childrenIds)
        newNodes[parentId] = { ...parent, children: newChildren }

        // Update children's parentId to grandparent
        childrenIds.forEach(childId => {
          if (newNodes[childId]) {
            newNodes[childId] = { ...newNodes[childId], parentId: parentId }
          }
        })
      } else {
        // Node was at root level - promote children to root
        const nodeIndex = newRootNodeIds.indexOf(id)
        newRootNodeIds.splice(nodeIndex, 1, ...childrenIds)

        // Update children's parentId to null (root)
        childrenIds.forEach(childId => {
          if (newNodes[childId]) {
            newNodes[childId] = { ...newNodes[childId], parentId: null }
          }
        })
      }

      // Remove the closed node
      delete newNodes[id]
      newRootNodeIds = newRootNodeIds.filter(rid => rid !== id)

      // Destroy only this view (not children)
      window.api.trails.destroyView(id)

      // Create closed trail entry (only for this node, not descendants)
      const closedEntry: ClosedTrailEntry = {
        id: generateId(),
        closedAt: Date.now(),
        rootNode: { ...node, parentId: null, children: [] },
        allNodes: { [id]: { ...node, parentId: null, children: [] } }
      }

      // Set new active node
      let newActiveNodeId = prev.activeNodeId
      if (prev.activeNodeId === id) {
        // Prefer first child, then parent, then first root
        newActiveNodeId = childrenIds[0] || parentId || newRootNodeIds[0] || null
      }

      // Switch to new active view
      if (newActiveNodeId) {
        window.api.trails.setActiveView(newActiveNodeId)
      }

      return {
        ...prev,
        nodes: newNodes,
        rootNodeIds: newRootNodeIds,
        activeNodeId: newActiveNodeId,
        closedTrails: [closedEntry, ...prev.closedTrails].slice(0, 50)
      }
    })
  }, [])

  // Smart navigation: detect URL vs search term
  const isValidUrl = (input: string): boolean => {
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/
    return urlPattern.test(input) || input.startsWith('http://') || input.startsWith('https://')
  }

  const handleNavigate = useCallback((id: string, input: string) => {
    let url: string
    if (isValidUrl(input)) {
      url = input.startsWith('http') ? input : `https://${input}`
    } else {
      // Use search engine
      url = SEARCH_ENGINE_URLS[state.settings.searchEngine] + encodeURIComponent(input)
    }

    // Duplicate trail prevention: check if URL already exists in another trail
    const existingTrail = Object.values(state.nodes).find(node =>
      node.id !== id &&
      node.url &&
      node.type === 'link' &&
      normalizeUrl(node.url) === normalizeUrl(url)
    )

    if (existingTrail) {
      // Switch to existing trail instead of navigating
      setState(prev => ({ ...prev, activeNodeId: existingTrail.id }))
      window.api.trails.setActiveView(existingTrail.id)
      showToast(`Switched to existing trail: ${existingTrail.title || existingTrail.url}`, 'info')
      return
    }

    window.api.trails.navigateView(id, url)
    setState(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [id]: { ...prev.nodes[id], url }
      }
    }))
  }, [state.settings.searchEngine, state.nodes, showToast])

  // Helper to normalize URLs for comparison (removes trailing slashes, www, protocol variations)
  function normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      // Remove www. prefix and trailing slash
      let host = parsed.hostname.replace(/^www\./, '')
      let path = parsed.pathname.replace(/\/$/, '')
      return `${host}${path}${parsed.search}`.toLowerCase()
    } catch {
      return url.toLowerCase()
    }
  }

  const handleSetSearchEngine = useCallback((engine: SearchEngine) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, searchEngine: engine }
    }))
    window.api.settings.setSearchEngine(engine)
  }, [])

  const handleRenameTrail = useCallback((id: string, customName: string) => {
    // Check if this is a navigation intent
    const node = state.nodes[id]
    if (node && node.type === 'link') {
      // If valid URL or search, navigate instead of renaming (Omnibox behavior)
      // We pass the input to handleNavigate which handles URL validation/search construction
      handleNavigate(id, customName)

      // Clear customName if it was set, so the node reflects the new page title
      setState(prev => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: { ...prev.nodes[id], customName: undefined }
        }
      }))
    } else {
      // Folder: just rename
      setState(prev => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: { ...prev.nodes[id], customName }
        }
      }))
    }
  }, [state.nodes, handleNavigate])

  const handleToggleLock = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [id]: { ...prev.nodes[id], isLocked: !prev.nodes[id].isLocked }
      }
    }))
  }, [])

  const handleSetEmoji = useCallback((id: string, emoji: string) => {
    setState(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [id]: { ...prev.nodes[id], emoji: emoji || undefined }
      }
    }))
  }, [])

  const handleAddArea = useCallback(() => {
    const id = generateId()
    const newNode: TrailNode = {
      id,
      url: '',
      title: '— Section —',
      parentId: null,
      children: [],
      timestamp: Date.now(),
      isExpanded: true,
      isArea: true,
      type: 'area'
    }

    setState(prev => ({
      ...prev,
      nodes: { ...prev.nodes, [id]: newNode },
      rootNodeIds: [...prev.rootNodeIds, id]
    }))
  }, [])

  const handleToggleSelect = useCallback((id: string) => {
    setState(prev => {
      const isSelected = prev.selectedNodeIds.includes(id)
      return {
        ...prev,
        selectedNodeIds: isSelected
          ? prev.selectedNodeIds.filter(sid => sid !== id)
          : [...prev.selectedNodeIds, id]
      }
    })
  }, [])

  const handleBulkDelete = useCallback(() => {
    setState(prev => {
      const idsToDelete = new Set(prev.selectedNodeIds.filter(id => !prev.nodes[id]?.isLocked))
      if (idsToDelete.size === 0) return prev

      let newNodes = { ...prev.nodes }
      let newRootNodeIds = [...prev.rootNodeIds]

      idsToDelete.forEach(id => {
        const node = newNodes[id]
        if (!node) return

        // Remove from parent's children
        if (node.parentId && newNodes[node.parentId]) {
          newNodes[node.parentId] = {
            ...newNodes[node.parentId],
            children: newNodes[node.parentId].children.filter(cid => cid !== id)
          }
        } else {
          newRootNodeIds = newRootNodeIds.filter(rid => rid !== id)
        }

        // Destroy view if link
        if (node.type === 'link') {
          window.api.trails.destroyView(id)
        }

        delete newNodes[id]
      })

      return {
        ...prev,
        nodes: newNodes,
        rootNodeIds: newRootNodeIds,
        selectedNodeIds: [],
        activeNodeId: idsToDelete.has(prev.activeNodeId || '') ? newRootNodeIds[0] || null : prev.activeNodeId
      }
    })
  }, [])



  const handleRestoreClosedTrail = useCallback((entryId: string) => {
    const entry = state.closedTrails.find(e => e.id === entryId)
    if (!entry) return

    // Generate new IDs for all nodes
    const idMap: Record<string, string> = {}
    Object.keys(entry.allNodes).forEach(oldId => {
      idMap[oldId] = generateId()
    })

    // Clone nodes with new IDs
    const newNodes: Record<string, TrailNode> = {}
    Object.entries(entry.allNodes).forEach(([oldId, node]) => {
      const newId = idMap[oldId]
      newNodes[newId] = {
        ...node,
        id: newId,
        parentId: node.parentId ? idMap[node.parentId] : null,
        children: node.children.map(cid => idMap[cid])
      }
    })

    const newRootId = idMap[entry.rootNode.id]

    setState(prev => ({
      ...prev,
      nodes: { ...prev.nodes, ...newNodes },
      rootNodeIds: [...prev.rootNodeIds, newRootId],
      activeNodeId: newRootId,
      closedTrails: prev.closedTrails.filter(e => e.id !== entryId)
    }))

    // Create BrowserViews for all nodes
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect()
      const bounds = {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      }

      Object.entries(newNodes).forEach(([newId, node]) => {
        window.api.trails.createTrailView(newId, node.url, bounds)
      })
      window.api.trails.setActiveView(newRootId)
    }
  }, [state.closedTrails])

  // Sync closed trails to main process for archive page
  useEffect(() => {
    if (window.api?.archive?.sync) {
      window.api.archive.sync(state.closedTrails)
    }
  }, [state.closedTrails])

  const handleClearHistoryItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      closedTrails: prev.closedTrails.filter(e => e.id !== id)
    }))
  }, [])

  const handleClearAllHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      closedTrails: []
    }))
  }, [])

  // Listen for archive page IPC events (restore/delete/clearAll from archive.html page)
  useEffect(() => {
    if (window.api?.archive) {
      window.api.archive.onRestoreTrail((_event, id) => {
        handleRestoreClosedTrail(id)
      })

      window.api.archive.onDeleteTrail((_event, id) => {
        handleClearHistoryItem(id)
      })

      window.api.archive.onClearAll(() => {
        handleClearAllHistory()
      })
    }
  }, [handleRestoreClosedTrail, handleClearHistoryItem, handleClearAllHistory])

  // Keyboard shortcuts (placed after all handler definitions)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return

      // Cmd/Ctrl + T = New Trail
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        handleAddTrail()
      }
      // Cmd/Ctrl + W = Close active trail
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        if (state.activeNodeId) {
          handleCloseTrail(state.activeNodeId)
        }
      }
      // Escape = Clear selection
      if (e.key === 'Escape') {
        setState(prev => ({ ...prev, selectedNodeIds: [] }))
      }
      // Delete/Backspace = Bulk delete if selection exists
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedNodeIds.length > 0) {
        e.preventDefault()
        handleBulkDelete()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.activeNodeId, state.selectedNodeIds, handleAddTrail, handleCloseTrail, handleBulkDelete])

  // Close main menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMainMenu(false)
    if (showMainMenu) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMainMenu])


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'transparent' }}>
      {/* Draggable Title Bar - compact height */}
      <div
        style={{
          height: '32px',
          width: '100%',
          backgroundColor: 'rgba(18, 18, 18, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          WebkitAppRegion: 'drag',
          flexShrink: 0,
          display: isVideoFullscreen ? 'none' : 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
          zIndex: 10000
        } as any}
      >
        <div style={{ WebkitAppRegion: 'no-drag', position: 'relative' } as any}>
          <IconButton onClick={() => setShowMainMenu(prev => !prev)} title="Menu">
            <HamburgerIcon />
          </IconButton>
          {showMainMenu && (
            <div
              className="context-menu-glass"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                padding: '4px',
                zIndex: 9999,
                minWidth: '140px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                onClick={() => {
                  setShowMainMenu(false)
                  handleOpenInternalPage('settings')
                }}
                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', fontSize: '13px' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3a3a3a')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <SettingsIcon /> Settings
              </div>
              <div
                onClick={() => {
                  setShowMainMenu(false)
                  handleOpenInternalPage('archive')
                }}
                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', fontSize: '13px' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3a3a3a')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <ArchiveIcon /> Archive
              </div>
              <div
                onClick={() => {
                  setShowMainMenu(false)
                  handleOpenInternalPage('downloads')
                }}
                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF', fontSize: '13px' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3a3a3a')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <DownloadIcon /> Downloads
              </div>
            </div>
          )}
        </div>
        <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', gap: '2px' } as any}>
          <IconButton onClick={handleReload} title="Reload">
            <ArrowClockwiseIcon />
          </IconButton>
          <IconButton onClick={handleToggleSidebarCollapse} title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            <SidebarIcon />
          </IconButton>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {!isVideoFullscreen && <Sidebar
          nodes={state.nodes}
          rootNodeIds={state.rootNodeIds}
          activeNodeId={state.activeNodeId}
          selectedNodeIds={state.selectedNodeIds}
          closedTrails={state.closedTrails}
          downloads={state.downloads}
          settings={state.settings}
          onNodeClick={handleNodeClick}
          onToggleExpand={handleToggleExpand}
          onBack={handleBack}
          onForward={handleForward}
          onReload={handleReload}
          onAddTrail={handleAddTrail}
          onCloseTrail={handleCloseTrail}
          onNavigate={handleNavigate}
          onRenameTrail={handleRenameTrail}
          onRestoreClosedTrail={handleRestoreClosedTrail}
          onSetSearchEngine={handleSetSearchEngine}
          onAddSubTrail={handleAddSubTrail}
          onAddFolder={handleAddFolder}
          onMoveTrail={handleMoveTrail}
          onMoveToRoot={handleMoveToRoot}
          onToggleLock={handleToggleLock}
          onSetEmoji={handleSetEmoji}
          onAddArea={handleAddArea}
          onToggleSelect={handleToggleSelect}
          onBulkDelete={handleBulkDelete}
          adblockEnabled={adblockEnabled}
          onToggleAdblock={handleToggleAdblock}
          onClearHistoryItem={handleClearHistoryItem}
          onClearAllHistory={handleClearAllHistory}
          currentMedia={state.currentMedia}
          onMediaPlay={() => state.currentMedia && window.api.trails.mediaControl(state.currentMedia.trailId, 'play')}
          onMediaPause={() => state.currentMedia && window.api.trails.mediaControl(state.currentMedia.trailId, 'pause')}
          onMediaSeekForward={() => state.currentMedia && window.api.trails.mediaControl(state.currentMedia.trailId, 'forward')}
          onMediaSeekBackward={() => state.currentMedia && window.api.trails.mediaControl(state.currentMedia.trailId, 'backward')}

          onMediaClose={() => setState(prev => ({ ...prev, currentMedia: undefined }))}
          isCollapsed={sidebarCollapsed}
          pinnedTabs={state.pinnedTabs}
          activePinnedTabId={state.activePinnedTabId}
          onClickPinnedTab={handleClickPinnedTab}
          onUnpinTab={handleUnpinTab}
          onPinTab={handlePinTab}
        />}
        <div ref={contentRef} style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>
          {/* BrowserView sits here when activePage is 'main' */}

          {/* Inline Settings Panel */}
          {activePage === 'settings' && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: '#121212', color: '#E0E0E0', overflow: 'auto', padding: '40px' }}>
              <button onClick={() => setActivePage('main')} style={{ background: '#2a2a2a', border: 'none', color: '#E0E0E0', padding: '8px 16px', borderRadius: '6px', marginBottom: '24px', cursor: 'pointer' }}>← Back</button>
              <h1 style={{ fontSize: '28px', fontWeight: 500, color: '#FC93AD', marginBottom: '32px' }}>⚙️ Settings</h1>
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#B0B0B0', marginBottom: '16px' }}>Search</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1E1E1E', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '15px' }}>Default Search Engine</div>
                    <div style={{ fontSize: '13px', color: '#B0B0B0', marginTop: '4px' }}>Choose your preferred search engine for new trails</div>
                  </div>
                  <select
                    value={state.settings.searchEngine}
                    onChange={(e) => handleSetSearchEngine(e.target.value as SearchEngine)}
                    style={{ background: '#2a2a2a', color: '#E0E0E0', border: '1px solid #444444', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', minWidth: '150px' }}
                  >
                    <option value="grok">Grok</option>
                    <option value="google">Google</option>
                    <option value="duckduckgo">DuckDuckGo</option>
                    <option value="bing">Bing</option>
                    <option value="ecosia">Ecosia</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#B0B0B0', marginBottom: '16px' }}>Appearance</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1E1E1E', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '15px' }}>Content Theme</div>
                    <div style={{ fontSize: '13px', color: '#B0B0B0', marginTop: '4px' }}>Force light or dark mode on websites</div>
                  </div>
                  <select
                    value={state.settings.contentTheme}
                    onChange={(e) => {
                      const theme = e.target.value as ContentTheme
                      setState(prev => ({ ...prev, settings: { ...prev.settings, contentTheme: theme } }))
                        ; (window as any).api?.trails?.setContentTheme?.(theme)
                    }}
                    style={{ background: '#2a2a2a', color: '#E0E0E0', border: '1px solid #444444', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', minWidth: '150px' }}
                  >
                    <option value="default">System Default</option>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#B0B0B0', marginBottom: '16px' }}>Privacy</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1E1E1E', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '15px' }}>Content Blocking (uBlock Origin)</div>
                    <div style={{ fontSize: '13px', color: '#B0B0B0', marginTop: '4px' }}>Block ads and trackers for a faster browsing experience</div>
                  </div>
                  <div
                    onClick={handleToggleAdblock}
                    style={{ width: '44px', height: '24px', background: adblockEnabled ? '#FC93AD' : '#444444', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: adblockEnabled ? '22px' : '2px', transition: 'left 0.2s' }} />
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center', color: '#B0B0B0', fontSize: '13px', marginTop: '48px' }}>Trails Browser v1.0.0</div>
            </div>
          )}

          {/* Inline Downloads Panel */}
          {activePage === 'downloads' && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: '#121212', color: '#E0E0E0', overflow: 'auto', padding: '40px' }}>
              <button onClick={() => setActivePage('main')} style={{ background: '#2a2a2a', border: 'none', color: '#E0E0E0', padding: '8px 16px', borderRadius: '6px', marginBottom: '24px', cursor: 'pointer' }}>← Back</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 500, color: '#FC93AD', margin: 0 }}>📥 Downloads</h1>
                {state.downloads.length > 0 && (
                  <button onClick={() => setState(prev => ({ ...prev, downloads: [] }))} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Clear All</button>
                )}
              </div>
              {state.downloads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#B0B0B0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📥</div>
                  <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#E0E0E0' }}>No downloads yet</h2>
                  <p>Your downloads will appear here</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {state.downloads.map((d) => (
                    <div key={d.id} style={{ background: '#1E1E1E', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '15px', fontWeight: 500 }}>{d.filename}</div>
                          <div style={{ fontSize: '12px', color: '#B0B0B0', marginTop: '4px', wordBreak: 'break-all' }}>{d.savePath || d.url}</div>
                          <div style={{ fontSize: '12px', color: d.state === 'completed' ? '#22c55e' : d.state === 'interrupted' ? '#ef4444' : '#FC93AD', marginTop: '8px' }}>
                            {d.state === 'progressing' ? `Downloading... ${Math.round((d.receivedBytes / d.totalBytes) * 100)}%` : d.state.charAt(0).toUpperCase() + d.state.slice(1)}
                          </div>
                        </div>
                        <button onClick={() => setState(prev => ({ ...prev, downloads: prev.downloads.filter(dl => dl.id !== d.id) }))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px', padding: '4px' }} title="Remove">✕</button>
                      </div>
                      {d.state === 'completed' && d.savePath && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          <button onClick={() => (window as any).api?.trails?.openPath?.(d.savePath)} style={{ background: '#2a2a2a', border: 'none', color: '#E0E0E0', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📂 Open File</button>
                          <button onClick={() => (window as any).api?.trails?.showInFolder?.(d.savePath)} style={{ background: '#2a2a2a', border: 'none', color: '#E0E0E0', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>📁 Show in Folder</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Inline Archive Panel */}
          {activePage === 'archive' && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: '#121212', color: '#E0E0E0', overflow: 'auto', padding: '40px' }}>
              <button onClick={() => setActivePage('main')} style={{ background: '#2a2a2a', border: 'none', color: '#E0E0E0', padding: '8px 16px', borderRadius: '6px', marginBottom: '24px', cursor: 'pointer' }}>← Back</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 500, color: '#FC93AD', margin: 0 }}>📦 Archive</h1>
                {state.closedTrails.length > 0 && (
                  <button onClick={handleClearAllHistory} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Clear All</button>
                )}
              </div>
              {state.closedTrails.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#B0B0B0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                  <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#E0E0E0' }}>No archived trails</h2>
                  <p>Closed trails will appear here</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {state.closedTrails.map((entry) => (
                    <div key={entry.id} style={{ background: '#1E1E1E', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div onClick={() => { handleRestoreClosedTrail(entry.id); setActivePage('main'); }} style={{ cursor: 'pointer', flex: 1 }}>
                        <div style={{ fontSize: '14px' }}>{entry.rootNode.title || 'Untitled'}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>{entry.rootNode.url}</div>
                      </div>
                      <button onClick={() => setState(prev => ({ ...prev, closedTrails: prev.closedTrails.filter(t => t.id !== entry.id) }))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px', padding: '4px' }} title="Delete">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>



      {/* Toast Notifications */}
      <Toast messages={toasts} onDismiss={dismissToast} />
    </div >
  )
}

export default App
