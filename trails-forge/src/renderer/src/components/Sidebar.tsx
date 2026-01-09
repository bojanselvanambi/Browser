import React, { useState, useRef, useEffect, useContext, createContext, useMemo } from 'react'
import { TrailNode, ClosedTrailEntry, DownloadItem, Settings, SearchEngine, MediaState, PinnedTab } from '../types'
import { VirtualizedTrailList, FlattenedItem } from './VirtualizedTrailList'
import { MiniPlayer } from './MiniPlayer'
import { PinnedTabs } from './PinnedTabs'
import {
    PlusIcon,
    CrossIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    LockIcon,
    UnlockIcon,
    CopyIcon,
    TrashIcon,
    MusicIcon,
} from './Icons'

// -- Context Definitions --

interface SidebarContextValue {
    nodes: Record<string, TrailNode>
    activeNodeId: string | null
    onNodeClick: (id: string) => void
    onToggleExpand: (id: string) => void
    onCloseTrail: (id: string) => void
    onNavigate: (id: string, url: string) => void
    onAddSubTrail: (parentId: string) => void
    onMoveTrail: (draggedId: string, targetId: string, position: 'inside' | 'before' | 'after') => void
    onContextMenu: (e: React.MouseEvent, nodeId: string) => void
    onRenameTrail: (id: string, customName: string) => void
    onToggleLock: (id: string) => void
    onSetEmoji: (id: string, emoji: string) => void
    onToggleSelect: (id: string) => void
    selectedNodeIds: string[]
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

// -- Components --

const IconButton = ({ onClick, children, title }: { onClick?: () => void; children: React.ReactNode; title?: string }) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            background: 'transparent',
            border: 'none',
            color: '#aaa',
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

// -- TrailItem Implementation --

interface TrailItemViewProps {
    node: TrailNode
    depth: number
    isActive: boolean
    // Handlers passed explicitly or via context? 
    // Passing handlers explicitly to memoized component is safer if they are stable.
    // We will use the context handlers which are assumed stable (from App.tsx callbacks).
}

// Separate component for the recursive list to break context updates
const TrailItemView = React.memo(({ node, depth, isActive }: TrailItemViewProps) => {
    const context = useContext(SidebarContext)!
    const { onNodeClick, onToggleExpand, onCloseTrail, onMoveTrail, onContextMenu, onRenameTrail, onToggleSelect, selectedNodeIds } = context
    const isSelected = selectedNodeIds.includes(node.id)

    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(node.url)
    const [isHovered, setIsHovered] = useState(false)
    const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | 'inside' | 'left' | 'none'>('none')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const hasChildren = node.children.length > 0
    const isExpanded = node.isExpanded ?? true
    const isFolder = node.type === 'folder'
    const isArea = node.type === 'area' || node.isArea

    // Handlers (declared early too support area early return)
    const handleDoubleClick = () => {
        // Show URL for editing instead of name/title
        setEditValue(node.url || node.customName || node.title)
        setIsEditing(true)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onRenameTrail(node.id, editValue)
            setIsEditing(false)
        } else if (e.key === 'Escape') {
            setIsEditing(false)
        }
    }

    const handleBlur = () => {
        setIsEditing(false)
    }

    // Render areas as non-interactive section dividers
    if (isArea) {
        return (
            <div
                style={{
                    paddingLeft: `${depth * 16 + 8}px`,
                    paddingTop: '12px',
                    paddingBottom: '4px',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#B0B0B0',
                    borderBottom: '1px solid #333',
                    cursor: 'default',
                    userSelect: 'none'
                }}
                onContextMenu={(e) => onContextMenu(e, node.id)}
                onDoubleClick={handleDoubleClick}
            >
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#111',
                            border: '1px solid #555',
                            borderRadius: '3px',
                            color: 'white',
                            fontSize: '11px',
                            padding: '2px 4px',
                            outline: 'none',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}
                    />
                ) : (
                    <span>{node.emoji ? `${node.emoji} ` : ''}{node.customName || node.title}</span>
                )}
            </div>
        )
    }

    // Drag handlers
    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation() // Prevent parent from intercepting this drag
        // Support multi-select: if this node is selected, drag all selected
        const selectedIds = selectedNodeIds.includes(node.id) && selectedNodeIds.length > 1
            ? selectedNodeIds.join(',')
            : node.id
        e.dataTransfer.setData('text/plain', selectedIds)
        e.dataTransfer.effectAllowed = 'move'

    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const width = rect.width
        const height = rect.height

        // Horizontal detection for Side-Trail:
        // Left 20% = promote to parent (Side-Trail)
        // Right side or middle = use vertical zones
        if (x < width * 0.15 && depth > 0) {
            // Drag to left edge - promote to parent level
            setDragOverPosition('left')
        } else if (y < height * 0.30) {
            // Top zone - move before
            setDragOverPosition('top')
        } else if (y > height * 0.70) {
            // Bottom zone - move after
            setDragOverPosition('bottom')
        } else {
            // Middle zone - make child
            setDragOverPosition('inside')
        }
    }

    const handleDragLeave = () => {
        setDragOverPosition('none')
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const draggedIds = e.dataTransfer.getData('text/plain')

        if (draggedIds) {
            const ids = draggedIds.split(',')

            ids.forEach(draggedId => {
                if (draggedId === node.id) return

                let position: 'inside' | 'before' | 'after' = 'after'
                if (dragOverPosition === 'top') position = 'before'
                else if (dragOverPosition === 'inside') position = 'inside'
                else position = 'after'

                onMoveTrail(draggedId, node.id, position)
            })
        }
        setDragOverPosition('none')
    }

    return (
        <div
            style={{ marginLeft: depth * 12 }}
            draggable={!isEditing && !node.isLocked}
            onDragStart={node.isLocked ? undefined : handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div
                title={node.customName || node.title || node.url || 'Untitled Trail'}
                onClick={(e) => {
                    if (isEditing) return

                    // Ctrl/Cmd+click for multi-select
                    if (e.ctrlKey || e.metaKey) {
                        onToggleSelect(node.id)
                        return
                    }

                    if (isFolder) onToggleExpand(node.id)
                    else onNodeClick(node.id)
                }}
                onContextMenu={(e) => onContextMenu(e, node.id)}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    padding: '4px 6px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#4a5568' : isActive ? '#FC93AD' : isHovered ? '#2a2a2a' : 'transparent',
                    color: isActive || isSelected ? 'white' : '#e0e0e0',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    outline: isSelected ? '1px solid #6b7280' : 'none',
                    gap: '4px',
                    fontSize: '14px',
                    position: 'relative',
                    borderTop: dragOverPosition === 'top' ? '2px solid #FC93AD' : undefined,
                    borderBottom: dragOverPosition === 'bottom' ? '2px solid #FC93AD' : undefined,
                    borderLeft: dragOverPosition === 'left' ? '3px solid #00FF88' : undefined,
                    boxShadow: dragOverPosition === 'inside' ? 'inset 0 0 0 1px #FC93AD' : undefined
                }}
                className="trail-item"
            >
                {hasChildren && (
                    <span
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleExpand(node.id)
                        }}
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    >
                        {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    </span>
                )}
                {!hasChildren && <span style={{ width: '14px' }}></span>}


                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            flex: 1,
                            background: '#111',
                            border: '1px solid #555',
                            borderRadius: '3px',
                            color: 'white',
                            fontSize: '14px',
                            padding: '2px 4px',
                            outline: 'none',
                            minWidth: 0
                        }}
                    />
                ) : (
                    <span style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: 0
                    }}>
                        {/* Favicon - always show if available */}
                        {node.favicon && (
                            <img
                                src={node.favicon}
                                alt=""
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    flexShrink: 0,
                                    objectFit: 'contain',
                                    borderRadius: '2px'
                                }}
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                        )}
                        {node.isPlayingAudio && <span style={{ color: '#FC93AD', flexShrink: 0 }}><MusicIcon /></span>}
                        {node.emoji && <span>{node.emoji}</span>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {node.customName || node.title || node.url}
                        </span>
                        {node.isLocked && <span style={{ opacity: 0.5, marginLeft: '4px', flexShrink: 0 }}>🔒</span>}
                    </span>
                )}

                {isHovered && !isEditing && (
                    <span
                        onClick={(e) => {
                            e.stopPropagation()
                            onCloseTrail(node.id)
                        }}
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', opacity: 0.7 }}
                        title="Close Trail"
                    >
                        <CrossIcon />
                    </span>
                )}
            </div>

            {isExpanded &&
                node.children.map((childId) => (
                    <ConnectedTrailItem
                        key={childId}
                        id={childId}
                        depth={depth + 1}
                    />
                ))}
        </div>
    )
}, (prev, next) => {
    // Custom comparison to ensure strict shallow equality on node prevents re-renders
    return prev.node === next.node && prev.isActive === next.isActive && prev.depth === next.depth
})

