/**
 * Intelligent Mock Mode Detector
 * 
 * Returns true if:
 * 1. Explicitly enabled via VITE_USE_MOCKS=true
 * 2. In production (e.g. Vercel) and VITE_API_URL is missing, pointing to localhost, or has placeholder like [AAPKA-RENDER-URL]
 * 3. Fallback when network connectivity to backend fails
 */
export function shouldUseMocks() {
  const envMock = import.meta.env.VITE_USE_MOCKS;
  if (envMock === 'true') return true;
  if (envMock === 'false') return false;

  const apiUrl = (import.meta.env.VITE_API_URL || '').trim();
  const isPlaceholder = !apiUrl || apiUrl.includes('[AAPKA') || apiUrl.includes('placeholder') || apiUrl.includes('your-backend');
  const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const isLocalhostInProd = isProd && apiUrl.includes('localhost');

  if (isPlaceholder || isLocalhostInProd) {
    return true;
  }

  return false;
}
