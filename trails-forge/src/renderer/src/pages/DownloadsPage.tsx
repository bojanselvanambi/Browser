import React, { useState, useEffect } from 'react'

interface DownloadItem {
    id: string
    filename: string
    url: string
    totalBytes: number
    receivedBytes: number
    state: 'progressing' | 'completed' | 'cancelled' | 'interrupted'
    savePath: string
    startTime: number
}

declare global {
    interface Window {
        downloadsAPI?: {
            getDownloads: () => Promise<DownloadItem[]>
            openFile: (path: string) => void
            showInFolder: (path: string) => void
            removeDownload: (id: string) => void
            clearAll: () => void
            openDownloadsFolder: () => void
        }
    }
}

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const DownloadsPage: React.FC = () => {
    const [downloads, setDownloads] = useState<DownloadItem[]>([])

    useEffect(() => {
        if (window.downloadsAPI?.getDownloads) {
            window.downloadsAPI.getDownloads().then((data) => {
                setDownloads(data || [])
            })
        }
    }, [])

    const handleOpenFile = (path: string) => {
        window.downloadsAPI?.openFile(path)
    }

    const handleShowInFolder = (path: string) => {
        window.downloadsAPI?.showInFolder(path)
    }

    const handleRemoveDownload = (id: string) => {
        setDownloads((prev) => prev.filter((d) => d.id !== id))
        window.downloadsAPI?.removeDownload(id)
    }

    const handleClearAll = () => {
        setDownloads([])
        window.downloadsAPI?.clearAll()
    }

    const handleOpenDownloadsFolder = () => {
        window.downloadsAPI?.openDownloadsFolder()
    }

    return (
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: '#121212', color: '#E0E0E0', padding: '40px', minHeight: '100vh' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 500, marginBottom: '32px', color: '#FC93AD', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Downloads
            </h1>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button onClick={handleOpenDownloadsFolder} style={{ background: '#2a2a2a', color: '#E0E0E0', border: '1px solid #444444', padding: '10px 16px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
                    Open Downloads Folder
                </button>
                <button onClick={handleClearAll} style={{ background: '#2a2a2a', color: '#E0E0E0', border: '1px solid #444444', padding: '10px 16px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
                    Clear All
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {downloads.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#B0B0B0' }}>
                        <svg width="80" height="60" viewBox="0 0 80 60" fill="none" style={{ marginBottom: '16px' }}>
                            <path d="M40 5 L40 40" stroke="#FC93AD" strokeWidth="3" strokeLinecap="round" />
                            <path d="M25 30 L40 45 L55 30" stroke="#FC93AD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                            <path d="M15 55 Q 40 50, 65 55" stroke="#FC93AD" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
                        </svg>
                        <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#E0E0E0' }}>No downloads yet</h2>
                        <p>Your downloads will appear here</p>
                    </div>
                ) : (
                    downloads.map((d) => {
                        const progress = d.totalBytes > 0 ? Math.round((d.receivedBytes / d.totalBytes) * 100) : 0
                        return (
                            <div key={d.id} style={{ background: '#1E1E1E', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '15px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>{d.filename}</div>
                                        <div style={{ fontSize: '12px', color: '#B0B0B0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.url}</div>
                                        <div style={{ fontSize: '12px', color: '#B0B0B0' }}>{formatDate(d.startTime)} • {formatBytes(d.totalBytes || d.receivedBytes)}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        {d.state === 'completed' && (
                                            <>
                                                <button onClick={() => handleOpenFile(d.savePath)} style={{ background: '#FC93AD', border: 'none', color: '#121212', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Open</button>
                                                <button onClick={() => handleShowInFolder(d.savePath)} style={{ background: '#2a2a2a', border: 'none', color: '#E0E0E0', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Show in Folder</button>
                                            </>
                                        )}
                                        <button onClick={() => handleRemoveDownload(d.id)} style={{ background: '#2a2a2a', border: 'none', color: '#E0E0E0', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>Remove</button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, background: d.state === 'completed' ? 'rgba(34, 197, 94, 0.2)' : d.state === 'interrupted' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(252, 147, 173, 0.2)', color: d.state === 'completed' ? '#22c55e' : d.state === 'interrupted' ? '#ef4444' : '#FC93AD' }}>
                                        {d.state === 'progressing' ? 'Downloading' : d.state.charAt(0).toUpperCase() + d.state.slice(1)}
                                    </span>
                                    {d.state === 'progressing' && (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ flex: 1, height: '6px', background: '#444444', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', background: '#FC93AD', borderRadius: '3px', width: `${progress}%`, transition: 'width 0.3s' }} />
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#B0B0B0', minWidth: '60px', textAlign: 'right' }}>{progress}%</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default DownloadsPage
