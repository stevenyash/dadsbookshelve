/**
 * DBS Theme Configuration
 * Based on old Quasar theme colors
 */

export const themeConfig = {
  // Brand colors
  colors: {
    primary: '#027be3',    // Light blue - main brand
    secondary: '#26a69a',   // Teal
    accent: '#aa3bff',      // Purple accent
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
    light: '#e3f2fd',
    dark: '#1a1a2e',
  },
  
  // Book reader themes
  readerThemes: [
    { name: 'Light', background: '#ffffff', color: '#333333' },
    { name: 'Dark', background: '#1a1a2e', color: '#e0e0e0' },
    { name: 'Sepia', background: '#f4ecd8', color: '#5b4636' },
  ] as const,
  
  // App name
  appName: "DAD'S BOOKSHELVES (DBS)",
  shortName: 'DBS',
  
  // PWA
  pwa: {
    name: "DAD'S BOOKSHELVES",
    shortName: 'DBS',
    themeColor: '#027be3',
    backgroundColor: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
  },
  
  // API
  api: {
    devUrl: 'http://localhost:8060',
    prodUrl: 'https://api.dadsbookshelves.co.ke',
  },
} as const

export type ReaderTheme = typeof themeConfig.readerThemes[number]

// Default reader theme
export const defaultReaderTheme = themeConfig.readerThemes[0]

export default themeConfig