import { test, expect } from '@playwright/test';

async function setup(page, loggedIn = true) {
  await page.addInitScript(loggedIn => {
    if (loggedIn) {
      localStorage.setItem('idv-admin-connection', JSON.stringify({url: 'https://ohwalxqwtxtlldalsclj.supabase.co', anonKey: 'sb_publishable_test'}));
      sessionStorage.setItem('idv-admin-session', JSON.stringify({access_token: 'fake-user-token'}));
    }
  }, loggedIn);
  await page.route('**/api/status', route => route.fulfill({json: {version: 'test', branch: 'feature/control-center-email', previewRunning: false}}));
  await page.route(/^https:\/\//, route => route.abort());
}

test('control center uses same-origin authenticated status and distinguishes copy from delivery', async ({page}) => {
  await setup(page);
  let mode = 'production';
  let status = 200;
  let calls = 0;
  await page.route('**/api/email-status', async route => {
    calls++;
    expect(route.request().headers().authorization).toBe('Bearer fake-user-token');
    expect(route.request().headers().apikey).toBe('sb_publishable_test');
    expect(new URL(route.request().url()).origin).toBe('http://127.0.0.1:43921');
    await route.fulfill({status, json: status === 200 ? {
      settings: {email_delivery_mode: mode, receipt_email_to: 'receipts@example.org', email_test_recipient: 'test@example.org'},
      delivery_configured: true, copy_available: false,
    } : {error: 'Sessionen har gått ut. Logga in igen i adminvyn.'}});
  });
  await page.goto('/control-center.html');
  await expect(page.locator('#emailModeBadge')).toHaveText('PRODUKTION');
  await expect(page.locator('#emailStatus')).toContainText('Egen kopia: avstängd');
  await expect(page.locator('#emailStatus')).toContainText('Leverans har inte verifierats');
  mode = 'test';
  await page.locator('#refreshEmail').click();
  await expect(page.locator('#emailModeBadge')).toHaveText('TEST');
  await expect(page.locator('#testWarning')).toBeVisible();
  mode = 'disabled';
  await page.locator('#refreshEmail').click();
  await expect(page.locator('#emailModeBadge')).toHaveText('AVSTÄNGD');
  await expect(page.locator('#emailStatus')).toContainText('Leverans är avstängd');
  status = 401;
  await page.locator('#refreshEmail').click();
  await expect(page.locator('#emailModeBadge')).toHaveText('OKÄND');
  await expect(page.locator('#productionRecipient')).toHaveText('—');
  await expect(page.locator('#emailStatus')).toContainText('Sessionen har gått ut');
  expect(calls).toBe(4);
});

test('signed-out control center explains login and opens admin without preview in same tab', async ({page}) => {
  await setup(page, false);
  let statusCalls = 0;
  await page.route('**/api/email-status', route => { statusCalls++; return route.abort(); });
  await page.goto('/control-center.html');
  await expect(page.locator('#emailStatus')).toContainText('Logga in via Hantera testläge');
  await expect(page.locator('[data-action="open-preview"]')).toBeDisabled();
  await page.locator('#openEmailAdmin').click();
  await expect(page).toHaveURL(/\/admin-login.html\?returnTo=/);
  expect(statusCalls).toBe(0);
});

test('admin login on control origin survives same-tab return without preview server', async ({page}) => {
  // Serve this checkout through interception so an existing user control server is untouched.
  const {readFile} = await import('node:fs/promises');
  await page.route('http://localhost:43920/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/status') return route.fulfill({json: {previewRunning: false}});
    if (path === '/api/email-status') {
      expect(route.request().headers().authorization).toBe('Bearer fake-login-token');
      expect(route.request().headers().apikey).toBe('sb_publishable_test');
      return route.fulfill({json: {settings: {email_delivery_mode: 'test', receipt_email_to: 'receipts@example.org', email_test_recipient: 'test@example.org'}, delivery_configured: true, copy_available: false}});
    }
    const type = path.endsWith('.html') ? 'text/html' : path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.png') ? 'image/png' : 'application/json';
    await route.fulfill({contentType: type, body: await readFile(new URL(`..${path}`, import.meta.url))});
  });
  await page.route(/^https:\/\//, async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/admin-api/login')) return route.fulfill({status: 200, json: {access_token: 'fake-login-token'}});
    if (path.endsWith('/me')) return route.fulfill({json: {user_id:'test', role:'admin'}});
    if (path.endsWith('/settings')) return route.fulfill({json: {settings: []}});
    if (path.endsWith('/submissions')) return route.fulfill({json: {submissions: [{id: 'demo', sender_name: 'Demo', status: 'new'}]}});
    await route.abort();
  });
  await page.goto('http://localhost:43920/control-center.html');
  await page.locator('#openEmailAdmin').click();
  await expect(page).toHaveURL(/admin-login.html/);
  await page.locator('#connectionSetup').evaluate(element=>{element.open=true;});
  await page.locator('#publicKey').fill('sb_publishable_test');
  await page.locator('#email').fill('staff@example.org');
  await page.locator('#password').fill('fake-password');
  await page.locator('#loginButton').click();
  await expect(page.locator('#connectionStatus')).toContainText('Ansluten som');
  await page.getByRole('link', {name: 'Till kontrollcentret'}).click();
  await expect(page.locator('#emailModeBadge')).toHaveText('TEST');
  await expect(page.locator('[data-action="open-preview"]')).toBeDisabled();
});
