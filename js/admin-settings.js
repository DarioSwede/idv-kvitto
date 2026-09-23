import {verifiedSession,loginUrl,signOut,ADMIN_API} from './admin-auth.js';
import {setupAdminSecurity} from './admin-security.js';
import {setupAdminSessionTimeout} from './admin-session-timeout.js';

let verified;
try { verified=await verifiedSession(); } catch { location.replace(loginUrl()); }
if (!verified) { location.replace(loginUrl()); throw new Error('Inloggning krävs.'); }
if (verified.identity.role!=='superuser') {
  location.replace(new URL('admin.html',location.href));
  throw new Error('SU-behörighet krävs.');
}
const status=document.querySelector('#connectionStatus');
const field=id=>document.getElementById(id);
const controls=['deliveryMode','testRecipient','productionRecipient','retentionDays','travelRatePerMil','pdfWatermarkEnabled','pdfWatermarkOpacity'];
controls.forEach(id=>field(id).disabled=true);
field('saveSettingsButton').disabled=true;
field('statusFilter').value='superuser';
async function request(resource,options={}) {
  const response=await fetch(`${ADMIN_API}/${resource}`,{...options,headers:{'Content-Type':'application/json',apikey:verified.connection.anonKey,Authorization:`Bearer ${verified.session.access_token}`}});
  if(response.status===401) { location.replace(loginUrl()); throw new Error('Logga in igen.'); }
  if(response.status===403) { location.replace(new URL('admin.html',location.href)); throw new Error('Behörigheten har ändrats.'); }
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Begäran kunde inte genomföras.');
  return result;
}
field('signOutButton').addEventListener('click',async()=>{
  try { await signOut('manual_logout'); } finally { location.replace(new URL('admin-login.html',location.href)); }
});
setupAdminSessionTimeout({onTimeout:async reason=>{status.textContent='Du loggas ut efter 30 minuters inaktivitet…';try{await signOut(reason);}finally{location.replace(new URL('admin-login.html?reason=idle',location.href));}}});
setupAdminSecurity({role:verified.identity.role,request});
document.documentElement.style.visibility='visible';
try {
  const {settings}=await request('settings');
  const values=Object.fromEntries(settings.map(item=>[item.key,item.value]));
  field('deliveryMode').value=values.email_delivery_mode||'disabled';
  field('testRecipient').value=values.email_test_recipient??'';
  field('productionRecipient').value=values.receipt_email_to??'';
  field('retentionDays').value=values.retention_days??365;
  field('travelRatePerMil').value=Number(((values.travel_rate_per_km??2.5)*10).toFixed(2));
  field('pdfWatermarkEnabled').value=String(values.pdf_watermark_enabled??true);
  field('pdfWatermarkOpacity').value=Math.round((values.pdf_watermark_opacity??0.04)*100);
  controls.forEach(id=>field(id).disabled=false);
  field('saveSettingsButton').disabled=false;
  status.textContent=`Ansluten som ${verified.connection.email} · Superuser (SU)`;
} catch(error) { status.textContent=error.message; }
field('saveSettingsButton').addEventListener('click',async()=>{
  if(!controls.every(id=>field(id).reportValidity()))return;
  field('saveSettingsButton').disabled=true;
  const updates=[
    ['email_test_recipient',field('testRecipient').value.trim()],
    ['receipt_email_to',field('productionRecipient').value.trim()],
    ['email_delivery_mode',field('deliveryMode').value],
    ['retention_days',Number(field('retentionDays').value)],
    ['travel_rate_per_km',Number(field('travelRatePerMil').value)/10],
    ['pdf_watermark_enabled',field('pdfWatermarkEnabled').value==='true'],
    ['pdf_watermark_opacity',Number(field('pdfWatermarkOpacity').value)/100]
  ];
  try {
    for(const [key,value] of updates)await request('settings',{method:'PATCH',body:JSON.stringify({key,value})});
    status.textContent='Inställningarna sparades.';
  } catch(error) { status.textContent=`Alla inställningar kunde inte sparas: ${error.message}`; }
  finally { field('saveSettingsButton').disabled=false; }
});
field('sendTestMail').addEventListener('click',async()=>{
  const address=field('testMailAddress');
  if(!address.value||!address.reportValidity())return;
  field('sendTestMail').disabled=true;
  try {
    const result=await request('test-mail',{method:'POST',body:JSON.stringify({recipient:address.value,kind:field('testMailKind').value})});
    if(!result.sent)throw new Error('Testmailet kunde inte skickas.');
    field('testMailStatus').textContent=`Testmail skickat till ${address.value}.`;
    field('testMailPreview').srcdoc=result.preview.html;field('testMailPreview').hidden=false;
  } catch(error) { field('testMailStatus').textContent=error.message; }
  finally { field('sendTestMail').disabled=false; }
});
window.setInterval(async()=>{
  try {
    const current=await verifiedSession();
    if(!current) { location.replace(loginUrl()); return; }
    if(current.identity.role!=='superuser') { location.replace(new URL('admin.html',location.href)); return; }
    verified=current;
  } catch { status.textContent='Behörigheten kunde inte verifieras. Försök igen.'; }
},30000);
fetch('version.json',{cache:'no-store'}).then(response=>response.json()).then(version=>{field('brandVersion').textContent=`v${version.version}`;}).catch(()=>{field('brandVersion').textContent='Lokal version';});
const theme=field('themeSwitch');
function applyTheme(dark) {
  document.body.classList.toggle('dark-theme',dark);theme.setAttribute('aria-checked',String(dark));
  theme.setAttribute('aria-label',dark?'Byt till ljust läge':'Byt till mörkt läge');
  theme.querySelector('.theme-switch-icon').textContent=dark?'☾':'☀';
  theme.querySelector('.theme-switch-label').textContent=dark?'Mörkt':'Ljust';
}
applyTheme(localStorage.getItem('idv-admin-theme')==='dark');
theme.addEventListener('click',()=>{const dark=!document.body.classList.contains('dark-theme');applyTheme(dark);localStorage.setItem('idv-admin-theme',dark?'dark':'light');});

if(location.port==='43920' && ['localhost','127.0.0.1'].includes(location.hostname)) {
  const link=document.createElement('a');link.href='/control-center.html';link.className='button';link.textContent='Till kontrollcentret';
  document.querySelector('.sidebar').append(link);
}
