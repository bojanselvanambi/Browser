import React, { useState, useEffect } from 'react'

type SearchEngine = 'grok' | 'google' | 'duckduckgo' | 'bing' | 'ecosia'

declare global {
    interface Window {
        settingsAPI?: {
            getSettings: () => Promise<{ searchEngine?: SearchEngine; adblockEnabled?: boolean }>
            setSearchEngine: (engine: string) => void
            setAdblock: (enabled: boolean) => void
        }
    }
}

const SettingsPage: React.FC = () => {
    const [searchEngine, setSearchEngine] = useState<SearchEngine>('grok')
    const [adblockEnabled, setAdblockEnabled] = useState(true)
    const [statusMessage, setStatusMessage] = useState<string | null>(null)

    useEffect(() => {
        if (window.settingsAPI?.getSettings) {
            window.settingsAPI.getSettings().then((settings) => {
                if (settings?.searchEngine) setSearchEngine(settings.searchEngine)
                if (settings?.adblockEnabled !== undefined) setAdblockEnabled(settings.adblockEnabled)
            })
        }
    }, [])

    const showStatus = (message: string) => {
        setStatusMessage(message)
        setTimeout(() => setStatusMessage(null), 2000)
    }

    const handleSearchEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value as SearchEngine
        setSearchEngine(value)
        window.settingsAPI?.setSearchEngine(value)
        showStatus('Search engine changed to ' + value)
    }

    const handleAdblockToggle = () => {
        const newValue = !adblockEnabled
        setAdblockEnabled(newValue)
        window.settingsAPI?.setAdblock(newValue)
        showStatus('Content blocking ' + (newValue ? 'enabled' : 'disabled'))
    }

    return (
        <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: '#121212', color: '#E0E0E0', padding: '40px', minHeight: '100vh' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 500, marginBottom: '32px', color: '#FC93AD', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="5" stroke="#FC93AD" strokeWidth="2.5" fill="none" />
                    <path d="M14 3 L14 7" stroke="#FC93AD" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M14 21 L14 25" stroke="#FC93AD" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M3 14 L7 14" stroke="#FC93AD" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M21 14 L25 14" stroke="#FC93AD" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                Settings
            </h1>

            {/* Search Section */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#B0B0B0', marginBottom: '16px' }}>Search</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1E1E1E', borderRadius: '8px', marginBottom: '8px' }}>
                    <div>
                        <div style={{ fontSize: '15px' }}>Default Search Engine</div>
                        <div style={{ fontSize: '13px', color: '#B0B0B0', marginTop: '4px' }}>Choose your preferred search engine for new trails</div>
                    </div>
                    <select
                        value={searchEngine}
                        onChange={handleSearchEngineChange}
                        style={{ background: '#2a2a2a', color: '#E0E0E0', border: '1px solid #444444', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', minWidth: '150px' }}
                    >
                        <option value="grok">Grok</option>
                        <option value="google">Google</option>
                        <option value="duckduckgo">DuckDuckGo</option>
                        <option value="bing">Bing</option>
                        <option value="ecosia">Ecosia</option>
                    </select>
                </div>
            </div>

            {/* Privacy Section */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#B0B0B0', marginBottom: '16px' }}>Privacy</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1E1E1E', borderRadius: '8px' }}>
                    <div>
                        <div style={{ fontSize: '15px' }}>Content Blocking (uBlock Origin)</div>
                        <div style={{ fontSize: '13px', color: '#B0B0B0', marginTop: '4px' }}>Block ads and trackers for a faster browsing experience</div>
                    </div>
                    <div
                        onClick={handleAdblockToggle}
                        style={{ width: '44px', height: '24px', background: adblockEnabled ? '#FC93AD' : '#444444', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                        <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: adblockEnabled ? '22px' : '2px', transition: 'left 0.2s' }} />
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {statusMessage && (
                <div style={{ marginTop: '24px', padding: '12px', background: '#1E1E1E', borderRadius: '8px', fontSize: '13px', color: '#FC93AD' }}>
                    {statusMessage}
                </div>
            )}

            {/* Version */}
            <div style={{ marginTop: '48px', textAlign: 'center', color: '#B0B0B0', fontSize: '13px' }}>
                Trails Browser v1.0.0
            </div>
        </div>
    )
}

export default SettingsPage
