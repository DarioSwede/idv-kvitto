import {invitationSession,acceptInvitation} from './admin-invitation.js';
import {SUPABASE_URL, ADMIN_API, DEFAULT_PUBLIC_KEY, safeReturnTo, publicKeyOnly, storedAuth, verifiedSession, clearAuth} from './admin-auth.js';
const form = document.querySelector('#loginForm');
const status = document.querySelector('#status');
const button = document.querySelector('#loginButton');
const key = document.querySelector('#publicKey');
const email = document.querySelector('#email');
const password = document.querySelector('#password');
let invitation;
try{invitation=invitationSession(location,history);}catch(error){status.textContent=error.message;}
if(invitation){
  document.querySelector('h1').textContent='Aktivera ditt konto';
  document.querySelector('main > p').textContent='Välj ett lösenord med minst 12 tecken.';
  email.required=false;email.hidden=true;document.querySelector('label[for=email]').hidden=true;
  password.autocomplete='new-password';password.minLength=12;button.textContent='Spara lösenord och logga in';
}
const saved = storedAuth();
key.value = saved?.connection.anonKey || DEFAULT_PUBLIC_KEY;
email.value = saved?.connection.email || '';
document.querySelector('#connectionSetup').open = !key.value;
const returnTo = safeReturnTo(new URLSearchParams(location.search).get('returnTo'), location.href);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!publicKeyOnly(key.value.trim())) { status.textContent = 'Ange en publik publishable/anon-nyckel.'; return; }
  button.disabled = true;
  status.textContent = 'Verifierar inloggning och behörighet…';
  clearAuth();
  try {
    if(invitation){await acceptInvitation(invitation,{key:key.value.trim(),password:password.value});password.value='';location.replace(returnTo);return;}
    const response = await fetch(`${ADMIN_API}/login`, {
      method:'POST', headers:{apikey:key.value.trim(), 'Content-Type':'application/json'},
      body:JSON.stringify({email:email.value.trim(), password:password.value})
    });
    password.value = '';
    if (!response.ok) throw new Error('Inloggningen misslyckades. Kontrollera dina uppgifter och försök igen.');
    const session = await response.json();
    localStorage.setItem('idv-admin-connection', JSON.stringify({url:SUPABASE_URL, anonKey:key.value.trim(), email:email.value.trim()}));
    sessionStorage.setItem('idv-admin-session', JSON.stringify(session));
    if (!await verifiedSession()) throw new Error('Kontot saknar åtkomst till kvittoadministrationen.');
    location.replace(returnTo);
  } catch (error) {
    clearAuth();
    password.value = '';
    status.textContent = error.message || 'Inloggningen kunde inte genomföras.';
  } finally { button.disabled = false; }
});
try { if (!invitation && await verifiedSession()) location.replace(returnTo); }
catch (error) { status.textContent = error.message; }
