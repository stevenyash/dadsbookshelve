export async function decryptEpub(
  encryptedBuffer: ArrayBuffer, 
  keyBase64: string, 
  ivBase64: string
): Promise<ArrayBuffer> {
  try {
    const keyBuffer = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0))
    const ivBuffer = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
    
    const key = await crypto.subtle.importKey(
      'raw', keyBuffer, { name: 'AES-CBC' }, false, ['decrypt']
    )
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: ivBuffer }, key, encryptedBuffer
    )
    
    return decrypted
  } catch (err) {
    console.error('Decryption failed:', err)
    throw new Error('Failed to decrypt book')
  }
}