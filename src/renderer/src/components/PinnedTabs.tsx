import React from 'react'
import { PinnedTab } from '../types'

interface PinnedTabsProps {
    pinnedTabs: PinnedTab[]
    activePinnedTabId: string | null
    onClickPinnedTab: (id: string) => void
    onUnpinTab: (id: string) => void
}

export const PinnedTabs: React.FC<PinnedTabsProps> = React.memo(({
    pinnedTabs,
    activePinnedTabId,
    onClickPinnedTab,
    onUnpinTab
}) => {
    const [contextMenu, setContextMenu] = React.useState<{
        x: number
        y: number
        tabId: string
    } | null>(null)

    const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY, tabId })
    }

    const handleClickOutside = React.useCallback(() => {
        setContextMenu(null)
    }, [])

    React.useEffect(() => {
        if (contextMenu) {
            document.addEventListener('click', handleClickOutside)
            return () => document.removeEventListener('click', handleClickOutside)
        }
        return undefined
    }, [contextMenu, handleClickOutside])

    // Early return AFTER all hooks
    if (pinnedTabs.length === 0) return null

    return (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                    gap: '8px',
                    maxWidth: '100%'
                }}
            >
                {pinnedTabs.map((tab) => {
                    const isActive = activePinnedTabId === tab.id
                    return (
                        <div
                            key={tab.id}
                            onClick={() => onClickPinnedTab(tab.id)}
                            onContextMenu={(e) => handleContextMenu(e, tab.id)}
                            title={tab.title}
                            style={{
                                width: '44px',
                                height: '44px',
                                background: isActive ? '#2a2a2a' : '#1E1E1E',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s',
                                overflow: 'hidden',
                                boxShadow: isActive ? '0 0 0 2px #FC93AD' : 'none'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#2a2a2a'
                                e.currentTarget.style.transform = 'scale(1.05)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#1E1E1E'
                                e.currentTarget.style.transform = 'scale(1)'
                            }}
                        >
                            {tab.favicon ? (
                                <img
                                    src={tab.favicon}
                                    alt=""
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        objectFit: 'contain'
                                    }}
                                    onError={(e) => {
                                        // Fallback to first letter if favicon fails
                                        e.currentTarget.style.display = 'none'
                                        if (e.currentTarget.nextSibling) {
                                            (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex'
                                        }
                                    }}
                                />
                            ) : null}
                            <span
                                style={{
                                    display: tab.favicon ? 'none' : 'flex',
                                    width: '24px',
                                    height: '24px',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#FC93AD',
                                    textTransform: 'uppercase'
                                }}
                            >
                                {tab.title?.charAt(0) || '?'}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    style={{
                        position: 'fixed',
                        left: contextMenu.x,
                        top: contextMenu.y,
                        background: '#1E1E1E',
                        border: '1px solid #3a3a3a',
                        borderRadius: '8px',
                        padding: '4px 0',
                        minWidth: '140px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        zIndex: 9999
                    }}
                >
                    <div
                        onClick={() => {
                            onUnpinTab(contextMenu.tabId)
                            setContextMenu(null)
                        }}
                        style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#E0E0E0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2a2a')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="17" x2="12" y2="22" />
                            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
                        </svg>
                        Unpin Tab
                    </div>
                </div>
            )}
        </div>
    )
})

export default PinnedTabs