const ConnectedTrailItem = ({ id, depth }: { id: string, depth: number }) => {
    const context = useContext(SidebarContext)
    if (!context) return null
    const node = context.nodes[id]
    if (!node) return null
    const isActive = context.activeNodeId === id

    return <TrailItemView node={node} depth={depth} isActive={isActive} />
}

// -- Sidebar Implementation --

interface SideBarProps {
    nodes: Record<string, TrailNode>
    rootNodeIds: string[]
    activeNodeId: string | null
    closedTrails: ClosedTrailEntry[]
    downloads: DownloadItem[]
    settings: Settings
    currentMedia?: MediaState
    onNodeClick: (id: string) => void
    onToggleExpand: (id: string) => void
    onBack: () => void
    onForward: () => void
    onReload: () => void
    onAddTrail: (url?: string) => void
    onCloseTrail: (id: string) => void
    onNavigate: (id: string, url: string) => void
    onRenameTrail: (id: string, customName: string) => void
    onRestoreClosedTrail: (entryId: string) => void
    onSetSearchEngine: (engine: SearchEngine) => void
    onAddSubTrail: (parentId: string) => void
    onAddFolder: () => void
    onMoveTrail: (draggedId: string, targetId: string, position: 'inside' | 'before' | 'after') => void
    onMoveToRoot: (id: string) => void
    onToggleLock: (id: string) => void
    onSetEmoji: (id: string, emoji: string) => void
    onAddArea: () => void
    selectedNodeIds: string[]
    onToggleSelect: (id: string) => void
    onBulkDelete: () => void

