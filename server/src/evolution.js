// ============================================
// EVOLUTION API WRAPPER
// ============================================
// Documentação: https://doc.evolution-api.com/
// Cobrimos apenas os endpoints necessários: criar instância,
// obter QR code, verificar status, enviar mensagem de texto,
// deletar/desconectar instância.

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Remove trailing slash e normaliza URL base.
 */
function normalizeUrl(url) {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

/**
 * Faz uma requisição HTTP contra a Evolution API com apikey no header.
 * Retorna { ok, status, data }.
 */
async function evoFetch(config, pathName, { method = 'GET', body } = {}) {
  const baseUrl = normalizeUrl(config.api_url);
  if (!baseUrl) throw new Error('Evolution API URL não configurada');

  const url = `${baseUrl}${pathName}`;
  const headers = { ...JSON_HEADERS };
  if (config.api_key) headers.apikey = config.api_key;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    throw new Error(`Falha de rede ao acessar Evolution API: ${err.message}`);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  }

  if (!response.ok) {
    const msg = data?.message || data?.error || data?.raw || `HTTP ${response.status}`;
    const err = new Error(`Evolution API error: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Cria uma instância na Evolution API.
 * Endpoint: POST /instance/create
 * Body mínimo: { instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }
 *
 * Retorna o payload completo, que inclui `qrcode` em base64 na primeira chamada.
 */
export async function createInstance(config, instanceName) {
  if (!instanceName) throw new Error('instanceName obrigatório');
  return evoFetch(config, '/instance/create', {
    method: 'POST',
    body: {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    }
  });
}

/**
 * Busca o QR code atual para reautenticação.
 * Endpoint: GET /instance/connect/{instanceName}
 */
export async function getQRCode(config) {
  const name = encodeURIComponent(config.instance_name || '');
  return evoFetch(config, `/instance/connect/${name}`);
}

/**
 * Verifica estado da conexão da instância.
 * Endpoint: GET /instance/connectionState/{instanceName}
 * Retorna algo como { instance: { state: 'open' | 'close' | 'connecting' } }
 */
export async function getInstanceStatus(config) {
  const name = encodeURIComponent(config.instance_name || '');
  return evoFetch(config, `/instance/connectionState/${name}`);
}

/**
 * Envia mensagem de texto simples.
 * Endpoint: POST /message/sendText/{instanceName}
 * Body: { number, text }
 */
export async function sendTextMessage(config, phone, text) {
  const name = encodeURIComponent(config.instance_name || '');
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) throw new Error('Telefone inválido');

  return evoFetch(config, `/message/sendText/${name}`, {
    method: 'POST',
    body: {
      number: cleanPhone,
      text
    }
  });
}

/**
 * Deleta a instância na Evolution API (logout + remove).
 * Endpoint: DELETE /instance/delete/{instanceName}
 */
export async function deleteInstance(config) {
  const name = encodeURIComponent(config.instance_name || '');
  return evoFetch(config, `/instance/delete/${name}`, { method: 'DELETE' });
}

/**
 * Desconecta (logout) sem deletar a instância.
 * Endpoint: DELETE /instance/logout/{instanceName}
 */
export async function logoutInstance(config) {
  const name = encodeURIComponent(config.instance_name || '');
  return evoFetch(config, `/instance/logout/${name}`, { method: 'DELETE' });
}

/**
 * Normaliza telefone para formato aceito pela Evolution API:
 * apenas dígitos, com DDI. Assume Brasil (55) se não tiver.
 */
export function normalizePhone(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  // Se começa com 0, remove
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  // Se já tem 12-13 dígitos e começa com 55, está ok
  if (digits.length >= 12 && digits.startsWith('55')) return digits;
  // Caso contrário, assume Brasil
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

/**
 * Aplica variáveis {chave} num template. Variáveis ausentes ficam em branco.
 */
export function applyTemplate(template, vars = {}) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? '' : String(v);
  });
}
