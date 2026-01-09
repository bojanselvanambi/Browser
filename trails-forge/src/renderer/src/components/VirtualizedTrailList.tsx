import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { TrailNode } from '../types'

const ITEM_HEIGHT = 28 // px per trail item
const OVERSCAN = 5 // Extra items to render above/below viewport

export interface FlattenedItem {
    id: string
    node: TrailNode
    depth: number
    isVisible: boolean
}

interface VirtualizedTrailListProps {
    nodes: Record<string, TrailNode>
    rootNodeIds: string[]
    renderItem: (item: FlattenedItem, style: React.CSSProperties) => React.ReactNode
}

// Flatten tree into visible items respecting expansion state
function flattenTree(
    nodes: Record<string, TrailNode>,
    rootNodeIds: string[],
    depth = 0
): FlattenedItem[] {
    const result: FlattenedItem[] = []

    for (const id of rootNodeIds) {
        const node = nodes[id]
        if (!node) continue

        result.push({ id, node, depth, isVisible: true })

        // Recursively add children if expanded
        if (node.isExpanded && node.children.length > 0) {
            const childItems = flattenTree(nodes, node.children, depth + 1)
            result.push(...childItems)
        }
    }

    return result
}

export function VirtualizedTrailList({
    nodes,
    rootNodeIds,
    renderItem
}: VirtualizedTrailListProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [scrollTop, setScrollTop] = useState(0)
    const [containerHeight, setContainerHeight] = useState(0)

    // Flatten tree into array of items
    const flatItems = useMemo(
        () => flattenTree(nodes, rootNodeIds),
        [nodes, rootNodeIds]
    )

    // Total height of all items
    const totalHeight = flatItems.length * ITEM_HEIGHT

    // Calculate which items are visible
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN)
    const endIndex = Math.min(
        flatItems.length,
        Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN
    )

    const visibleItems = flatItems.slice(startIndex, endIndex)

    // Scroll handler
    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop)
    }, [])

    // Measure container on mount and resize
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height)
            }
        })

        observer.observe(container)
        setContainerHeight(container.clientHeight)

        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            style={{
                flex: 1,
                overflow: 'auto',
                position: 'relative'
            }}
        >
            {/* Spacer to maintain scroll height */}
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleItems.map((item, i) => {
                    const actualIndex = startIndex + i
                    const topOffset = actualIndex * ITEM_HEIGHT
                    const style: React.CSSProperties = {
                        position: 'absolute',
                        top: topOffset,
                        left: 0,
                        right: 0,
                        height: ITEM_HEIGHT
                    }
                    return renderItem(item, style)
                })}
            </div>
        </div>
    )
}
