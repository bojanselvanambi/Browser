import { useState, useEffect } from 'react'

export interface ToastMessage {
    id: string
    message: string
    type: 'error' | 'success' | 'info'
}

interface ToastProps {
    messages: ToastMessage[]
    onDismiss: (id: string) => void
}

export function Toast({ messages, onDismiss }: ToastProps) {
    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 9999,
                pointerEvents: 'none'
            }}
        >
            {messages.map((msg) => (
                <ToastItem key={msg.id} message={msg} onDismiss={onDismiss} />
            ))}
        </div>
    )
}

function ToastItem({ message, onDismiss }: { message: ToastMessage; onDismiss: (id: string) => void }) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Fade in
        setTimeout(() => setIsVisible(true), 10)

        // Auto-dismiss after 4 seconds
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(() => onDismiss(message.id), 300)
        }, 4000)

        return () => clearTimeout(timer)
    }, [message.id, onDismiss])

    const bgColor = message.type === 'error' ? '#ef4444' : message.type === 'success' ? '#22c55e' : '#3b82f6'

    return (
        <div
            onClick={() => {
                setIsVisible(false)
                setTimeout(() => onDismiss(message.id), 300)
            }}
            style={{
                padding: '12px 16px',
                backgroundColor: bgColor,
                color: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                fontSize: '13px',
                maxWidth: '300px',
                cursor: 'pointer',
                pointerEvents: 'auto',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease'
            }}
        >
            {message.message}
        </div>
    )
}
