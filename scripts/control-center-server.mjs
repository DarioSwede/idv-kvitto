import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const controlPort = 43920;
const previewPort = 43922;
let previewServer;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };
const actions = { tests: ['npm', ['test']], 'git-status': ['git', ['status', '--short', '--branch']] };
const testPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<<>> >>endobj\n4 0 obj<</Length 62>>stream\nBT /F1 18 Tf 72 720 Td (Lokalt testunderlag) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n0\n%%EOF\n');

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

function run(command, args) {
  return new Promise(resolveRun => {
    const child = spawn(command, args, { cwd: root, shell: false });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', error => resolveRun({ ok: false, output: error.message }));
    child.on('close', code => resolveRun({ ok: code === 0, output: output.trim() || `Klart (kod ${code}).` }));
  });
}

function summarizeTests(result) {
  if (result.ok) {
    const passed = result.output.match(/(\d+) passed/);
    return { ok: true, output: passed ? `OK — ${passed[1]} tester godkända.` : 'OK — alla tester godkända.' };
  }
  if (result.output.includes('is already used')) {
    return { ok: false, output: 'Testerna kunde inte starta: testport 43921 används redan.' };
  }
  if (result.output.includes('PermissionError')) {
    return { ok: false, output: 'Testerna kunde inte starta: testservern saknar behörighet att öppna port 43921.' };
  }
  const failed = result.output.match(/(\d+) failed/);
  const error = result.output.split('\n').find(line => /^\s*(Error:|\d+\))/.test(line));
  const count = failed ? `${failed[1]} test misslyckades.` : 'Testerna misslyckades.';
  return { ok: false, output: error ? `${count}\n${error.trim()}` : count };
}

async function serveFile(request, response, defaultPage = '/control-center.html') {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const requested = pathname === '/' ? defaultPage : pathname;
  const path = resolve(root, `.${requested}`);
  if (path !== root && !path.startsWith(`${root}${sep}`)) return json(response, 403, { error: 'Åtkomst nekad.' });
  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error();
    response.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(await readFile(path));
  } catch { json(response, 404, { error: 'Filen hittades inte.' }); }
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/api/status') {
    const version = JSON.parse(await readFile(resolve(root, 'version.json'), 'utf8'));
    const branch = await run('git', ['branch', '--show-current']);
    return json(response, 200, { version: version.version || version.build, branch: branch.output, previewRunning: Boolean(previewServer?.listening), previewUrl: `http://localhost:${previewPort}/` });
  }
  if (request.method === 'POST' && request.url === '/api/run') {
    let body = '';
    request.on('data', chunk => { if (body.length < 2048) body += chunk; });
    request.on('end', async () => {
      let action;
      try { action = JSON.parse(body).action; } catch { return json(response, 400, { error: 'Ogiltig begäran.' }); }
      if (action === 'start-preview') {
        if (previewServer?.listening) return json(response, 200, { output: 'Förhandsvisningsservern är redan igång.' });
        previewServer = createServer((previewRequest, previewResponse) => {
          if(previewRequest.method==='GET'&&previewRequest.url==='/test-output.pdf'){
            previewResponse.writeHead(200,{'content-type':'application/pdf','cache-control':'no-store'});
            previewResponse.end(testPdf);
            return;
          }
          if(previewRequest.method==='POST'&&previewRequest.url==='/api/test-submit'){
            previewResponse.writeHead(200,{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type'});
            previewResponse.end(JSON.stringify({ok:true,delivery_sent:true,delivery_recipient:'betala@idrottsveteranerna.se',copy_requested:true,copy_sent:true,final_pdf_url:'http://localhost:43922/test-output.pdf',test_mode:true}));
            return;
          }
          if(previewRequest.method==='OPTIONS'&&previewRequest.url==='/api/test-submit'){
            previewResponse.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-headers':'authorization, apikey, content-type','access-control-allow-methods':'POST, OPTIONS'});
            previewResponse.end();
            return;
          }
          serveFile(previewRequest, previewResponse, '/index.html');
        });
        previewServer.once('error', error => json(response, 500, { error: error.message }));
        return previewServer.listen(previewPort, () => json(response, 200, { output: `Förhandsvisningsservern startad på http://localhost:${previewPort}/` }));
      }
      if (action === 'stop-preview') {
        if (!previewServer?.listening) return json(response, 200, { output: 'Förhandsvisningsservern är redan stoppad.' });
        return previewServer.close(() => {
          previewServer = undefined;
          json(response, 200, { output: 'Förhandsvisningsservern stoppad.' });
        });
      }
      const selected = actions[action];
      if (!selected) return json(response, 403, { error: 'Kommandot är inte tillåtet.' });
      const result = await run(...selected);
      const responseBody = action === 'tests' ? summarizeTests(result) : result;
      return json(response, responseBody.ok ? 200 : 500, responseBody);
    });
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return json(response, 405, { error: 'Metoden stöds inte.' });
  return serveFile(request, response);
});

server.listen(controlPort, '127.0.0.1', () => console.log(`Kontrollcenter: http://localhost:${controlPort}/control-center.html`));
