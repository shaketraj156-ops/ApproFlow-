/**
 * Intelligent Mock Mode Detector
 * 
 * Returns true if:
 * 0. A demo session (placeholder token) always uses mocks
 * 1. Explicitly enabled via VITE_USE_MOCKS=true
 * 2. In production (e.g. Vercel) and VITE_API_URL is missing, pointing to localhost, or has placeholder like [AAPKA-RENDER-URL]
 * 3. Fallback when network connectivity to backend fails
 */
export function shouldUseMocks() {
  const envMock = import.meta.env.VITE_USE_MOCKS;
  if (envMock === 'true') return true;

  // A demo persona signs in with a placeholder token that a real backend always rejects (401 "Invalid or expired
  // authorization token"). Reads used to fall back to mock data after failing, but writes such as scheduling a
  // visit had no fallback, so the whole demo session uses mock data from the start.
  if (typeof localStorage !== 'undefined' && localStorage.getItem('approflow_token') === 'mock_jwt_token_approflow') return true;
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
