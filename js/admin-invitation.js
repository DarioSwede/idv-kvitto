import {SUPABASE_URL,publicKeyOnly,clearAuth,verifiedSession} from './admin-auth.js';

// Read then immediately erase credentials from the address bar/history.
export function invitationSession(location,history) {
  const fragment=new URLSearchParams(location.hash.slice(1));
  if(!fragment.has('access_token')&&!fragment.has('error'))return null;
  history.replaceState(null,'',location.pathname+location.search);
  if(fragment.get('type')!=='invite'||!fragment.get('access_token')||!fragment.get('refresh_token')){
    throw new Error('Inbjudningslänken är ogiltig eller har gått ut. Be administratören om hjälp.');
  }
  return {access_token:fragment.get('access_token'),refresh_token:fragment.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+Math.min(3600,Number(fragment.get('expires_in'))||3600)};
}

export async function acceptInvitation(session,{key,password,fetcher=fetch}) {
  if(!publicKeyOnly(key))throw new Error('Ange en publik publishable/anon-nyckel.');
  if(password.length<12)throw new Error('Välj ett lösenord med minst 12 tecken.');
  clearAuth();
  localStorage.setItem('idv-admin-connection',JSON.stringify({url:SUPABASE_URL,anonKey:key,email:''}));
  sessionStorage.setItem('idv-admin-session',JSON.stringify(session));
  try{
    const verified = await verifiedSession(fetcher);
    if(!verified)throw new Error('Kontot saknar behörighet. Be administratören kontrollera inbjudan.');
    const response=await fetcher(`${SUPABASE_URL}/auth/v1/user`,{method:'PUT',headers:{apikey:key,Authorization:`Bearer ${verified.session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({password})});
    if(!response.ok)throw new Error('Lösenordet kunde inte sparas. Kontrollera lösenordskraven eller be om en ny inbjudan.');
    const user=await response.json();
    localStorage.setItem('idv-admin-connection',JSON.stringify({url:SUPABASE_URL,anonKey:key,email:user.email||''}));
  }catch(error){clearAuth();throw error;}
}
