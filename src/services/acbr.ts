const ACBR_AUTH_URL = 'https://auth.acbr.api.br/realms/ACBrAPI/protocol/openid-connect/token';
const ACBR_HOM_URL = 'https://hom.acbr.api.br';
const ACBR_PROD_URL = 'https://prod.acbr.api.br';

export async function authenticate(clientId: string, clientSecret: string) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'empresa nfse',
  });

  const res = await fetch(ACBR_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha na autenticação ACBr: ${text}`);
  }

  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function proxyRequest(
  path: string,
  token: string,
  options?: {
    method?: string;
    query?: Record<string, string>;
    body?: unknown;
    environment?: string;
  }
) {
  const baseUrl = options?.environment === 'producao' ? ACBR_PROD_URL : ACBR_HOM_URL;
  let url = `${baseUrl}${path}`;
  if (options?.query) {
    const params = new URLSearchParams(options.query);
    const qs = params.toString();
    if (qs) url += '?' + qs;
  }

  const res = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const ct = res.headers.get('content-type');
  let data;
  if (ct?.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const msg = typeof data === 'object' ? data?.message || data?.error || JSON.stringify(data) : data;
    throw new Error(String(msg));
  }

  return data;
}
