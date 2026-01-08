import { ElectronAPI } from '@electron-toolkit/preload'

interface TrailAPI {
  createTrailView: (id: string, url: string, bounds: { x: number; y: number; width: number; height: number }) => void
  updateViewBounds: (bounds: { x: number; y: number; width: number; height: number }) => void
  setActiveView: (id: string) => void
  navigateView: (id: string, url: string) => void
  goBack: (id: string) => void
  goForward: (id: string) => void
  reload: (id: string) => void
  destroyView: (id: string) => void
  hideView: () => void
  showView: () => void

  onViewTitleUpdated: (callback: (event: unknown, data: { id: string; title: string }) => void) => void
  onViewNavigated: (callback: (event: unknown, data: { id: string; url: string }) => void) => void
  onViewNewWindow: (callback: (event: unknown, data: { sourceId: string; url: string }) => void) => void
  onViewFaviconUpdated: (callback: (event: unknown, data: { id: string; favicon: string }) => void) => void
  onViewLinkClicked: (callback: (event: unknown, data: { sourceId: string; url: string }) => void) => void
  onFullscreenEnter: (callback: () => void) => void
  onFullscreenLeave: (callback: () => void) => void
  onDownloadStarted: (callback: (event: unknown, data: unknown) => void) => void
  onDownloadProgress: (callback: (event: unknown, data: unknown) => void) => void
  onDownloadDone: (callback: (event: unknown, data: unknown) => void) => void
  onMediaPlaying: (callback: (event: unknown, data: { id: string; isPlaying: boolean; title: string }) => void) => void
  onMediaPaused: (callback: (event: unknown, data: { id: string; isPlaying: boolean }) => void) => void
  onMediaUpdate: (callback: (event: unknown, data: any) => void) => void
  mediaControl: (id: string, action: 'play' | 'pause' | 'forward' | 'backward') => void
  onContextOpenInNewTrail: (callback: (event: unknown, data: { url: string }) => void) => void
  onContextOpenAsSubTrail: (callback: (event: unknown, data: { sourceId: string; url: string }) => void) => void
  removeAllListeners: () => void
}

interface AdblockAPI {
  set: (enabled: boolean) => void
}

interface SettingsAPI {
  getPath: () => Promise<string>
  onSearchEngineChanged: (callback: (event: unknown, engine: string) => void) => void
  onAdblockChanged: (callback: (event: unknown, enabled: boolean) => void) => void
}

interface DownloadsAPI {
  getPath: () => Promise<string>
}




interface ArchiveAPI {
  getPath: () => Promise<string>
  sync: (closedTrails: unknown[]) => void
  onRestoreTrail: (callback: (event: unknown, id: string) => void) => void
  onDeleteTrail: (callback: (event: unknown, id: string) => void) => void
  onClearAll: (callback: () => void) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      trails: TrailAPI
      adblock: AdblockAPI
      settings: SettingsAPI
      downloads: DownloadsAPI

      archive: ArchiveAPI
    }
  }
}

