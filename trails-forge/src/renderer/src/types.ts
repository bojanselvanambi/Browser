export interface TrailNode {
  id: string
  url: string
  title: string
  customName?: string
  emoji?: string           // Emoji prefix for visual flair
  favicon?: string
  parentId: string | null
  children: string[]
  timestamp: number
  isExpanded?: boolean
  isLocked?: boolean       // Prevent deletion/drag
  isArea?: boolean         // Section divider (non-interactive header)
  isPlayingAudio?: boolean // Currently playing audio/video
  type: 'link' | 'folder' | 'area'
}

export interface ClosedTrailEntry {
  id: string
  closedAt: number
  rootNode: TrailNode
  allNodes: Record<string, TrailNode>
}

export interface DownloadItem {
  id: string
  filename: string
  url: string
  savePath: string
  receivedBytes: number
  totalBytes: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted'
  startTime: number
}

export interface MediaState {
  trailId: string
  title: string
  thumbnail: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
}

export type SearchEngine = 'grok' | 'google' | 'duckduckgo' | 'bing' | 'ecosia'

export type ContentTheme = 'default' | 'light' | 'dark'

export interface Settings {
  searchEngine: SearchEngine
  extensionPaths?: string[]
  contentTheme: ContentTheme
}

export const SEARCH_ENGINE_URLS: Record<SearchEngine, string> = {
  grok: 'https://grok.com/?q=',
  google: 'https://www.google.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  bing: 'https://www.bing.com/search?q=',
  ecosia: 'https://www.ecosia.org/search?q='
}

export interface PinnedTab {
  id: string
  url: string
  title: string
  favicon?: string
}

export interface TrailsState {
  nodes: Record<string, TrailNode>
  activeNodeId: string | null
  activePinnedTabId: string | null  // Which pinned tab is currently active
  rootNodeIds: string[]
  closedTrails: ClosedTrailEntry[]
  downloads: DownloadItem[]
  settings: Settings
  selectedNodeIds: string[]    // Multi-select support
  currentMedia?: MediaState    // Current playing media
  pinnedTabs: PinnedTab[]      // Arc-style pinned tabs
}
