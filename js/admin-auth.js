// Same public anon key already shipped in app-base.html; never a service key.
export const DEFAULT_PUBLIC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9od2FseHF3dHh0bGxkYWxzY2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0ODUxODIsImV4cCI6MjEwMDA2MTE4Mn0._aZwAbT_RUrcYZlG57l5_4ubgHRjbIObbVMjdgWWQ-o";
export const SUPABASE_URL = 'https://ohwalxqwtxtlldalsclj.supabase.co';
export const ADMIN_API = `${SUPABASE_URL}/functions/v1/admin-api`;
export function safeReturnTo(value, locationHref) {
  const fallback = new URL('admin.html', locationHref);
  try {
    const url = new URL(value || 'admin.html', locationHref);
    const settings = new URL('admin-settings.html', locationHref);
    if (url.origin !== fallback.origin || ![fallback.pathname,settings.pathname].includes(url.pathname) || url.username || url.password) return fallback.href;
    if (url.pathname === settings.pathname || url.searchParams.get('view') === 'settings') return settings.href;
    const id = url.searchParams.get('submission');
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) fallback.searchParams.set('submission', id);
    return fallback.href;
  } catch { return fallback.href; }
}
export function publicKeyOnly(value) {
  if (typeof value !== 'string') return false;
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true;
  try {
    const payload = JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'anon';
  } catch { return false; }
}
export function storedAuth() {
  try {
    const connection = JSON.parse(localStorage.getItem('idv-admin-connection') || 'null');
    const session = JSON.parse(sessionStorage.getItem('idv-admin-session') || 'null');
    if (connection?.url !== SUPABASE_URL || !publicKeyOnly(connection.anonKey)) return null;
    return {connection, session};
  } catch { return null; }
}
export function clearAuth() {
  sessionStorage.removeItem('idv-admin-session');
  // Older admin versions persisted receipt data. Remove it on every logout.
  localStorage.removeItem('idv-admin-state');
}
export function loginUrl() {
  const url = new URL('admin-login.html', location.href);
  url.searchParams.set('returnTo', safeReturnTo(location.href, location.href));
  return url.href;
}
export async function verifiedSession(fetcher = fetch) {
  const saved = storedAuth();
  if (!saved?.session?.access_token) return null;
  let {session} = saved;
  if (session.expires_at && session.expires_at * 1000 <= Date.now() + 30000) {
    if (!session.refresh_token) { clearAuth(); return null; }
    const refreshed = await fetcher(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method:'POST', headers:{apikey:saved.connection.anonKey, 'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:session.refresh_token})
    });
    if (!refreshed.ok) { clearAuth(); return null; }
    session = await refreshed.json();
    if (!session?.access_token || !session?.refresh_token) { clearAuth(); return null; }
    const expiresIn = Number(session.expires_in);
    if (!session.expires_at && Number.isFinite(expiresIn) && expiresIn > 0) session.expires_at = Math.floor(Date.now() / 1000) + expiresIn;
    if (!Number.isFinite(Number(session.expires_at))) { clearAuth(); return null; }
    sessionStorage.setItem('idv-admin-session', JSON.stringify(session));
  }
  const response = await fetcher(`${ADMIN_API}/me`, {headers:{apikey:saved.connection.anonKey, Authorization:`Bearer ${session.access_token}`}});
  if (response.status === 401 || response.status === 403) { clearAuth(); return null; }
  if (!response.ok) throw new Error('Behörigheten kunde inte verifieras. Försök igen.');
  const identity = await response.json();
  if (!['superuser','admin','cashier','tester','viewer'].includes(identity.role)) { clearAuth(); return null; }
  return {...saved, session, identity};
}
export async function signOut(reason='manual_logout') {
  const saved = storedAuth();
  try {
    if (saved?.session?.access_token) {
      const response = await fetch(`${ADMIN_API}/logout`, {method:'POST',headers:{apikey:saved.connection.anonKey, Authorization:`Bearer ${saved.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({reason})});
      if (!response.ok && response.status !== 401) throw new Error('Serverutloggningen kunde inte bekräftas.');
    }
  } finally { clearAuth(); }
}
