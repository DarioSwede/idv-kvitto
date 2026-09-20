const baseServices=[{name:'Testsvit',meta:'Playwright',action:'tests',button:'Kör tester'},{name:'Git',meta:'Lokal arbetskopia',action:'git-status',button:'Visa status'}];
const list=document.querySelector('#serviceList');
const output=document.querySelector('#commandOutput');
const note=document.querySelector('#codeNote');
const saveState=document.querySelector('#saveState');
function render(status={}){const running=Boolean(status.previewRunning);const services=[{name:'Förhandsvisningsserver',meta:running?'Igång · localhost:43922':'Avstängd · localhost:43922',action:running?'stop-preview':'start-preview',button:running?'Stoppa':'Starta',danger:running,active:running},{name:'Kvittoappen',meta:running?'Redo att öppnas':'Starta servern först',action:'open-preview',button:'Öppna',disabled:!running,active:running},...baseServices.map(service=>({...service,active:true}))];list.innerHTML=services.map(service=>`<div class="service"><div><div class="service-name"><span class="dot ${service.active?'ok':'off'}"></span>${service.name}</div><div class="service-meta">${service.meta}</div></div><button class="button ${service.danger?'button-danger':''}" data-action="${service.action}" ${service.disabled?'disabled':''}>${service.button}</button></div>`).join('');list.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>runAction(button)))}
async function runAction(button){const action=button.dataset.action;if(action==='open-preview'){window.open('http://localhost:43922/','_blank','noopener');return}button.disabled=true;const originalLabel=button.textContent;button.textContent='Kör …';document.querySelector('#resultPanel').open=true;document.querySelector('#outputHeading').textContent=originalLabel;output.textContent=`${originalLabel} körs …`;try{const response=await fetch('/api/run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action})});const result=await response.json();output.textContent=result.output||result.error||'Klart.';output.dataset.state=result.ok===false||!response.ok?'error':'success';if(action==='start-preview'||action==='stop-preview')await refresh()}catch{output.textContent='Kontrollservern svarar inte.';output.dataset.state='error'}finally{button.disabled=false;button.textContent=originalLabel}}
async function refreshEmail() {
  const badge = document.querySelector('#emailModeBadge');
  const prod = document.querySelector('#productionRecipient');
  const test = document.querySelector('#testRecipient');
  const warning = document.querySelector('#testWarning');
  const status = document.querySelector('#emailStatus');
  try {
    const connection = JSON.parse(localStorage.getItem('idv-admin-connection') || 'null');
    const session = JSON.parse(sessionStorage.getItem('idv-admin-session') || 'null');
    if (!connection?.anonKey || !session?.access_token) {
      throw new Error('Logga in via Hantera testläge och återvänd till kontrollcentret i samma flik.');
    }
    if (connection.url?.replace(/\/$/, '') !== 'https://ohwalxqwtxtlldalsclj.supabase.co') {
      throw new Error('Adminsessionen tillhör ett annat projekt. Logga in i IDV-projektet.');
    }
    const response = await fetch('/api/email-status', {
      cache: 'no-store',
      headers: { apikey: connection.anonKey, Authorization: `Bearer ${session.access_token}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Kunde inte läsa e-poststatus från admin-API.');
    const settings = data.settings;
    const mode = settings.email_delivery_mode;
    if (!['production', 'test', 'disabled'].includes(mode)) throw new Error('Okänt leveransläge.');
    badge.textContent = mode === 'test' ? 'TEST' : mode === 'disabled' ? 'AVSTÄNGD' : 'PRODUKTION';
    badge.dataset.mode = mode;
    prod.textContent = settings.receipt_email_to || '—';
    test.textContent = settings.email_test_recipient || '—';
    warning.hidden = mode !== 'test';
    status.textContent = data.delivery_configured
      ? `Resends serverkonfiguration finns. ${mode === 'disabled' ? 'Leverans är avstängd.' : 'Leverans har inte verifierats med testmail.'} Egen kopia: ${data.copy_available ? 'tillgänglig' : 'avstängd'}.`
      : 'E-posttjänstens serverkonfiguration är ofullständig.';
  } catch (error) {
    badge.textContent = 'OKÄND';
    badge.dataset.mode = 'unknown';
    prod.textContent = '—';
    test.textContent = '—';
    warning.hidden = true;
    status.textContent = error.message || 'Kunde inte läsa e-poststatus.';
  }
}
async function refresh(){try{const response=await fetch('/api/status',{cache:'no-store'});if(!response.ok)throw new Error();const status=await response.json();render(status);document.querySelector('#versionLabel').textContent=`Version ${status.version||'lokal'} · ${status.branch}`}catch{render({});output.textContent='Kontrollcentret svarar inte. Starta det via skrivbordsikonen.'}await refreshEmail()}
note.value=localStorage.getItem('idv-control-center-note')||'';
document.querySelector('#saveNote').addEventListener('click',()=>{localStorage.setItem('idv-control-center-note',note.value);saveState.textContent='Sparad lokalt'});
document.querySelector('#clearNote').addEventListener('click',()=>{note.value='';localStorage.removeItem('idv-control-center-note');saveState.textContent='Rensad'});
document.querySelector('#clearOutput').addEventListener('click',()=>{output.textContent='Ingen körning ännu.';delete output.dataset.state});
document.querySelector('#refreshStatus').addEventListener('click',refresh);
document.querySelector('#refreshEmail').addEventListener('click',refreshEmail);
document.querySelector('#openEmailAdmin').addEventListener('click',()=>{window.location.href='/admin-settings.html'});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});render({});refresh();
