/**
 * Bookmark Store - Local storage-based bookmark management
 * Supports: folders, tags, import/export
 */

export interface Bookmark {
  id: string
  url: string
  title: string
  folderId?: string      // Parent folder ID (null = root)
  tags: string[]         // Tag names for filtering
  favicon?: string
  createdAt: number
  updatedAt: number
}

export interface BookmarkFolder {
  id: string
  name: string
  parentId?: string      // For nested folders
  createdAt: number
  color?: string         // Optional folder color
}

export interface BookmarkState {
  bookmarks: Bookmark[]
  folders: BookmarkFolder[]
}

const STORAGE_KEY = 'trails_bookmarks_v1'

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

// Load bookmarks from localStorage
export function loadBookmarks(): BookmarkState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load bookmarks:', e)
  }
  return { bookmarks: [], folders: [] }
}

// Save bookmarks to localStorage
export function saveBookmarks(state: BookmarkState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save bookmarks:', e)
  }
}

// Add a new bookmark
export function addBookmark(
  state: BookmarkState,
  url: string,
  title: string,
  folderId?: string,
  tags: string[] = [],
  favicon?: string
): BookmarkState {
  const now = Date.now()
  const newBookmark: Bookmark = {
    id: generateId(),
    url,
    title,
    folderId,
    tags,
    favicon,
    createdAt: now,
    updatedAt: now
  }
  
  const newState = {
    ...state,
    bookmarks: [...state.bookmarks, newBookmark]
  }
  saveBookmarks(newState)
  return newState
}

// Update a bookmark
export function updateBookmark(
  state: BookmarkState,
  id: string,
  updates: Partial<Omit<Bookmark, 'id' | 'createdAt'>>
): BookmarkState {
  const newState = {
    ...state,
    bookmarks: state.bookmarks.map(b => 
      b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b
    )
  }
  saveBookmarks(newState)
  return newState
}

// Delete a bookmark
export function deleteBookmark(state: BookmarkState, id: string): BookmarkState {
  const newState = {
    ...state,
    bookmarks: state.bookmarks.filter(b => b.id !== id)
  }
  saveBookmarks(newState)
  return newState
}

// Add a folder
export function addFolder(
  state: BookmarkState,
  name: string,
  parentId?: string,
  color?: string
): BookmarkState {
  const newFolder: BookmarkFolder = {
    id: generateId(),
    name,
    parentId,
    createdAt: Date.now(),
    color
  }
  
  const newState = {
    ...state,
    folders: [...state.folders, newFolder]
  }
  saveBookmarks(newState)
  return newState
}

// Update a folder
export function updateFolder(
  state: BookmarkState,
  id: string,
  updates: Partial<Omit<BookmarkFolder, 'id' | 'createdAt'>>
): BookmarkState {
  const newState = {
    ...state,
    folders: state.folders.map(f => 
      f.id === id ? { ...f, ...updates } : f
    )
  }
  saveBookmarks(newState)
  return newState
}

// Delete a folder (moves bookmarks to root)
export function deleteFolder(state: BookmarkState, id: string): BookmarkState {
  const newState = {
    ...state,
    folders: state.folders.filter(f => f.id !== id),
    bookmarks: state.bookmarks.map(b => 
      b.folderId === id ? { ...b, folderId: undefined } : b
    )
  }
  saveBookmarks(newState)
  return newState
}

// Get bookmarks in a folder
export function getBookmarksInFolder(state: BookmarkState, folderId?: string): Bookmark[] {
  return state.bookmarks.filter(b => b.folderId === folderId)
}

// Get subfolders of a folder
export function getSubfolders(state: BookmarkState, parentId?: string): BookmarkFolder[] {
  return state.folders.filter(f => f.parentId === parentId)
}

// Search bookmarks by query
export function searchBookmarks(state: BookmarkState, query: string): Bookmark[] {
  const q = query.toLowerCase()
  return state.bookmarks.filter(b => 
    b.title.toLowerCase().includes(q) ||
    b.url.toLowerCase().includes(q) ||
    b.tags.some(t => t.toLowerCase().includes(q))
  )
}

// Get all unique tags
export function getAllTags(state: BookmarkState): string[] {
  const tagSet = new Set<string>()
  state.bookmarks.forEach(b => b.tags.forEach(t => tagSet.add(t)))
  return Array.from(tagSet).sort()
}

// Get bookmarks by tag
export function getBookmarksByTag(state: BookmarkState, tag: string): Bookmark[] {
  return state.bookmarks.filter(b => b.tags.includes(tag))
}

// Check if URL is bookmarked
export function isBookmarked(state: BookmarkState, url: string): boolean {
  return state.bookmarks.some(b => b.url === url)
}

// Get bookmark by URL
export function getBookmarkByUrl(state: BookmarkState, url: string): Bookmark | undefined {
  return state.bookmarks.find(b => b.url === url)
}

// Export to JSON
export function exportToJSON(state: BookmarkState): string {
  return JSON.stringify(state, null, 2)
}

// Import from JSON
export function importFromJSON(jsonString: string): BookmarkState | null {
  try {
    const data = JSON.parse(jsonString)
    if (data.bookmarks && Array.isArray(data.bookmarks)) {
      saveBookmarks(data)
      return data
    }
  } catch (e) {
    console.error('Failed to import bookmarks:', e)
  }
  return null
}

// Export to HTML (Netscape Bookmark format)
export function exportToHTML(state: BookmarkState): string {
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`
  
  // Helper to render folder and its contents
  const renderFolder = (folderId?: string, indent = 1): string => {
    const spaces = '    '.repeat(indent)
    let result = ''
    
    // Render subfolders
    const subfolders = getSubfolders(state, folderId)
    for (const folder of subfolders) {
      result += `${spaces}<DT><H3>${escapeHtml(folder.name)}</H3>\n`
      result += `${spaces}<DL><p>\n`
      result += renderFolder(folder.id, indent + 1)
      result += `${spaces}</DL><p>\n`
    }
    
    // Render bookmarks in this folder
    const bookmarks = getBookmarksInFolder(state, folderId)
    for (const bm of bookmarks) {
      result += `${spaces}<DT><A HREF="${escapeHtml(bm.url)}" ADD_DATE="${Math.floor(bm.createdAt / 1000)}">${escapeHtml(bm.title)}</A>\n`
    }
    
    return result
  }
  
  html += renderFolder(undefined)
  html += '</DL><p>\n'
  
  return html
}

// Helper to escape HTML entities
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Import from HTML (basic Netscape Bookmark format parser)
export function importFromHTML(htmlString: string): BookmarkState | null {
  try {
    const bookmarks: Bookmark[] = []
    const now = Date.now()
    
    // Simple regex-based parser for bookmark links
    const linkRegex = /<A[^>]*HREF="([^"]*)"[^>]*>([^<]*)<\/A>/gi
    let match
    
    while ((match = linkRegex.exec(htmlString)) !== null) {
      const url = match[1]
      const title = match[2]
      
      if (url && title) {
        bookmarks.push({
          id: generateId(),
          url,
          title,
          tags: [],
          createdAt: now,
          updatedAt: now
        })
      }
    }
    
    const newState: BookmarkState = { bookmarks, folders: [] }
    saveBookmarks(newState)
    return newState
  } catch (e) {
    console.error('Failed to import HTML bookmarks:', e)
    return null
  }
}
