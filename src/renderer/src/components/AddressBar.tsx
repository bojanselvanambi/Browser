import React, { useState, useEffect } from 'react'

interface AddressBarProps {
    url: string
    onNavigate: (url: string) => void
    disabled?: boolean
}

export function AddressBar({ url, onNavigate, disabled }: AddressBarProps) {
    const [inputVal, setInputVal] = useState(url)

    useEffect(() => {
        setInputVal(url)
    }, [url])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onNavigate(inputVal)
        }
    }

    return (
        <div style={{
            height: '50px',
            backgroundColor: '#1E1E1E',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            borderBottom: '1px solid #444444'
        }}>
            <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder="Search or enter website name"
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: '#1A1A1A',
                    color: 'white',
                    outline: 'none',
                    fontSize: '14px'
                }}
            />
        </div>
    )
}
