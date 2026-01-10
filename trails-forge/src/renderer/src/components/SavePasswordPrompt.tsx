import { motion, AnimatePresence } from 'framer-motion'
import { saveCredential } from '../stores/passwordStore'

interface DetectedCredentials {
    website: string
    url: string
    username: string
    password: string
}

interface SavePasswordPromptProps {
    credentials: DetectedCredentials | null
    masterPassword: string | null
    onSave: () => void
    onDismiss: () => void
    onNeedMasterPassword: () => void
}

export function SavePasswordPrompt({
    credentials,
    masterPassword,
    onSave,
    onDismiss,
    onNeedMasterPassword
}: SavePasswordPromptProps) {
    if (!credentials) return null

    const handleSave = async () => {
        if (!masterPassword) {
            onNeedMasterPassword()
            return
        }

        await saveCredential(masterPassword, {
            website: credentials.website,
            username: credentials.username,
            password: credentials.password,
            category: 'login',
            favicon: `https://www.google.com/s2/favicons?domain=${credentials.website}&sz=32`
        })
        onSave()
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                    position: 'fixed',
                    top: '40px',
                    right: '16px',
                    zIndex: 10000,
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    maxWidth: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                        src={`https://www.google.com/s2/favicons?domain=${credentials.website}&sz=32`}
                        alt=""
                        style={{ width: '20px', height: '20px', borderRadius: '4px' }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>
                            Save password for {credentials.website}?
                        </div>
                        <div style={{ color: '#888', fontSize: '11px' }}>
                            {credentials.username}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onDismiss}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: '#333',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#888',
                            fontSize: '11px',
                            cursor: 'pointer'
                        }}
                    >
                        Not Now
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        Save
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

export default SavePasswordPrompt
