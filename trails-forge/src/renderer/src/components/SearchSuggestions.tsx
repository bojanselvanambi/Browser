import React, { useState, useEffect, useCallback, useRef } from 'react'
import { TrailNode, ClosedTrailEntry } from '../types'

// Common domain suggestions for quick access
const COMMON_DOMAINS = [
    { domain: 'youtube.com', title: 'YouTube', icon: '🎬' },
    { domain: 'github.com', title: 'GitHub', icon: '💻' },
    { domain: 'twitter.com', title: 'Twitter / X', icon: '🐦' },
    { domain: 'reddit.com', title: 'Reddit', icon: '🤖' },
    { domain: 'stackoverflow.com', title: 'Stack Overflow', icon: '📚' },
    { domain: 'google.com', title: 'Google', icon: '🔍' },
    { domain: 'wikipedia.org', title: 'Wikipedia', icon: '📖' },
    { domain: 'amazon.com', title: 'Amazon', icon: '🛒' },
    { domain: 'netflix.com', title: 'Netflix', icon: '🎥' },
    { domain: 'spotify.com', title: 'Spotify', icon: '🎵' },
    { domain: 'linkedin.com', title: 'LinkedIn', icon: '💼' },
    { domain: 'twitch.tv', title: 'Twitch', icon: '🎮' },
    { domain: 'discord.com', title: 'Discord', icon: '💬' },
    { domain: 'notion.so', title: 'Notion', icon: '📝' },
    { domain: 'figma.com', title: 'Figma', icon: '🎨' },
    { domain: 'vercel.com', title: 'Vercel', icon: '▲' },
    { domain: 'npm.js.com', title: 'npm', icon: '📦' },
    { domain: 'docs.google.com', title: 'Google Docs', icon: '📄' },
    { domain: 'drive.google.com', title: 'Google Drive', icon: '☁️' },
    { domain: 'mail.google.com', title: 'Gmail', icon: '✉️' },
]

export interface Suggestion {
    type: 'domain' | 'history' | 'archived' | 'trail'
    title: string
    url: string
    icon?: string
    favicon?: string
    score: number // For sorting by relevance
}

interface SearchSuggestionsProps {
    query: string
    isVisible: boolean
    onSelect: (url: string) => void
    onClose: () => void
    nodes: Record<string, TrailNode>
    closedTrails: ClosedTrailEntry[]
    selectedIndex: number
    onSelectedIndexChange: (index: number) => void
}

// Simple fuzzy matching - returns score (higher = better match)
function fuzzyMatch(query: string, target: string): number {
    if (!query || !target) return 0
    const q = query.toLowerCase()
    const t = target.toLowerCase()

    // Exact match at start
    if (t.startsWith(q)) return 100

    // Contains match
    if (t.includes(q)) return 80

    // Fuzzy character match
    let qIdx = 0
    let score = 0
    for (let i = 0; i < t.length && qIdx < q.length; i++) {
        if (t[i] === q[qIdx]) {
            score += 10
            qIdx++
        }
    }

    // Only count if all query chars matched
    return qIdx === q.length ? score : 0
}

