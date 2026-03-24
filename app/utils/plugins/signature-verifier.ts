import type { RemotePlugin } from './plugin-types'

export async function verifyPluginSignature(
  metadata: RemotePlugin,
  code: string
): Promise<boolean> {
  try {
    const codeBuffer = new TextEncoder().encode(code)
    const hashBuffer = await crypto.subtle.digest('SHA-256', codeBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    if (computedHash !== metadata.codeHash) {
      console.error('Plugin code hash mismatch')
      console.error('Expected:', metadata.codeHash)
      console.error('Got:', computedHash)
      return false
    }
    
    const publicKeyBuffer = base64ToArrayBuffer(metadata.publicKey)
    const signatureBuffer = base64ToArrayBuffer(metadata.signature)
    
    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    )
    
    const metadataToSign = JSON.stringify({
      id: metadata.id,
      name: metadata.name,
      version: metadata.version,
      codeHash: metadata.codeHash,
      permissions: metadata.permissions
    })
    
    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signatureBuffer,
      new TextEncoder().encode(metadataToSign)
    )
    
    return isValid
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

export async function computeCodeHash(code: string): Promise<string> {
  const codeBuffer = new TextEncoder().encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', codeBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function signPluginMetadata(
  metadata: {
    id: string
    name: string
    version: string
    codeHash: string
    permissions: string[]
  },
  privateKey: CryptoKey
): Promise<string> {
  const dataToSign = JSON.stringify(metadata)
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(dataToSign)
  )
  
  return arrayBufferToBase64(signatureBuffer)
}

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    true,
    ['sign', 'verify']
  )
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey)
  return arrayBufferToBase64(exported)
}

export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('pkcs8', privateKey)
  return arrayBufferToBase64(exported)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function validatePluginIntegrity(
  plugin: RemotePlugin,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const signatureValid = await verifyPluginSignature(plugin, code)
    
    if (!signatureValid) {
      return {
        valid: false,
        error: 'Plugin signature verification failed'
      }
    }
    
    const requiredFields = ['id', 'name', 'version', 'codeHash', 'publicKey', 'signature', 'permissions']
    for (const field of requiredFields) {
      if (!plugin[field as keyof RemotePlugin]) {
        return {
          valid: false,
          error: `Missing required field: ${field}`
        }
      }
    }
    
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    }
  }
}
