const API_BASE = import.meta.env.VITE_API_URL;

export function getFileFullPath(path: string): string {
  if (!path) return '';
  if (isExternalFile(path)) return path;
  
  const cleanPath = path.replace(/^uploads\//, '');
  
  // Always use full API URL to bypass Vite proxy - go directly to API server
  return `${API_BASE}/uploads/${cleanPath}`;
}

export function isExternalFile(path: string): boolean {
  return path?.startsWith('http://') || path?.startsWith('https://') || path?.startsWith('data:');
}

export function setImgUrl(src: string | null | undefined, imgSize: 'small' | 'medium' | 'large' = 'small'): string {
  if (!src) return '/no-image.png';

  // Extract relative path from full URL or use as-is
  let relativePath = src;
  if (isExternalFile(src)) {
    // Extract path after API_BASE (e.g., "uploads/files/images_url/filename.jpg")
    const apiBase = API_BASE || '';
    if (src.startsWith(apiBase)) {
      relativePath = src.slice(apiBase.length).replace(/^\//, '');
    } else {
      // Unknown format - return as-is for external URLs
      return src;
    }
  }

  // Clean path - remove leading uploads/ to avoid double prefix
  let cleanSrc = relativePath.replace(/^uploads\//, '');

  // If already has size prefix (e.g., /small/, /medium/), use as-is
  if (cleanSrc.includes(`/${imgSize}/`) || cleanSrc.includes('/temp/')) {
    return getFileFullPath(cleanSrc);
  }

  // Get first path if multiple (comma-separated)
  const firstPath = cleanSrc.split(',')[0];

  // Insert size into path
  if (imgSize) {
    const paths = firstPath.split('/');
    paths.splice(-1, 0, imgSize);
    return getFileFullPath(paths.join('/'));
  }

  return getFileFullPath(firstPath);
}

// Test if image URL is accessible
export async function checkImageUrl(url: string): Promise<boolean> {
  if (!url || url === '/no-image.png') return false;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
}

export function joinPaths(paths: string[]): string {
  return paths.join('/').replace(/\/+/g, '/');
}

export const utils = {
  getFileFullPath,
  isExternalFile,
  setImgUrl,
  checkImageUrl,
  formatFileSize,
  formatReadingTime,
  joinPaths,
};

export default utils;