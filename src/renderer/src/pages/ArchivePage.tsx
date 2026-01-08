import React, { useState, useEffect } from 'react'

interface ArchivedTrail {
    id: string
    closedAt: number
    rootNode?: {
        title?: string
        url?: string
        emoji?: string
        favicon?: string
    }
    title?: string
    url?: string
    emoji?: string
    favicon?: string
}

declare global {
    interface Window {
        archiveAPI?: {
            getArchive: () => Promise<ArchivedTrail[]>
            restore: (id: string) => void
            delete: (id: string) => void
            clearAll: () => void
        }
    }
}

const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago'
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago'
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' days ago'

    return date.toLocaleDateString()
}

const ArchivePage: React.FC = () => {
    const [archivedTrails, setArchivedTrails] = useState<ArchivedTrail[]>([])

    useEffect(() => {
        if (window.archiveAPI?.getArchive) {
            window.archiveAPI.getArchive().then((data) => {
                setArchivedTrails(data || [])
            })
        }
    }, [])

    const handleRestore = (id: string) => {
        window.archiveAPI?.restore(id)
    }

    const handleDelete = (id: string) => {
        setArchivedTrails((prev) => prev.filter((t) => t.id !== id))
        window.archiveAPI?.delete(id)
    }

    const handleClearAll = () => {
        if (confirm('Are you sure you want to clear all archived trails?')) {
            setArchivedTrails([])
            window.archiveAPI?.clearAll()
        }
    }

    return (
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: '#121212', color: '#E0E0E0', padding: '40px', minHeight: '100vh' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 500, marginBottom: '32px', color: '#FC93AD', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M4 8 Q 14 4, 24 8" stroke="#FC93AD" strokeWidth="2" strokeLinecap="round" fill="none" />
                    <path d="M4 14 Q 14 10, 24 14" stroke="#FC93AD" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
                    <path d="M4 20 Q 14 16, 24 20" stroke="#FC93AD" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4" />
                </svg>
                Archive
            </h1>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button onClick={handleClearAll} style={{ background: '#2a2a2a', color: '#E0E0E0', border: '1px solid #444444', padding: '10px 16px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
                    Clear All
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {archivedTrails.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
                        <svg width="80" height="60" viewBox="0 0 80 60" fill="none" style={{ marginBottom: '24px' }}>
                            <path d="M10 50 L10 25 Q10 20, 15 20 L30 20 L35 15 L65 15 Q70 15, 70 20 L70 50 Q70 55, 65 55 L15 55 Q10 55, 10 50" stroke="#FC93AD" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                            <path d="M20 35 Q 30 30, 40 35 S 55 40, 60 35" stroke="#FC93AD" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
                        </svg>
                        <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#FC93AD' }}>No archived trails</h2>
                        <p style={{ color: '#666' }}>Closed trails will appear here</p>
                    </div>
                ) : (
                    archivedTrails.map((trail) => {
                        const node = trail.rootNode || trail
                        const title = node.title || 'Untitled'
                        const url = node.url || ''
                        const emoji = node.emoji || ''
                        const favicon = node.favicon || ''

                        return (
                            <div key={trail.id} onClick={() => handleRestore(trail.id)} style={{ background: '#1E1E1E', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2a2a')} onMouseLeave={(e) => (e.currentTarget.style.background = '#1E1E1E')}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                    {favicon ? (
                                        <img src={favicon} alt="" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                                    ) : emoji ? (
                                        <span style={{ fontSize: '18px', flexShrink: 0 }}>{emoji}</span>
                                    ) : (
                                        <span style={{ fontSize: '18px', flexShrink: 0 }}>📄</span>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                                        <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</div>
                                    </div>
                                </div>
                                <span style={{ fontSize: '12px', color: '#888', marginRight: '12px' }}>{formatDate(trail.closedAt)}</span>
                                <button onClick={(e) => { e.stopPropagation(); handleRestore(trail.id) }} style={{ background: '#FC93AD', border: 'none', color: '#121212', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Restore</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(trail.id) }} style={{ background: '#2a2a2a', border: 'none', color: '#E0E0E0', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', marginLeft: '8px' }}>Delete</button>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default ArchivePage
