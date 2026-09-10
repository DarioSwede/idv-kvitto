const baseServices = [
  { name: 'Testsvit', meta: 'Playwright', action: 'tests', button: 'Kör tester' },
  { name: 'Git', meta: 'Lokal arbetskopia', action: 'git-status', button: 'Visa status' }
];
const list = document.querySelector('#serviceList');
const output = document.querySelector('#commandOutput');
const note = document.querySelector('#codeNote');
const saveState = document.querySelector('#saveState');

function render(status = {}) {
  const running = Boolean(status.previewRunning);
  const services = [
    { name: 'Förhandsvisningsserver', meta: running ? 'Igång · localhost:43922' : 'Avstängd · localhost:43922', action: running ? 'stop-preview' : 'start-preview', button: running ? 'Stoppa' : 'Starta', danger: running, active: running },
    { name: 'Kvittoappen', meta: running ? 'Redo att öppnas' : 'Starta servern först', action: 'open-preview', button: 'Öppna', disabled: !running, active: running },
    ...baseServices.map(service => ({ ...service, active: true }))
  ];
  list.innerHTML = services.map(service => {
    return `<div class="service"><div><div class="service-name"><span class="dot ${service.active ? 'ok' : 'off'}"></span>${service.name}</div><div class="service-meta">${service.meta}</div></div><button class="button ${service.danger ? 'button-danger' : ''}" data-action="${service.action}" ${service.disabled ? 'disabled' : ''}>${service.button}</button></div>`;
  }).join('');
  list.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => runAction(button)));
}
async function runAction(button) {
  const action = button.dataset.action;
  if (action === 'open-preview') { window.open('http://localhost:43922/', '_blank', 'noopener'); return; }
  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = 'Kör …';
  document.querySelector('#resultPanel').open = true;
  document.querySelector('#outputHeading').textContent = originalLabel;
  output.textContent = `${originalLabel} körs …`;
  try {
    const response = await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
    const result = await response.json();
    output.textContent = result.output || result.error || 'Klart.';
    output.dataset.state = result.ok === false || !response.ok ? 'error' : 'success';
    if (action === 'start-preview' || action === 'stop-preview') await refresh();
  } catch { output.textContent = 'Kontrollservern svarar inte.'; output.dataset.state = 'error'; }
  finally { button.disabled = false; button.textContent = originalLabel; }
}
async function refresh() {
  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const status = await response.json();
    render(status);
    document.querySelector('#versionLabel').textContent = `Version ${status.version || 'lokal'} · ${status.branch}`;
  } catch {
    render({});
    output.textContent = 'Kontrollcentret svarar inte. Starta det via skrivbordsikonen.';
  }
}
note.value = localStorage.getItem('idv-control-center-note') || '';
document.querySelector('#saveNote').addEventListener('click', () => { localStorage.setItem('idv-control-center-note', note.value); saveState.textContent = 'Sparad lokalt'; });
document.querySelector('#clearNote').addEventListener('click', () => { note.value = ''; localStorage.removeItem('idv-control-center-note'); saveState.textContent = 'Rensad'; });
document.querySelector('#clearOutput').addEventListener('click', () => { output.textContent = 'Ingen körning ännu.'; delete output.dataset.state; });
document.querySelector('#refreshStatus').addEventListener('click', refresh);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
render({});
refresh();
