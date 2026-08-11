const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

interface TokenData {
  token: string
  expiresAt?: number
}

export const tokenStorage = {
  getToken(): string | null {
    try {
      const stored = localStorage.getItem(TOKEN_KEY)
      if (!stored) return null
      
      const data: TokenData = JSON.parse(stored)
      
      if (data.expiresAt && Date.now() > data.expiresAt) {
        this.clearToken()
        return null
      }
      
      return data.token
    } catch {
      return localStorage.getItem(TOKEN_KEY)
    }
  },

  setToken(token: string, expiresInSeconds?: number): void {
    const data: TokenData = {
      token,
      expiresAt: expiresInSeconds 
        ? Date.now() + expiresInSeconds * 1000 
        : undefined
    }
    localStorage.setItem(TOKEN_KEY, JSON.stringify(data))
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },

  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },

  hasToken(): boolean {
    return this.getToken() !== null
  },

  removeAuthData(): void {
    this.clearToken()
    localStorage.removeItem('auth-storage')
  }
}

export default tokenStorage