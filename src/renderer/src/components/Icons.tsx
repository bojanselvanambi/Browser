// React import not needed with new JSX transform

// All icons are 14px as requested, using akaricons.com designs
const iconProps = { width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const ArrowLeftIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
)

export const ArrowRightIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
)

export const ArrowClockwiseIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M19.734 16.06a8.923 8.923 0 0 1-3.915 3.978 8.706 8.706 0 0 1-5.471.832 8.795 8.795 0 0 1-4.887-2.64 9.067 9.067 0 0 1-2.388-5.079 9.136 9.136 0 0 1 1.044-5.53 8.904 8.904 0 0 1 4.069-3.815 8.7 8.7 0 0 1 5.5-.608c1.85.401 3.53 1.381 4.795 2.791L19.734 7.5" /><path d="M20 3.5v4h-4" /></svg>
)

export const PlusIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M12 5v14M5 12h14" /></svg>
)

export const MoreVerticalIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
)

export const ArchiveIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><rect x="2" y="4" width="20" height="5" rx="1" /><path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" /><path d="M10 13h4" /></svg>
)

export const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M12 4v12M7 12l5 5 5-5" /><path d="M4 18h16" /></svg>
)

export const CrossIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M6 18L18 6M6 6l12 12" /></svg>
)

export const ChevronDownIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M6 9l6 6 6-6" /></svg>
)

export const ChevronRightIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M9 6l6 6-6 6" /></svg>
)

export const FolderIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
)

export const GlobeIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
)

export const EmojiIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
)

export const HamburgerIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M3 12h18M3 6h18M3 18h18" /></svg>
)

export const LockIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)

export const UnlockIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
)

export const CopyIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
)

export const TrashIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)

export const SubTrailIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M16 3h5v5M21 3l-9 9M8 21H3v-5M3 21l9-9" /></svg>
)

export const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
)

export const MusicIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
)

export const ChevronLeftIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><path d="M15 18l-6-6 6-6" /></svg>
)

export const HistoryIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)

export const SidebarIcon = () => (
    <svg viewBox="0 0 24 24" {...iconProps}><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
)

