/**
 * Password Store - Highly Secure Credential Management
 * 
 * Security Architecture:
 * - Key Derivation: PBKDF2-SHA256 (300,000 iterations) - industry standard used by 1Password, LastPass
 * - Encryption: AES-256-GCM (authenticated encryption) via Web Crypto API
 * - Master password never stored, only used to derive encryption key
 * - All credentials encrypted at rest
 */

export interface Credential {
  id: string
  website: string           // e.g., "github.com"
  username: string
  password: string          // Stored encrypted
  notes?: string            // Stored encrypted
  category: 'login' | 'note' | 'card'
  createdAt: number
  updatedAt: number
  favicon?: string
}

export interface PasswordVault {
  credentials: Credential[]
  salt: string              // For PBKDF2
  masterPasswordHash: string // To verify master password without storing it
  version: number
}

const STORAGE_KEY = 'trails_password_vault_v1'
const VAULT_VERSION = 1

// PBKDF2 parameters (OWASP 2023 recommended)
const PBKDF2_ITERATIONS = 310000  // OWASP recommended minimum

// Convert string to Uint8Array
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

// Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

// Generate random bytes for salt/IV
function generateRandomBytes(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return bytesToHex(array)
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

// Derive encryption key from master password using PBKDF2
async function deriveKey(masterPassword: string, salt: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    stringToBytes(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBytes(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Encrypt data using AES-256-GCM
async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = stringToBytes(plaintext)
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  
  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  
  return bytesToHex(combined)
}

// Decrypt data using AES-256-GCM
async function decrypt(ciphertext: string, key: CryptoKey): Promise<string> {
  const combined = hexToBytes(ciphertext)
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )
    
    return new TextDecoder().decode(plaintext)
  } catch {
    return ''
  }
}

// Hash master password for verification (not the actual password)
async function hashMasterPassword(masterPassword: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    stringToBytes(masterPassword + ':verification'),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(salt + 'verify'),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )
  
  return bytesToHex(new Uint8Array(bits))
}

// ========== Public API ==========

// Check if vault exists
export function vaultExists(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

// Create new vault with master password
export async function createVault(masterPassword: string): Promise<void> {
  const salt = generateRandomBytes(32)
  const masterPasswordHash = await hashMasterPassword(masterPassword, salt)
  
  const vault: PasswordVault = {
    credentials: [],
    salt,
    masterPasswordHash,
    version: VAULT_VERSION
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault))
}

// Verify master password
export async function verifyMasterPassword(masterPassword: string): Promise<boolean> {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return false
  
  try {
    const vault: PasswordVault = JSON.parse(saved)
    const hash = await hashMasterPassword(masterPassword, vault.salt)
    return hash === vault.masterPasswordHash
  } catch {
    return false
  }
}

// Load and decrypt credentials
export async function loadCredentials(masterPassword: string): Promise<Credential[]> {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return []
  
  try {
    const vault: PasswordVault = JSON.parse(saved)
    const key = await deriveKey(masterPassword, vault.salt)
    
    // Decrypt each credential's sensitive fields
    const decrypted = await Promise.all(vault.credentials.map(async cred => ({
      ...cred,
      password: cred.password ? await decrypt(cred.password, key) : '',
      notes: cred.notes ? await decrypt(cred.notes, key) : undefined
    })))
    
    return decrypted
  } catch (e) {
    console.error('Failed to load credentials:', e)
    return []
  }
}

// Save credential (encrypts sensitive fields)
export async function saveCredential(masterPassword: string, credential: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>): Promise<Credential | null> {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return null
  
  try {
    const vault: PasswordVault = JSON.parse(saved)
    const key = await deriveKey(masterPassword, vault.salt)
    
    const now = Date.now()
    const newCredential: Credential = {
      ...credential,
      id: generateId(),
      password: await encrypt(credential.password, key),
      notes: credential.notes ? await encrypt(credential.notes, key) : undefined,
      createdAt: now,
      updatedAt: now
    }
    
    vault.credentials.push(newCredential)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vault))
    
    // Return decrypted version
    return {
      ...newCredential,
      password: credential.password,
      notes: credential.notes
    }
  } catch (e) {
    console.error('Failed to save credential:', e)
    return null
  }
}

