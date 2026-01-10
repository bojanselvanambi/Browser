import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    BookmarkState,
    Bookmark,
    BookmarkFolder,
    loadBookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    addFolder,
    updateFolder,
    deleteFolder,
    searchBookmarks,
    getBookmarksInFolder,
    getSubfolders,
    getAllTags,
    getBookmarksByTag,
    isBookmarked,
    getBookmarkByUrl,
    exportToJSON,
    exportToHTML,
    importFromJSON,
    importFromHTML
} from '../stores/bookmarkStore'

// Icons
const StarFilledIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
    </svg>
)

const FolderIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.75 2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25v-8.5a.25.25 0 00-.25-.25H7.5c-.55 0-1.07-.26-1.4-.7l-.9-1.2a.25.25 0 00-.2-.1H1.75z" />
    </svg>
)

const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.5 7a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z" />
    </svg>
)

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zM11 3V1.75A1.75 1.75 0 009.25 0H6.75A1.75 1.75 0 005 1.75V3H2.75a.75.75 0 000 1.5h.59l.64 9.614A1.75 1.75 0 005.725 16h4.55a1.75 1.75 0 001.735-1.886l.64-9.614h.59a.75.75 0 000-1.5H11z" />
    </svg>
)

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
    </svg>
)

const CrossIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
    </svg>
)

const ImportIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 .5a.75.75 0 01.75.75v5.19l1.72-1.72a.75.75 0 011.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 011.06-1.06l1.72 1.72V1.25A.75.75 0 018 .5zM1.5 10a.75.75 0 01.75.75v3c0 .138.112.25.25.25h11a.25.25 0 00.25-.25v-3a.75.75 0 011.5 0v3A1.75 1.75 0 0113.5 15.5h-11A1.75 1.75 0 01.75 13.75v-3a.75.75 0 01.75-.75z" />
    </svg>
)

const ExportIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 9.5a.75.75 0 01-.75-.75V3.56L5.53 5.28a.75.75 0 01-1.06-1.06l3-3a.75.75 0 011.06 0l3 3a.75.75 0 11-1.06 1.06L8.75 3.56v5.19a.75.75 0 01-.75.75zM1.5 10a.75.75 0 01.75.75v3c0 .138.112.25.25.25h11a.25.25 0 00.25-.25v-3a.75.75 0 011.5 0v3A1.75 1.75 0 0113.5 15.5h-11A1.75 1.75 0 01.75 13.75v-3a.75.75 0 01.75-.75z" />
    </svg>
)

interface BookmarkSheetProps {
    isOpen: boolean
    onClose: () => void
    currentUrl?: string
    currentTitle?: string
    currentFavicon?: string
    onNavigate?: (url: string) => void
}

