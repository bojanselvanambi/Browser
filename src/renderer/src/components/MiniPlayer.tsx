import React from 'react'
import { MediaState } from '../types'

interface MiniPlayerProps {
    media: MediaState
    onPlay: () => void
    onPause: () => void
    onSeekBackward: () => void
    onSeekForward: () => void
    onClose: () => void
    onClickTrail: () => void
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
    media,
    onPlay,
    onPause,
    onSeekBackward,
    onSeekForward,
    onClose,
    onClickTrail
}) => {
    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(30,30,30,0.98)',
            borderTop: '1px solid #333',
            padding: '8px 12px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
        }}>
            {/* Thumbnail */}
            <div
                onClick={onClickTrail}
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    background: media.thumbnail ? `url(${media.thumbnail}) center/cover` : '#FC93AD',
                    flexShrink: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {!media.thumbnail && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#121212" strokeWidth="2">
                        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                )}
            </div>

            {/* Title */}
            <div
                onClick={onClickTrail}
                style={{
                    flex: 1,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#E0E0E0',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis'
                }}
            >
                {media.title}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* Backward */}
                <button
                    onClick={onSeekBackward}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#B0B0B0',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                </button>

                {/* Play/Pause */}
                <button
                    onClick={media.isPlaying ? onPause : onPlay}
                    style={{
                        background: '#FC93AD',
                        border: 'none',
                        color: '#121212',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%'
                    }}
                >
                    {media.isPlaying ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                        </svg>
                    ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    )}
                </button>

                {/* Forward */}
                <button
                    onClick={onSeekForward}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#B0B0B0',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                </button>
            </div>



            {/* Close */}
            <button
                onClick={onClose}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    )
}
