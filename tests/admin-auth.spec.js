import {test,expect} from '@playwright/test';
const id='12345678-1234-1234-1234-123456789abc';
async function api(page,{role='admin',meStatus=200}={}) {
  await page.route('https://ohwalxqwtxtlldalsclj.supabase.co/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/admin-api/login'))return route.fulfill({json:{access_token:'fake-session',expires_at:Math.floor(Date.now()/1000)+3600}});
    if(url.pathname.endsWith('/me'))return route.fulfill({status:meStatus,json:{role,user_id:'test-user'}});
    if(url.pathname.endsWith('/settings'))return route.fulfill({json:{role,settings:[{key:'email_delivery_mode',value:'test'},{key:'email_test_recipient',value:'test@example.org'}]}});
    if(url.pathname.endsWith('/submissions'))return route.fulfill({json:{submissions:[{id,sender_name:'Testperson',sender_email:'example@example.org',status:'new',is_test:true}]}});
    if(url.pathname.endsWith('/pdf'))return route.fulfill({json:{url:'about:blank'}});
    if(url.pathname.endsWith('/logout'))return route.fulfill({status:204});
    return route.abort();
  });
}
async function login(page){
  await page.locator('#connectionSetup').evaluate(element=>{element.open=true;});
  await page.locator('#publicKey').fill('sb_publishable_test');
  await page.locator('#email').fill('test@example.org');
  await page.locator('#password').fill('test-password');
  await page.locator('#loginButton').click();
}
test('admin always starts at login and preserves the requested case after server verification',async({page})=>{
  await api(page);
  await page.goto(`/admin.html?submission=${id}`);
  await expect(page).toHaveURL(/admin-login.html\?returnTo=/);
  await expect(page.getByText('Anna Svensson')).toHaveCount(0);
  await login(page);
  await expect(page).toHaveURL(new RegExp(`admin.html\\?submission=${id}$`));
  await expect(page.locator('#connectionStatus')).toContainText('Ansluten som');
  await expect(page.locator('#submissionList')).toContainText('[TEST] Testperson');
  await expect(page.locator('#statusFilter')).toBeDisabled();
  expect(await page.evaluate(()=>localStorage.getItem('idv-admin-state'))).toBeNull();
});
test('valid password without staff authorization never opens admin',async({page})=>{
  await api(page,{meStatus:403});await page.goto('/admin-login.html');await login(page);
  await expect(page.locator('#status')).toContainText('saknar åtkomst');
  await expect(page).toHaveURL(/admin-login.html$/);
  expect(await page.evaluate(()=>sessionStorage.getItem('idv-admin-session'))).toBeNull();
});
test('empty admin list still opens settings without a runtime error',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await api(page);
  await page.route('**/admin-api/submissions',route=>route.fulfill({json:{submissions:[]}}));
  await page.goto('/admin-login.html?returnTo=admin.html%3Fview%3Dsettings');
  await login(page);
  await expect(page.locator('#connectionStatus')).toContainText('Ansluten som');
  await expect(page.locator('#submissionList')).toContainText('Inga inskickade underlag');
  await expect(page.locator('#inboxView')).toBeHidden();
  expect(await page.locator('#settingsPanel').evaluate(el=>getComputedStyle(el).position)).toBe('static');
  await expect(page.locator('#settingsPanel')).toBeVisible();
  expect(errors).toEqual([]);
});
test('external returnTo cannot redirect login off site',async({page})=>{
  await api(page);await page.goto('/admin-login.html?returnTo=https://evil.example/');await login(page);
  await expect(page).toHaveURL(/127.0.0.1:43921\/admin.html$/);
});
test('explicit testmail uses selected address and renders sandboxed preview',async({page})=>{
  await api(page);
  await page.route('**/admin-api/test-mail',async route=>{
    expect(route.request().headers().authorization).toBe('Bearer fake-session');
    expect(route.request().postDataJSON()).toEqual({recipient:'chosen@example.org',kind:'production'});
    await route.fulfill({json:{sent:true,preview:{html:'<h1>TESTUNDERLAG</h1>'}}});
  });
  await page.goto('/admin-login.html?returnTo=admin.html%3Fview%3Dsettings');await login(page);
  await expect(page.locator('#testMailPanel')).toBeVisible();
  await page.locator('#testMailAddress').fill('chosen@example.org');
  await page.locator('#testMailKind').selectOption('production');
  await page.locator('#sendTestMail').click();
  await expect(page.locator('#testMailStatus')).toContainText('skickat till chosen@example.org');
  await expect(page.locator('#testMailPreview')).toHaveAttribute('sandbox','');
});
for (const role of ['viewer','cashier','tester']) test(`${role} cannot open or fetch settings`,async({page})=>{
  await api(page,{role});
  let settingsRequests=0;
  await page.route('**/admin-api/settings',route=>{settingsRequests++;return route.fulfill({status:403,json:{error:'Admin krävs'}});});
  await page.goto('/admin-login.html?returnTo=admin.html%3Fview%3Dsettings');await login(page);
  await expect(page.locator('#connectionStatus')).toContainText('Ansluten som');
  await expect(page.locator('[data-view="settings"]')).toBeHidden();
  await expect(page.locator('#settingsPanel')).toBeHidden();
  await expect(page.locator('#inboxView')).toBeVisible();
  await expect(page.locator('#signOutButton')).toBeVisible();
  await expect(page).toHaveURL(/admin.html$/);
  expect(settingsRequests).toBe(0);
});
test('logout revokes server refresh session and returns to separate login',async({page})=>{
  await api(page);await page.goto('/admin-login.html?returnTo=admin.html%3Fview%3Dsettings');await login(page);
  await page.locator('#signOutButton').click();
  await expect(page).toHaveURL(/admin-login.html$/);
  expect(await page.evaluate(()=>sessionStorage.getItem('idv-admin-session'))).toBeNull();
});
test('admin can invite least-privilege staff and read safely rendered audit entries',async({page})=>{
  await api(page);
  await page.route('**/admin-api/invite',async route=>{
    expect(route.request().postDataJSON()).toEqual({email:'new@example.org',role:'viewer'});
    expect(route.request().headers().authorization).toBe('Bearer fake-session');
    await route.fulfill({json:{invited:true}});
  });
  await page.route('**/admin-api/audit',route=>route.fulfill({json:{entries:[{created_at:'2026-09-20T12:00:00Z',event_type:'<script>alert(1)</script>',success:true,user_id:'user',request_id:'request'}]}}));
  await page.goto('/admin-login.html?returnTo=admin.html%3Fview%3Dsettings');await login(page);
  await page.locator('#inviteEmail').fill('new@example.org');await page.locator('#inviteStaff').click();
  await expect(page.locator('#inviteStatus')).toContainText('Inbjudan skickad');
  await page.locator('#loadAudit').click();await expect(page.locator('#auditEntries')).toContainText('<script>alert(1)</script>');
  await expect(page.locator('#auditEntries script')).toHaveCount(0);
});
test('invitation callback clears URL credentials and sets password after role verification',async({page})=>{
  await api(page);
  await page.route('**/auth/v1/user',async route=>{
    expect(route.request().method()).toBe('PUT');expect(route.request().postDataJSON()).toEqual({password:'new-password-long'});
    await route.fulfill({json:{email:'invited@example.org'}});
  });
  await page.goto('/admin-login.html#type=invite&access_token=invite-token&refresh_token=refresh&expires_in=3600');
  await expect(page).toHaveURL(/admin-login.html$/);
  await expect(page.getByRole('heading',{name:'Aktivera ditt konto'})).toBeVisible();
  await page.locator('#connectionSetup').evaluate(element=>{element.open=true;});
  await page.locator('#publicKey').fill('sb_publishable_test');await page.locator('#password').fill('new-password-long');await page.locator('#loginButton').click();
  await expect(page).toHaveURL(/admin.html$/);
  await expect(page.locator('#connectionStatus')).toContainText('invited@example.org');
});
test('viewer never sees invitation or audit controls',async({page})=>{
  await api(page,{role:'viewer'});await page.goto('/admin-login.html?returnTo=admin.html%3Fview%3Dsettings');await login(page);
  await expect(page.locator('#adminSecurityPanel')).toBeHidden();
});
test('normal login needs only email and password, not a Supabase key',async({page})=>{
  await api(page);await page.goto('/admin-login.html');
  await expect(page.locator('#publicKey')).toBeHidden();
  await page.locator('#email').fill('test@example.org');await page.locator('#password').fill('test-password');await page.locator('#loginButton').click();
  await expect(page.locator('#connectionStatus')).toContainText('Ansluten som');
});

test('public receipt form remains accessible without admin login',async({page})=>{
  await page.goto('/admin-login.html');
  await page.getByRole('link',{name:'Till det publika kvittoformuläret'}).click();
  await expect(page.getByRole('heading',{name:'Ansök om ersättning'})).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('idv-admin-session'))).toBeNull();
});
