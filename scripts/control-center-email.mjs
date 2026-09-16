const adminStatusUrl = 'https://ohwalxqwtxtlldalsclj.supabase.co/functions/v1/admin-api/email-status';

// A fixed, read-only proxy, not a general-purpose admin or URL relay.
export async function readEmailStatus(request, fetchStatus = fetch) {
  const host = request.headers.host;
  const origin = request.headers.origin;
  if (!['localhost:43920', '127.0.0.1:43920'].includes(host) ||
      (origin && origin !== `http://${host}`) ||
      (request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin')) {
    return { status: 403, body: { error: 'Otillåten avsändare.' } };
  }
  const authorization = request.headers.authorization;
  const apikey = request.headers.apikey;
  if (!/^Bearer \S+$/i.test(authorization || '') || !apikey) {
    return { status: 401, body: { error: 'Logga in i adminvyn i den här fliken för att läsa e-poststatus.' } };
  }
  try {
    const response = await fetchStatus(adminStatusUrl, {
      headers: { authorization, apikey },
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const status = [401, 403, 404].includes(response.status) ? response.status : 502;
      const error = status === 401 ? 'Sessionen har gått ut. Logga in igen i adminvyn.' :
        status === 403 ? 'Personalbehörighet krävs för e-poststatus.' :
        status === 404 ? 'Admin-API saknar e-poststatus. Backendändringen behöver publiceras.' :
        'Kunde inte läsa e-poststatus från admin-API.';
      return { status, body: { error } };
    }
    const data = await response.json();
    const settings = data.settings;
    if (!settings || !['production', 'test', 'disabled'].includes(settings.email_delivery_mode) ||
        typeof settings.receipt_email_to !== 'string' || typeof settings.email_test_recipient !== 'string' ||
        typeof data.delivery_configured !== 'boolean' || typeof data.copy_available !== 'boolean') {
      throw new Error('Invalid status');
    }
    // Explicit projection keeps future backend fields out of the browser response.
    return { status: 200, body: {
      settings: {
        email_delivery_mode: settings.email_delivery_mode,
        receipt_email_to: settings.receipt_email_to,
        email_test_recipient: settings.email_test_recipient,
      },
      delivery_configured: data.delivery_configured,
      copy_available: data.copy_available,
    } };
  } catch {
    return { status: 502, body: { error: 'Kunde inte läsa e-poststatus från admin-API. Försök igen.' } };
  }
}