// Update credential
export async function updateCredential(masterPassword: string, id: string, updates: Partial<Omit<Credential, 'id' | 'createdAt'>>): Promise<boolean> {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return false
  
  try {
    const vault: PasswordVault = JSON.parse(saved)
    const key = await deriveKey(masterPassword, vault.salt)
    
    const index = vault.credentials.findIndex(c => c.id === id)
    if (index === -1) return false
    
    vault.credentials[index] = {
      ...vault.credentials[index],
      ...updates,
      password: updates.password ? await encrypt(updates.password, key) : vault.credentials[index].password,
      notes: updates.notes !== undefined 
        ? (updates.notes ? await encrypt(updates.notes, key) : undefined) 
        : vault.credentials[index].notes,
      updatedAt: Date.now()
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vault))
    return true
  } catch (e) {
    console.error('Failed to update credential:', e)
    return false
  }
}

// Delete credential
export function deleteCredential(id: string): boolean {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return false
  
  try {
    const vault: PasswordVault = JSON.parse(saved)
    vault.credentials = vault.credentials.filter(c => c.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vault))
    return true
  } catch (e) {
    console.error('Failed to delete credential:', e)
    return false
  }
}

// Generate secure random password
export function generatePassword(length = 20, options?: {
  uppercase?: boolean
  lowercase?: boolean
  numbers?: boolean
  symbols?: boolean
}): string {
  const opts = {
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    ...options
  }
  
  let chars = ''
  if (opts.uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (opts.lowercase) chars += 'abcdefghijklmnopqrstuvwxyz'
  if (opts.numbers) chars += '0123456789'
  if (opts.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  
  return Array.from(array, x => chars[x % chars.length]).join('')
}

// Calculate password strength (0-100)
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0
  
  let score = 0
  
  // Length score (up to 40 points)
  score += Math.min(password.length * 4, 40)
  
  // Variety score (up to 40 points)
  if (/[a-z]/.test(password)) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^a-zA-Z0-9]/.test(password)) score += 10
  
  // Bonus for mixed characters (up to 20 points)
  const varieties = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(rx => rx.test(password)).length
  score += varieties * 5
  
  // Penalty for common patterns
  if (/^[a-z]+$|^[A-Z]+$|^[0-9]+$/i.test(password)) score -= 10
  if (/(.)\1{2,}/.test(password)) score -= 10
  if (/^(password|123456|qwerty)/i.test(password)) score -= 30
  
  return Math.max(0, Math.min(100, score))
}

// Get strength label
export function getStrengthLabel(strength: number): string {
  if (strength < 20) return 'Very Weak'
  if (strength < 40) return 'Weak'
  if (strength < 60) return 'Fair'
  if (strength < 80) return 'Strong'
  return 'Very Strong'
}

// Get strength color
export function getStrengthColor(strength: number): string {
  if (strength < 20) return '#ef4444'
  if (strength < 40) return '#f97316'
  if (strength < 60) return '#eab308'
  if (strength < 80) return '#22c55e'
  return '#10b981'
}

// Change master password
export async function changeMasterPassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const isValid = await verifyMasterPassword(oldPassword)
  if (!isValid) return false
  
  const credentials = await loadCredentials(oldPassword)
  
  // Create new vault with new password
  const salt = generateRandomBytes(32)
  const masterPasswordHash = await hashMasterPassword(newPassword, salt)
  const key = await deriveKey(newPassword, salt)
  
  // Re-encrypt all credentials with new key
  const encryptedCredentials = await Promise.all(credentials.map(async cred => ({
    ...cred,
    password: await encrypt(cred.password, key),
    notes: cred.notes ? await encrypt(cred.notes, key) : undefined
  })))
  
  const vault: PasswordVault = {
    credentials: encryptedCredentials,
    salt,
    masterPasswordHash,
    version: VAULT_VERSION
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vault))
  return true
}

// Delete entire vault
export function deleteVault(): void {
  localStorage.removeItem(STORAGE_KEY)
}
