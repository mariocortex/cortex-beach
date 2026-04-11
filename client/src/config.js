// ============================================
// CONFIG — endpoints de ambiente
// ============================================
// REACT_APP_API_URL deve apontar para o backend (ex: https://api.seudominio.com)
// Em desenvolvimento, cai no fallback localhost:5001.

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
export const API_BASE = `${API_URL}/api`;

/**
 * Normaliza URLs de mídia salvas no banco.
 * Converte URLs com localhost para usar o API_URL correto e
 * garante que o path passe pelo prefixo /api/uploads.
 */
export function normalizeMediaUrl(url) {
  if (!url) return url;
  // Fix URLs pointing to localhost (saved before production fix)
  const localhostMatch = url.match(/^https?:\/\/localhost:\d+\/(?:api\/)?uploads\/(.+)$/);
  if (localhostMatch) {
    return `${API_URL}/api/uploads/${localhostMatch[1]}`;
  }
  // Fix URLs with /uploads but missing /api prefix (old production uploads)
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/uploads/') && !parsed.pathname.startsWith('/api/uploads/')) {
      parsed.pathname = '/api' + parsed.pathname;
      return parsed.toString();
    }
  } catch { /* not a valid URL, return as-is */ }
  return url;
}
