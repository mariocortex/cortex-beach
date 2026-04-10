// ============================================
// CONFIG — endpoints de ambiente
// ============================================
// REACT_APP_API_URL deve apontar para o backend (ex: https://api.seudominio.com)
// Em desenvolvimento, cai no fallback localhost:5001.

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
export const API_BASE = `${API_URL}/api`;