    // Adblock
    adblockEnabled: boolean
    onToggleAdblock: () => void

    // History clear
    onClearHistoryItem: (id: string) => void
    onClearAllHistory: () => void

    // Media controls
    onMediaPlay?: () => void
    onMediaPause?: () => void
    onMediaSeekForward?: () => void
    onMediaSeekBackward?: () => void

    onMediaClose?: () => void

    isCollapsed: boolean

    // Pinned Tabs
    pinnedTabs: PinnedTab[]
    activePinnedTabId: string | null
    onClickPinnedTab: (id: string) => void
    onUnpinTab: (id: string) => void
    onPinTab: (url: string, title: string, favicon?: string) => void
}

const NewTrailInput = ({ onAdd }: { onAdd: (url?: string) => void }) => {
    const [isAdding, setIsAdding] = useState(false)
    const [value, setValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isAdding])

    const handleSubmit = () => {
        if (value.trim()) {
            onAdd(value.trim())
        } else {
            onAdd() // Default new tab
        }
        setIsAdding(false)
        setValue('')
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit()
        } else if (e.key === 'Escape') {
            setIsAdding(false)
            setValue('')
        }
    }

    if (!isAdding) {
        return (
            <div
                onClick={() => setIsAdding(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 8px',
                    marginTop: '8px',
                    borderTop: '1px solid #333',
                    color: '#B0B0B0',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'color 0.15s',
                    userSelect: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#ccc'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#B0B0B0'}
            >
                <PlusIcon />
                <span>New Trail</span>
            </div>
        )
    }

    return (
        <div style={{
            padding: '8px',
            marginTop: '8px',
            borderTop: '1px solid #333'
        }}>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    // Optional: close on blur if empty? 
                    // Better to keep open if user clicks away temporarily or keep logic simple
                    // Let's close if empty, but keep if typed?
                    // User might lose work. Let's just keep it open or close on Escape.
                    // Actually, usually these things close on blur.
                    // Let's close.
                    if (!value) setIsAdding(false)
                }}
                placeholder="Search or enter URL..."
                style={{
                    width: '100%',
                    background: '#111',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '13px',
                    padding: '6px 8px',
                    outline: 'none'
                }}
            />
        </div>
    )
}

