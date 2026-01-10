import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Credential,
    vaultExists,
    createVault,
    verifyMasterPassword,
    loadCredentials,
    saveCredential,
    deleteCredential,
    generatePassword,
    calculatePasswordStrength,
    getStrengthLabel,
    getStrengthColor
} from '../stores/passwordStore'

// Icons
const KeyIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
)

const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
)

const EyeOffIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
)

const CopyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
)

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
)

const PlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
    </svg>
)

const CrossIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6L6 18M6 6l12 12" />
    </svg>
)

const RefreshIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 4v6h-6M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
)

const SearchIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
    </svg>
)

interface PasswordManagerSheetProps {
    isOpen: boolean
    onClose: () => void
    currentUrl?: string
}

export function PasswordManagerSheet({ isOpen, onClose, currentUrl }: PasswordManagerSheetProps) {
    const [masterPassword, setMasterPassword] = useState('')
    const [isUnlocked, setIsUnlocked] = useState(false)
    const [isCreatingVault, setIsCreatingVault] = useState(false)
    const [credentials, setCredentials] = useState<Credential[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddForm, setShowAddForm] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // New credential form
    const [newWebsite, setNewWebsite] = useState('')
    const [newUsername, setNewUsername] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [newNotes, setNewNotes] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Password generator options
    const [genLength, setGenLength] = useState(20)
    const [genUppercase, setGenUppercase] = useState(true)
    const [genLowercase, setGenLowercase] = useState(true)
    const [genNumbers, setGenNumbers] = useState(true)
    const [genSymbols, setGenSymbols] = useState(true)

    const masterPasswordInputRef = useRef<HTMLInputElement>(null)

    // Reset state when sheet closes
    useEffect(() => {
        if (!isOpen) {
            setMasterPassword('')
            setIsUnlocked(false)
            setError('')
            setShowAddForm(false)
            setNewWebsite('')
            setNewUsername('')
            setNewPassword('')
            setNewNotes('')
        } else {
            setIsCreatingVault(!vaultExists())
            setTimeout(() => masterPasswordInputRef.current?.focus(), 100)
        }
    }, [isOpen])

    // Load credentials when unlocked
    const handleUnlock = useCallback(async () => {
        if (!masterPassword) return

        setLoading(true)
        setError('')

        try {
            if (isCreatingVault) {
                await createVault(masterPassword)
                setCredentials([])
                setIsUnlocked(true)
            } else {
                const isValid = await verifyMasterPassword(masterPassword)
                if (isValid) {
                    const creds = await loadCredentials(masterPassword)
                    setCredentials(creds)
                    setIsUnlocked(true)
                } else {
                    setError('Incorrect master password')
                }
            }
        } catch (e) {
            setError('Failed to unlock vault')
            console.error(e)
        }

        setLoading(false)
    }, [masterPassword, isCreatingVault])

    // Filter credentials by search
    const filteredCredentials = useMemo(() => {
        const q = searchQuery.toLowerCase()
        return credentials.filter(c =>
            c.website.toLowerCase().includes(q) ||
            c.username.toLowerCase().includes(q)
        )
    }, [credentials, searchQuery])

    // Add new credential
    const handleAddCredential = useCallback(async () => {
        if (!newWebsite || !newUsername || !newPassword) return

        setLoading(true)
        const result = await saveCredential(masterPassword, {
            website: newWebsite,
            username: newUsername,
            password: newPassword,
            notes: newNotes || undefined,
            category: 'login',
            favicon: `https://www.google.com/s2/favicons?domain=${newWebsite}&sz=32`
        })

        if (result) {
            setCredentials(prev => [...prev, result])
            setNewWebsite('')
            setNewUsername('')
            setNewPassword('')
            setNewNotes('')
            setShowAddForm(false)
        }
        setLoading(false)
    }, [masterPassword, newWebsite, newUsername, newPassword, newNotes])

    // Delete credential
    const handleDelete = useCallback((id: string) => {
        if (deleteCredential(id)) {
            setCredentials(prev => prev.filter(c => c.id !== id))
        }
    }, [])

    // Copy to clipboard
    const handleCopy = useCallback((text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }, [])

    // Generate password
    const handleGenerate = useCallback(() => {
        const password = generatePassword(genLength, {
            uppercase: genUppercase,
            lowercase: genLowercase,
            numbers: genNumbers,
            symbols: genSymbols
        })
        setNewPassword(password)
    }, [genLength, genUppercase, genLowercase, genNumbers, genSymbols])

    // Password strength
    const passwordStrength = useMemo(() => calculatePasswordStrength(newPassword), [newPassword])

    // Pre-fill website from current URL
    useEffect(() => {
        if (showAddForm && currentUrl) {
            try {
                const url = new URL(currentUrl)
                setNewWebsite(url.hostname)
            } catch {
                // Invalid URL
            }
        }
    }, [showAddForm, currentUrl])

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
                        zIndex: 1001,
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
                            <KeyIcon />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Password Manager</span>
                        </div>

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

                    {/* Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                        {!isUnlocked ? (
                            // Unlock / Create vault screen
                            <div style={{ maxWidth: '300px', margin: '0 auto', textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                                <h3 style={{ color: '#fff', marginBottom: '8px' }}>
                                    {isCreatingVault ? 'Create Your Vault' : 'Unlock Your Vault'}
                                </h3>
                                <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>
                                    {isCreatingVault
                                        ? 'Choose a strong master password to protect your credentials.'
                                        : 'Enter your master password to access your credentials.'}
                                </p>

                                <input
                                    ref={masterPasswordInputRef}
                                    type="password"
                                    value={masterPassword}
                                    onChange={(e) => setMasterPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                    placeholder="Master Password"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: '#222',
                                        border: error ? '1px solid #ef4444' : '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        marginBottom: '12px',
                                        outline: 'none'
                                    }}
                                />

                                {error && (
                                    <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>{error}</p>
                                )}

                                {isCreatingVault && masterPassword && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                            <span style={{ color: '#888' }}>Strength</span>
                                            <span style={{ color: getStrengthColor(calculatePasswordStrength(masterPassword)) }}>
                                                {getStrengthLabel(calculatePasswordStrength(masterPassword))}
                                            </span>
                                        </div>
                                        <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${calculatePasswordStrength(masterPassword)}%`,
                                                    backgroundColor: getStrengthColor(calculatePasswordStrength(masterPassword)),
                                                    transition: 'all 0.2s'
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleUnlock}
                                    disabled={loading || !masterPassword}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#3b82f6',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        cursor: loading ? 'wait' : 'pointer',
                                        opacity: loading || !masterPassword ? 0.6 : 1
                                    }}
                                >
                                    {loading ? 'Unlocking...' : (isCreatingVault ? 'Create Vault' : 'Unlock')}
                                </button>
                            </div>
                        ) : showAddForm ? (
                            // Add credential form
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ color: '#fff', fontSize: '14px' }}>Add Credential</h3>
                                    <button
                                        onClick={() => setShowAddForm(false)}
                                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                                    >
                                        <CrossIcon />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <input
                                        type="text"
                                        value={newWebsite}
                                        onChange={(e) => setNewWebsite(e.target.value)}
                                        placeholder="Website (e.g., github.com)"
                                        style={{
                                            padding: '10px 12px',
                                            backgroundColor: '#222',
                                            border: '1px solid #333',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '13px',
                                            outline: 'none'
                                        }}
                                    />

                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        placeholder="Username or Email"
                                        style={{
                                            padding: '10px 12px',
                                            backgroundColor: '#222',
                                            border: '1px solid #333',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '13px',
                                            outline: 'none'
                                        }}
                                    />

                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Password"
                                            style={{
                                                width: '100%',
                                                padding: '10px 80px 10px 12px',
                                                backgroundColor: '#222',
                                                border: '1px solid #333',
                                                borderRadius: '6px',
                                                color: '#fff',
                                                fontSize: '13px',
                                                outline: 'none'
                                            }}
                                        />
                                        <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
                                            <button
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
                                            >
                                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                            </button>
                                            <button
                                                onClick={handleGenerate}
                                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
                                                title="Generate Password"
                                            >
                                                <RefreshIcon />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password strength indicator */}
                                    {newPassword && (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                                <span style={{ color: '#888' }}>Strength</span>
                                                <span style={{ color: getStrengthColor(passwordStrength) }}>
                                                    {getStrengthLabel(passwordStrength)}
                                                </span>
                                            </div>
                                            <div style={{ height: '4px', backgroundColor: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        width: `${passwordStrength}%`,
                                                        backgroundColor: getStrengthColor(passwordStrength),
                                                        transition: 'all 0.2s'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Generator options */}
                                    <div style={{ backgroundColor: '#222', padding: '12px', borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <span style={{ color: '#888', fontSize: '11px' }}>Length:</span>
                                            <input
                                                type="range"
                                                min="8"
                                                max="32"
                                                value={genLength}
                                                onChange={(e) => setGenLength(Number(e.target.value))}
                                                style={{ flex: 1 }}
                                            />
                                            <span style={{ color: '#fff', fontSize: '11px', width: '20px' }}>{genLength}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {[
                                                { label: 'ABC', state: genUppercase, set: setGenUppercase },
                                                { label: 'abc', state: genLowercase, set: setGenLowercase },
                                                { label: '123', state: genNumbers, set: setGenNumbers },
                                                { label: '#$%', state: genSymbols, set: setGenSymbols },
                                            ].map(opt => (
                                                <button
                                                    key={opt.label}
                                                    onClick={() => opt.set(!opt.state)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        backgroundColor: opt.state ? '#3b82f6' : '#333',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        color: '#fff',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <textarea
                                        value={newNotes}
                                        onChange={(e) => setNewNotes(e.target.value)}
                                        placeholder="Notes (optional)"
                                        rows={2}
                                        style={{
                                            padding: '10px 12px',
                                            backgroundColor: '#222',
                                            border: '1px solid #333',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '13px',
                                            outline: 'none',
                                            resize: 'none'
                                        }}
                                    />

                                    <button
                                        onClick={handleAddCredential}
                                        disabled={loading || !newWebsite || !newUsername || !newPassword}
                                        style={{
                                            padding: '12px',
                                            backgroundColor: '#3b82f6',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            opacity: !newWebsite || !newUsername || !newPassword ? 0.6 : 1
                                        }}
                                    >
                                        Save Credential
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Credentials list
                            <div>
                                {/* Search */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: '#222',
                                    borderRadius: '8px',
                                    border: '1px solid #333',
                                    marginBottom: '12px'
                                }}>
                                    <SearchIcon />
                                    <input
                                        type="text"
                                        placeholder="Search credentials..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{
                                            flex: 1,
                                            background: 'none',
                                            border: 'none',
                                            color: '#fff',
                                            fontSize: '13px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                {/* Credentials */}
                                {filteredCredentials.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                                        <KeyIcon />
                                        <p style={{ marginTop: '12px', fontSize: '13px' }}>
                                            {searchQuery ? 'No credentials found' : 'No credentials saved yet'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredCredentials.map(cred => (
                                        <div
                                            key={cred.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '12px',
                                                backgroundColor: '#222',
                                                borderRadius: '8px',
                                                marginBottom: '8px'
                                            }}
                                        >
                                            {cred.favicon ? (
                                                <img src={cred.favicon} alt="" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
                                            ) : (
                                                <KeyIcon />
                                            )}

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>{cred.website}</div>
                                                <div style={{ color: '#888', fontSize: '11px' }}>{cred.username}</div>
                                            </div>

                                            <button
                                                onClick={() => handleCopy(cred.username, cred.id + '-user')}
                                                title="Copy username"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '28px',
                                                    height: '28px',
                                                    background: copiedId === cred.id + '-user' ? '#22c55e' : '#333',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    color: '#fff',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <CopyIcon />
                                            </button>

                                            <button
                                                onClick={() => handleCopy(cred.password, cred.id + '-pass')}
                                                title="Copy password"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '28px',
                                                    height: '28px',
                                                    background: copiedId === cred.id + '-pass' ? '#22c55e' : '#3b82f6',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    color: '#fff',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🔑
                                            </button>

                                            <button
                                                onClick={() => handleDelete(cred.id)}
                                                title="Delete"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '28px',
                                                    height: '28px',
                                                    background: '#333',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    color: '#888',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer - Add button when unlocked */}
                    {isUnlocked && !showAddForm && (
                        <div style={{
                            padding: '6px 8px',
                            borderTop: '1px solid #333'
                        }}>
                            <button
                                onClick={() => setShowAddForm(true)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    padding: '6px',
                                    backgroundColor: '#3b82f6',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                <PlusIcon />
                                Add Credential
                            </button>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default PasswordManagerSheet