export function BookmarkSheet({
    isOpen,
    onClose,
    currentUrl,
    currentTitle,
    currentFavicon,
    onNavigate
}: BookmarkSheetProps) {
    const [state, setState] = useState<BookmarkState>(loadBookmarks)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined)
    const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined)
    const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
    const [showNewFolder, setShowNewFolder] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Reload state when sheet opens
    useEffect(() => {
        if (isOpen) {
            setState(loadBookmarks())
        }
    }, [isOpen])

    // Get displayed bookmarks based on filters
    const displayedBookmarks = useMemo(() => {
        if (searchQuery) {
            return searchBookmarks(state, searchQuery)
        }
        if (selectedTag) {
            return getBookmarksByTag(state, selectedTag)
        }
        return getBookmarksInFolder(state, selectedFolderId)
    }, [state, searchQuery, selectedTag, selectedFolderId])

    // Get folders for current level
    const displayedFolders = useMemo(() => {
        if (searchQuery || selectedTag) return []
        return getSubfolders(state, selectedFolderId)
    }, [state, searchQuery, selectedTag, selectedFolderId])

    // Get all tags
    const allTags = useMemo(() => getAllTags(state), [state])

    // Check if current page is bookmarked
    const currentPageBookmarked = useMemo(() => {
        return currentUrl ? isBookmarked(state, currentUrl) : false
    }, [state, currentUrl])

    // Add/Remove current page bookmark
    const handleToggleCurrentBookmark = useCallback(() => {
        if (!currentUrl) return

        if (currentPageBookmarked) {
            const existing = getBookmarkByUrl(state, currentUrl)
            if (existing) {
                setState(deleteBookmark(state, existing.id))
            }
        } else {
            setState(addBookmark(state, currentUrl, currentTitle || currentUrl, selectedFolderId, [], currentFavicon))
        }
    }, [currentUrl, currentTitle, currentFavicon, currentPageBookmarked, state, selectedFolderId])

    // Create new folder
    const handleCreateFolder = useCallback(() => {
        if (!newFolderName.trim()) return
        setState(addFolder(state, newFolderName.trim(), selectedFolderId))
        setNewFolderName('')
        setShowNewFolder(false)
    }, [newFolderName, state, selectedFolderId])

    // Delete bookmark
    const handleDeleteBookmark = useCallback((id: string) => {
        setState(deleteBookmark(state, id))
    }, [state])

    // Delete folder
    const handleDeleteFolder = useCallback((id: string) => {
        setState(deleteFolder(state, id))
        if (selectedFolderId === id) {
            setSelectedFolderId(undefined)
        }
    }, [state, selectedFolderId])

    // Navigate into folder
    const handleOpenFolder = useCallback((folderId: string) => {
        setSelectedFolderId(folderId)
        setSearchQuery('')
        setSelectedTag(undefined)
    }, [])

    // Go back to parent folder
    const handleGoBack = useCallback(() => {
        if (!selectedFolderId) return
        const currentFolder = state.folders.find(f => f.id === selectedFolderId)
        setSelectedFolderId(currentFolder?.parentId)
    }, [selectedFolderId, state.folders])

    // Export bookmarks
    const handleExport = useCallback((format: 'json' | 'html') => {
        const content = format === 'json' ? exportToJSON(state) : exportToHTML(state)
        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bookmarks.${format}`
        a.click()
        URL.revokeObjectURL(url)
    }, [state])

    // Import bookmarks
    const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const content = e.target?.result as string
            let imported: BookmarkState | null = null

            if (file.name.endsWith('.json')) {
                imported = importFromJSON(content)
            } else if (file.name.endsWith('.html')) {
                imported = importFromHTML(content)
            }

            if (imported) {
                setState(imported)
            }
        }
        reader.readAsText(file)

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, [])

    // Navigate to bookmark
    const handleNavigate = useCallback((url: string) => {
        onNavigate?.(url)
        onClose()
    }, [onNavigate, onClose])

    // Get breadcrumb path
    const breadcrumbs = useMemo(() => {
        const path: { id?: string; name: string }[] = [{ id: undefined, name: 'All Bookmarks' }]
        let currentId = selectedFolderId

        while (currentId) {
            const folder = state.folders.find(f => f.id === currentId)
            if (folder) {
                path.push({ id: folder.id, name: folder.name })
                currentId = folder.parentId
            } else {
                break
            }
        }

        return path.reverse()
    }, [selectedFolderId, state.folders])

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        maxHeight: '70%',
                        minHeight: '300px',
                        backgroundColor: '#1a1a1a',
                        borderTop: '1px solid #333',
                        borderTopLeftRadius: '12px',
                        borderTopRightRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 1000,
                        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {/* Handle bar */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px' }}>
                        <div style={{ width: '28px', height: '3px', backgroundColor: '#444', borderRadius: '2px' }} />
                    </div>

                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px 6px',
                        borderBottom: '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <StarFilledIcon />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Bookmarks</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {/* Add current page */}
                            {currentUrl && (
                                <button
                                    onClick={handleToggleCurrentBookmark}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 8px',
                                        backgroundColor: currentPageBookmarked ? '#3b82f6' : '#333',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: '#fff',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <StarFilledIcon />
                                    {currentPageBookmarked ? 'Bookmarked' : 'Add Page'}
                                </button>
                            )}

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: '#333',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#888',
                                    cursor: 'pointer'
                                }}
                            >
                                <CrossIcon />
                            </button>
                        </div>
                    </div>

                    {/* Search bar */}
                    <div style={{ padding: '6px 8px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            backgroundColor: '#222',
                            borderRadius: '4px',
                            border: '1px solid #333'
                        }}>
                            <SearchIcon />
                            <input
                                type="text"
                                placeholder="Search bookmarks..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setSelectedTag(undefined)
                                }}
                                style={{
                                    flex: 1,
                                    background: 'none',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '11px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    {/* Tags filter */}
                    {allTags.length > 0 && (
                        <div style={{
                            display: 'flex',
                            gap: '6px',
                            padding: '0 16px 12px',
                            overflowX: 'auto',
                            flexWrap: 'wrap'
                        }}>
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => {
                                        setSelectedTag(selectedTag === tag ? undefined : tag)
                                        setSearchQuery('')
                                    }}
                                    style={{
                                        padding: '4px 10px',
                                        backgroundColor: selectedTag === tag ? '#3b82f6' : '#333',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Breadcrumbs */}
                    {!searchQuery && !selectedTag && breadcrumbs.length > 1 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '0 16px 8px',
                            fontSize: '12px',
                            color: '#888'
                        }}>
                            {breadcrumbs.map((crumb, i) => (
                                <React.Fragment key={crumb.id ?? 'root'}>
                                    {i > 0 && <span>/</span>}
                                    <button
                                        onClick={() => setSelectedFolderId(crumb.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: i === breadcrumbs.length - 1 ? '#fff' : '#888',
                                            cursor: 'pointer',
                                            padding: '2px 4px',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        {crumb.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Content */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '0 8px 8px'
                    }}>
                        {/* Folders */}
                        {displayedFolders.map(folder => (
                            <div
                                key={folder.id}
                                onClick={() => handleOpenFolder(folder.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px',
                                    backgroundColor: '#222',
                                    borderRadius: '4px',
                                    marginBottom: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                <FolderIcon />
                                <span style={{ flex: 1, color: '#fff', fontSize: '11px' }}>{folder.name}</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteFolder(folder.id)
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        background: 'none',
                                        border: 'none',
                                        color: '#666',
                                        cursor: 'pointer',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}

                        {/* New folder input */}
                        {showNewFolder && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px',
                                backgroundColor: '#222',
                                borderRadius: '8px',
                                marginBottom: '6px'
                            }}>
                                <FolderIcon />
                                <input
                                    autoFocus
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateFolder()
                                        if (e.key === 'Escape') setShowNewFolder(false)
                                    }}
                                    placeholder="Folder name..."
                                    style={{
                                        flex: 1,
                                        background: 'none',
                                        border: 'none',
                                        color: '#fff',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={handleCreateFolder}
                                    style={{
                                        padding: '4px 8px',
                                        backgroundColor: '#3b82f6',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: '#fff',
                                        fontSize: '11px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Create
                                </button>
                            </div>
                        )}

                        {/* Bookmarks */}
                        {displayedBookmarks.map(bookmark => (
                            <div
                                key={bookmark.id}
                                onClick={() => handleNavigate(bookmark.url)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px',
                                    backgroundColor: '#222',
                                    borderRadius: '4px',
                                    marginBottom: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                {bookmark.favicon ? (
                                    <img src={bookmark.favicon} alt="" style={{ width: '16px', height: '16px', borderRadius: '2px' }} />
                                ) : (
                                    <StarFilledIcon />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ color: '#fff', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {bookmark.title}
                                    </div>
                                    <div style={{ color: '#666', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {bookmark.url}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteBookmark(bookmark.id)
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        background: 'none',
                                        border: 'none',
                                        color: '#666',
                                        cursor: 'pointer',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}

                        {/* Empty state */}
                        {displayedBookmarks.length === 0 && displayedFolders.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: '#666'
                            }}>
                                <StarFilledIcon />
                                <p style={{ marginTop: '12px', fontSize: '13px' }}>
                                    {searchQuery ? 'No bookmarks found' : 'No bookmarks yet'}
                                </p>
                                {currentUrl && !searchQuery && (
                                    <button
                                        onClick={handleToggleCurrentBookmark}
                                        style={{
                                            marginTop: '12px',
                                            padding: '8px 16px',
                                            backgroundColor: '#3b82f6',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Bookmark This Page
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderTop: '1px solid #333'
                    }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                onClick={() => setShowNewFolder(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    backgroundColor: '#333',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#fff',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                }}
                            >
                                <PlusIcon />
                                Folder
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json,.html"
                                onChange={handleImport}
                                style={{ display: 'none' }}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    backgroundColor: '#333',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                <ImportIcon />
                                Import
                            </button>
                            <button
                                onClick={() => handleExport('html')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    backgroundColor: '#333',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                <ExportIcon />
                                Export
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default BookmarkSheet