export function Sidebar({
    nodes,
    rootNodeIds,
    activeNodeId,
    closedTrails,
    downloads,
    settings,
    currentMedia,
    onNodeClick,
    onToggleExpand,
    onBack: _onBack,
    onForward: _onForward,
    onReload: _onReload,
    onAddTrail,
    onCloseTrail,
    onNavigate,
    onRenameTrail,
    onRestoreClosedTrail,
    onSetSearchEngine,
    onAddSubTrail,
    onAddFolder: _onAddFolder,
    onMoveTrail,
    onMoveToRoot: _onMoveToRoot,
    onToggleLock,
    onSetEmoji,
    onAddArea: _onAddArea,
    selectedNodeIds,
    onToggleSelect,
    onBulkDelete: _onBulkDelete,
    adblockEnabled,
    onToggleAdblock,
    onClearHistoryItem,
    onClearAllHistory,
    onMediaPlay,
    onMediaPause,
    onMediaSeekForward,
    onMediaSeekBackward,

    onMediaClose,
    isCollapsed,
    pinnedTabs,
    activePinnedTabId,
    onClickPinnedTab,
    onUnpinTab,
    onPinTab
}: SideBarProps) {
    const [sidebarWidth, setSidebarWidth] = useState(280)
    const [isResizing, setIsResizing] = useState(false)
    // Local menu states (no longer lifted to parent)
    const [showSettingsMenu, setShowSettingsMenu] = useState(false)
    const [showHistoryMenu, setShowHistoryMenu] = useState(false)
    const [showDownloadsMenu, setShowDownloadsMenu] = useState(false)
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string } | null>(null)
    const [_editNodeId, _setEditNodeId] = useState<string | null>(null)
    const sidebarRef = useRef<HTMLDivElement>(null)

    const MIN_WIDTH = 200
    const MAX_WIDTH = 450

    // Memoize context value to prevent unnecessary re-renders of consumers
    // Note: 'nodes' changes frequently, but 'callbacks' are stable thanks to useCallback in App.tsx
    const contextValue = useMemo<SidebarContextValue>(() => ({
        nodes,
        activeNodeId,
        onNodeClick,
        onToggleExpand,
        onCloseTrail,
        onNavigate,
        onAddSubTrail,
        onMoveTrail,
        onContextMenu: (e, nodeId) => {
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
        },
        onRenameTrail,
        onToggleLock,
        onSetEmoji,
        onToggleSelect,
        selectedNodeIds
    }), [nodes, activeNodeId, onNodeClick, onToggleExpand, onCloseTrail, onNavigate, onAddSubTrail, onMoveTrail, onRenameTrail, onToggleLock, onSetEmoji, onToggleSelect, selectedNodeIds])

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsResizing(true)
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX))
            setSidebarWidth(newWidth)
        }

        const handleMouseUp = () => {
            setIsResizing(false)
        }

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isResizing])

    // Close context menu on click elsewhere
    useEffect(() => {
        const closeMenu = () => setContextMenu(null)
        document.addEventListener('click', closeMenu)
        return () => document.removeEventListener('click', closeMenu)
    }, [])

    const ContextMenu = ({
        items,
        onClose,
        x,
        y
    }: {
        items: { label: string; onClick: () => void; icon?: React.ReactNode }[];
        onClose: () => void;
        x: number;
        y: number;
    }) => (
        <div
            className="context-menu-glass"
            style={{
                position: 'fixed',
                top: y,
                left: x,
                minWidth: '160px',
                padding: '6px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((item, i) => (
                <div
                    key={i}
                    onClick={() => { item.onClick(); onClose(); }}
                    style={{
                        padding: '8px 10px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        borderRadius: '6px',
                        transition: 'background 0.1s',
                        color: '#e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                    className="context-menu-item"
                    onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.backgroundColor = '#3a3a3a'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'}
                >
                    {item.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}</span>}
                    {item.label}
                </div>
            ))}
        </div>
    )

    // Collapsed sidebar - fully hidden
    if (isCollapsed) {
        return null
    }


    return (
        <SidebarContext.Provider value={contextValue}>
            <div
                ref={sidebarRef}
                className="sidebar-glass"
                style={{
                    width: `${sidebarWidth}px`,
                    minWidth: `${MIN_WIDTH}px`,
                    maxWidth: `${MAX_WIDTH}px`,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#e0e0e0',
                    position: 'relative',
                    userSelect: isResizing ? 'none' : 'auto',
                    transition: 'width 0.2s ease'
                }}
            >


                {/* Pinned Tabs Grid */}
                <PinnedTabs
                    pinnedTabs={pinnedTabs}
                    activePinnedTabId={activePinnedTabId}
                    onClickPinnedTab={onClickPinnedTab}
                    onUnpinTab={onUnpinTab}
                />

                {/* Trails List */}
                <div
                    style={{ flex: 1, overflowY: 'auto', padding: '8px' }}
                    onDragOver={(e) => {
                        // Only accept drops directly on the container, not on child elements
                        if (e.target === e.currentTarget) {
                            e.preventDefault()
                            e.currentTarget.style.backgroundColor = 'rgba(252, 147, 173, 0.1)'
                        }
                    }}
                    onDragLeave={(e) => {
                        if (e.target === e.currentTarget) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                        }
                    }}
                    onDrop={(e) => {
                        if (e.target === e.currentTarget) {
                            e.preventDefault()
                            const draggedId = e.dataTransfer.getData('text/plain')
                            if (draggedId && rootNodeIds.length > 0) {
                                // Move to end of root level
                                const lastRootId = rootNodeIds[rootNodeIds.length - 1]
                                if (lastRootId !== draggedId) {
                                    onMoveTrail(draggedId, lastRootId, 'after')
                                }
                            }
                            e.currentTarget.style.backgroundColor = 'transparent'
                        }
                    }}
                >
                    {/* Use virtualized list for 100+ items, standard for smaller */}
                    {Object.keys(nodes).length >= 100 ? (
                        <VirtualizedTrailList
                            nodes={nodes}
                            rootNodeIds={rootNodeIds}
                            renderItem={(item: FlattenedItem, style: React.CSSProperties) => (
                                <div key={item.id} style={style}>
                                    <TrailItemView node={item.node} depth={item.depth} isActive={activeNodeId === item.id} />
                                </div>
                            )}
                        />
                    ) : (
                        <>
                            {rootNodeIds.length === 0 ? (
                                <div style={{
                                    padding: '32px 16px',
                                    textAlign: 'center',
                                    color: '#888',
                                    fontSize: '13px',
                                    lineHeight: 1.6
                                }}>
                                    {/* Wavy trail scribble illustration inspired by illustrations.run */}
                                    <svg
                                        width="80"
                                        height="60"
                                        viewBox="0 0 80 60"
                                        fill="none"
                                        style={{ marginBottom: '16px' }}
                                    >
                                        <path
                                            d="M8 45 C 15 20, 25 55, 35 30 S 50 5, 60 25 S 70 50, 75 35"
                                            stroke="#FC93AD"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            fill="none"
                                        />
                                        <circle cx="75" cy="35" r="4" fill="#FC93AD" />
                                        <path
                                            d="M12 50 C 20 35, 30 45, 40 30 S 55 20, 65 30"
                                            stroke="#FC93AD"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            fill="none"
                                            opacity="0.4"
                                        />
                                    </svg>
                                    <div style={{ color: '#FC93AD', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
                                        Welcome to Trails!
                                    </div>
                                    <div style={{ color: '#666' }}>
                                        Click <span style={{ color: '#FC93AD' }}>+ New Trail</span> below<br />
                                        to start your journey
                                    </div>
                                </div>
                            ) : (
                                rootNodeIds.map((id) => (
                                    <ConnectedTrailItem
                                        key={id}
                                        id={id}
                                        depth={0}
                                    />
                                ))
                            )}
                        </>
                    )}

                    {/* Downloads Section */}
                    {downloads.filter(d => d.state === 'progressing').length > 0 && (
                        <div style={{
                            marginTop: '12px',
                            padding: '8px',
                            borderTop: '1px solid #333',
                            borderBottom: '1px solid #333'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px',
                                color: '#FC93AD',
                                fontSize: '12px',
                                fontWeight: 600
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 4v12M7 12l5 5 5-5" /><path d="M4 18h16" />
                                </svg>
                                Downloading ({downloads.filter(d => d.state === 'progressing').length})
                            </div>
                            {downloads.filter(d => d.state === 'progressing').slice(0, 3).map(d => {
                                const progress = d.totalBytes > 0 ? Math.round((d.receivedBytes / d.totalBytes) * 100) : 0;
                                return (
                                    <div key={d.id} style={{ marginBottom: '8px' }}>
                                        <div style={{
                                            fontSize: '11px',
                                            color: '#B0B0B0',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            marginBottom: '4px'
                                        }}>
                                            {d.filename}
                                        </div>
                                        <div style={{
                                            height: '4px',
                                            background: '#333',
                                            borderRadius: '2px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${progress}%`,
                                                height: '100%',
                                                background: '#FC93AD',
                                                borderRadius: '2px',
                                                transition: 'width 0.3s'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* New Trails Button - inside scrollable area with separator */}

                    {/* New Trail Input / Button */}
                    <NewTrailInput onAdd={onAddTrail} />
                </div>

                {/* History Panel */}
                {showHistoryMenu && (
                    <div style={{
                        position: 'absolute',
                        bottom: '48px',
                        left: '8px',
                        width: 'calc(100% - 16px)',
                        maxHeight: '60vh',
                        backgroundColor: '#1e1e1e',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        overflowY: 'auto',
                        padding: '8px',
                        zIndex: 200,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                            paddingBottom: '8px',
                            borderBottom: '1px solid #333'
                        }}>
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>Closed Trails</span>
                            <IconButton onClick={() => setShowHistoryMenu(false)} title="Close">
                                <CrossIcon />
                            </IconButton>
                        </div>
                        {closedTrails.length > 0 ? (
                            <>
                                {closedTrails.map(entry => (
                                    <div
                                        key={entry.id}
                                        style={{
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            borderRadius: '6px',
                                            marginBottom: '4px',
                                            backgroundColor: '#2a2a2a',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        className="context-menu-item"
                                    >
                                        <div
                                            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}
                                            onClick={() => {
                                                onRestoreClosedTrail(entry.id)
                                                setShowHistoryMenu(false)
                                            }}
                                        >
                                            {entry.rootNode.favicon && (
                                                <img src={entry.rootNode.favicon} alt="" style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                                            )}
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {entry.rootNode.title || entry.rootNode.url}
                                            </span>
                                        </div>
                                        <IconButton onClick={() => onClearHistoryItem(entry.id)} title="Remove">
                                            <CrossIcon />
                                        </IconButton>
                                    </div>
                                ))}
                                <button
                                    onClick={onClearAllHistory}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        marginTop: '8px',
                                        background: '#2a2a2a',
                                        border: '1px solid #444444',
                                        borderRadius: '6px',
                                        color: '#E0E0E0',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Clear All History
                                </button>
                            </>
                        ) : (
                            <div style={{ color: '#B0B0B0', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                                No closed trails
                            </div>
                        )}
                    </div>
                )}

                {/* Downloads Panel */}
                {showDownloadsMenu && (
                    <div style={{
                        position: 'absolute',
                        bottom: '48px',
                        left: '8px',
                        width: 'calc(100% - 16px)',
                        maxHeight: '60vh',
                        backgroundColor: '#1e1e1e',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        overflowY: 'auto',
                        padding: '8px',
                        zIndex: 200,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                            paddingBottom: '8px',
                            borderBottom: '1px solid #333'
                        }}>
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>Downloads</span>
                            <IconButton onClick={() => setShowDownloadsMenu(false)} title="Close">
                                <CrossIcon />
                            </IconButton>
                        </div>
                        {downloads.length > 0 ? (
                            downloads.map(d => (
                                <div
                                    key={d.id}
                                    style={{
                                        padding: '10px',
                                        fontSize: '13px',
                                        borderRadius: '6px',
                                        marginBottom: '6px',
                                        backgroundColor: '#2a2a2a'
                                    }}
                                >
                                    <div style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        marginBottom: '6px'
                                    }}>
                                        {d.filename}
                                    </div>
                                    <div style={{
                                        height: '4px',
                                        backgroundColor: '#444',
                                        borderRadius: '2px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${d.totalBytes ? Math.round((d.receivedBytes / d.totalBytes) * 100) : 0}%`,
                                            height: '100%',
                                            backgroundColor: d.state === 'completed' ? '#22c55e' : d.state === 'interrupted' ? '#ef4444' : '#FC93AD',
                                            transition: 'width 0.2s'
                                        }} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: '#B0B0B0', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                                No downloads
                            </div>
                        )}
                    </div>
                )}

                {/* Settings Panel */}
                {showSettingsMenu && (
                    <div className="settings-panel" style={{
                        position: 'absolute',
                        top: '45px',
                        left: 0,
                        right: 0,
                        bottom: '45px',
                        overflowY: 'auto',
                        padding: '12px',
                        zIndex: 100
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            paddingBottom: '8px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>Settings</span>
                            <IconButton onClick={() => setShowSettingsMenu(false)} title="Close">
                                <CrossIcon />
                            </IconButton>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#B0B0B0', marginBottom: '6px' }}>
                                Search Engine
                            </label>
                            <select
                                className="select-glass"
                                value={settings.searchEngine}
                                onChange={(e) => onSetSearchEngine(e.target.value as SearchEngine)}
                                style={{ width: '100%' }}
                            >
                                <option value="grok">Grok</option>
                                <option value="google">Google</option>
                                <option value="duckduckgo">DuckDuckGo</option>
                                <option value="bing">Bing</option>
                                <option value="ecosia">Ecosia</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#B0B0B0' }}>
                                Content Blocking
                            </label>
                            <div
                                onClick={onToggleAdblock}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '8px', background: '#111', borderRadius: '4px', cursor: 'pointer',
                                    border: '1px solid #333'
                                }}
                            >
                                <span style={{ fontSize: '13px' }}>uBlock Origin</span>
                                <div style={{
                                    width: '32px', height: '18px', borderRadius: '9px',
                                    background: adblockEnabled ? '#FC93AD' : '#444',
                                    position: 'relative', transition: '0.2s'
                                }}>
                                    <div style={{
                                        width: '14px', height: '14px', borderRadius: '50%', background: 'white',
                                        position: 'absolute', top: '2px', left: adblockEnabled ? '16px' : '2px',
                                        transition: '0.2s'
                                    }} />
                                </div>
                            </div>
                        </div>


                    </div>
                )}



                {/* Resize Handle */}
                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        cursor: 'ew-resize',
                        backgroundColor: isResizing ? '#FC93AD' : 'transparent',
                        transition: 'background 0.15s',
                        WebkitAppRegion: 'no-drag'
                    } as any}
                    onMouseEnter={(e) => !isResizing && ((e.target as HTMLDivElement).style.backgroundColor = '#555')}
                    onMouseLeave={(e) => !isResizing && ((e.target as HTMLDivElement).style.backgroundColor = 'transparent')}
                />
                {/* Render Context Menu */}
                {contextMenu && (
                    <ContextMenu
                        x={Math.min(contextMenu.x, sidebarWidth - 170)}
                        y={contextMenu.y}
                        onClose={() => setContextMenu(null)}
                        items={[
                            { label: 'New Sub Trail', onClick: () => onAddSubTrail(contextMenu.nodeId), icon: <PlusIcon /> },
                            {
                                label: nodes[contextMenu.nodeId]?.isLocked ? 'Unlock' : 'Lock',
                                onClick: () => onToggleLock(contextMenu.nodeId),
                                icon: nodes[contextMenu.nodeId]?.isLocked ? <UnlockIcon /> : <LockIcon />
                            },
                            {
                                label: 'Pin Tab',
                                onClick: () => {
                                    const node = nodes[contextMenu.nodeId];
                                    if (node && node.url && node.type === 'link') {
                                        onPinTab(node.url, node.title || node.url, node.favicon);
                                    }
                                },
                                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" /></svg>
                            },
                            ...(nodes[contextMenu.nodeId]?.isLocked ? [] : [{
                                label: 'Close Trail',
                                onClick: () => onCloseTrail(contextMenu.nodeId),
                                icon: <TrashIcon />
                            }]),
                            {
                                label: 'Copy Link',
                                onClick: () => {
                                    const node = nodes[contextMenu.nodeId];
                                    if (node && node.url) {
                                        navigator.clipboard.writeText(node.url);
                                    }
                                },
                                icon: <CopyIcon />
                            }
                        ]}
                    />
                )}

                {/* Mini Player */}
                {currentMedia && (
                    <MiniPlayer
                        media={currentMedia}
                        onPlay={onMediaPlay || (() => { })}
                        onPause={onMediaPause || (() => { })}
                        onSeekForward={onMediaSeekForward || (() => { })}
                        onSeekBackward={onMediaSeekBackward || (() => { })}

                        onClose={onMediaClose || (() => { })}
                        onClickTrail={() => onNodeClick(currentMedia.trailId)}
                    />
                )}
            </div>
        </SidebarContext.Provider >
    )
}