export function SearchSuggestions({
    query,
    isVisible,
    onSelect,
    onClose,
    nodes,
    closedTrails,
    selectedIndex,
    onSelectedIndexChange
}: SearchSuggestionsProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const listRef = useRef<HTMLDivElement>(null)

    // Generate suggestions based on query
    useEffect(() => {
        if (!query || query.length < 1) {
            setSuggestions([])
            return
        }

        const results: Suggestion[] = []
        const q = query.toLowerCase()

        // 1. Domain suggestions
        for (const domain of COMMON_DOMAINS) {
            const domainScore = fuzzyMatch(q, domain.domain) || fuzzyMatch(q, domain.title)
            if (domainScore > 0) {
                results.push({
                    type: 'domain',
                    title: domain.title,
                    url: `https://${domain.domain}`,
                    icon: domain.icon,
                    score: domainScore
                })
            }
        }

        // 2. Current trails (open pages)
        for (const node of Object.values(nodes)) {
            if (node.type !== 'link') continue
            const titleScore = fuzzyMatch(q, node.title || '')
            const urlScore = fuzzyMatch(q, node.url || '')
            const score = Math.max(titleScore, urlScore)
            if (score > 0) {
                results.push({
                    type: 'trail',
                    title: node.customName || node.title || node.url,
                    url: node.url,
                    favicon: node.favicon,
                    score: score - 5 // Slightly lower priority than domains
                })
            }
        }

        // 3. Archived (closed) trails
        for (const closed of closedTrails) {
            const rootNode = closed.rootNode
            const titleScore = fuzzyMatch(q, rootNode.title || '')
            const urlScore = fuzzyMatch(q, rootNode.url || '')
            const score = Math.max(titleScore, urlScore)
            if (score > 0) {
                results.push({
                    type: 'archived',
                    title: rootNode.customName || rootNode.title || rootNode.url || 'Archived Trail',
                    url: rootNode.url,
                    favicon: rootNode.favicon,
                    icon: '📦',
                    score: score - 10 // Lower priority
                })
            }
        }

        // Sort by score (highest first) and limit results
        results.sort((a, b) => b.score - a.score)
        setSuggestions(results.slice(0, 8))

        // Reset selected index when suggestions change
        onSelectedIndexChange(0)
    }, [query, nodes, closedTrails, onSelectedIndexChange])

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current && selectedIndex >= 0) {
            const items = listRef.current.querySelectorAll('[data-suggestion-item]')
            if (items[selectedIndex]) {
                items[selectedIndex].scrollIntoView({ block: 'nearest' })
            }
        }
    }, [selectedIndex])

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (suggestions.length === 0) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                onSelectedIndexChange(Math.min(selectedIndex + 1, suggestions.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                onSelectedIndexChange(Math.max(selectedIndex - 1, 0))
                break
            case 'Enter':
                e.preventDefault()
                if (suggestions[selectedIndex]) {
                    onSelect(suggestions[selectedIndex].url)
                }
                break
            case 'Escape':
                e.preventDefault()
                onClose()
                break
        }
    }, [suggestions, selectedIndex, onSelect, onClose, onSelectedIndexChange])

    if (!isVisible || suggestions.length === 0) return null

    const getTypeLabel = (type: Suggestion['type']) => {
        switch (type) {
            case 'domain': return '🌐'
            case 'trail': return '🔗'
            case 'archived': return '📦'
            case 'history': return '🕐'
            default: return ''
        }
    }

    return (
        <div
            ref={listRef}
            className="search-suggestions"
            style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                maxHeight: '300px',
                overflowY: 'auto',
                padding: '4px'
            }}
            onKeyDown={handleKeyDown}
        >
            {suggestions.map((suggestion, index) => (
                <div
                    key={`${suggestion.type}-${suggestion.url}-${index}`}
                    data-suggestion-item
                    onClick={() => onSelect(suggestion.url)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        backgroundColor: index === selectedIndex ? '#3a3a3a' : 'transparent',
                        transition: 'background-color 0.1s'
                    }}
                    onMouseEnter={() => onSelectedIndexChange(index)}
                >
                    {/* Icon/Favicon */}
                    <span style={{ fontSize: '16px', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                        {suggestion.favicon ? (
                            <img
                                src={suggestion.favicon}
                                alt=""
                                style={{ width: '16px', height: '16px', borderRadius: '2px' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                        ) : (
                            suggestion.icon || getTypeLabel(suggestion.type)
                        )}
                    </span>

                    {/* Title & URL */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            color: '#fff',
                            fontSize: '13px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {suggestion.title}
                        </div>
                        <div style={{
                            color: '#888',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {suggestion.url}
                        </div>
                    </div>

                    {/* Type badge */}
                    <span style={{
                        fontSize: '10px',
                        color: '#666',
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        backgroundColor: '#333',
                        borderRadius: '4px'
                    }}>
                        {suggestion.type}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default SearchSuggestions
