import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveEmailSettings,resolveDeliveryRecipient,resolveCopyRecipient,validEmail} from '../supabase/functions/submit-receipt/email-config.js';
import {deliverTestMail,testMessage} from '../supabase/functions/admin-api/test-mail.js';
import {renderReceiptEmail,sendReceiptEmail} from '../supabase/functions/submit-receipt/receipt-email.js';
import {emailSettingError} from '../supabase/functions/admin-api/email-settings.js';
import {safeReturnTo,publicKeyOnly} from '../js/admin-auth.js';
const settings = mode => resolveEmailSettings({email_delivery_mode:mode,receipt_email_to:'cashier@example.org',email_test_recipient:'test@example.org',cc_self_enabled:true});

test('missing, invalid and disabled modes block all delivery including sender copies', () => {
  for (const mode of [undefined,null,'unknown','disabled','TEST']) {
    const config=settings(mode);
    assert.equal(resolveDeliveryRecipient(config),null);
    assert.equal(resolveCopyRecipient(config,'real@example.org',true),null);
  }
  assert.equal(resolveDeliveryRecipient(resolveEmailSettings()),null);
});
test('test and production never fall back to another recipient', () => {
  for (const missing of ['',null,undefined,'invalid','a@example.org,b@example.org']) {
    assert.equal(resolveDeliveryRecipient({...settings('test'),emailTestRecipient:missing}),null);
    assert.equal(resolveDeliveryRecipient({...settings('production'),receiptEmailTo:missing}),null);
    assert.equal(resolveCopyRecipient({...settings('test'),emailTestRecipient:missing},'real@example.org',true),null);
  }
  assert.equal(resolveDeliveryRecipient({...settings('test'),emailTestRecipient:'CASHIER@example.org'}),null);
});
test('test copies are redirected; production copies require explicit opt-in', () => {
  assert.equal(resolveCopyRecipient(settings('test'),'real@example.org',true),'test@example.org');
  assert.equal(resolveCopyRecipient(settings('production'),'real@example.org',true),'real@example.org');
  for (const mode of ['test','production']) {
    assert.equal(resolveCopyRecipient(settings(mode),'real@example.org',false),null);
    assert.equal(resolveCopyRecipient({...settings(mode),ccSelfEnabled:false},'real@example.org',true),null);
  }
});
test('strict single-address validation rejects header injection and lists', () => {
  for(const value of ['a@example.org\nBcc:b@example.org','Name <a@example.org>','a@example.org,b@example.org','a@localhost','a@-example.org']) assert.equal(validEmail(value),false);
  assert.equal(validEmail(' person+test@example.org '),true);
});
test('email-setting writes require real SU role and valid values', () => {
  for(const role of ['admin','viewer','cashier','tester',undefined]) assert.ok(emailSettingError('email_delivery_mode','test',role));
  assert.ok(emailSettingError('email_delivery_mode','other','superuser'));
  assert.ok(emailSettingError('receipt_email_to','invalid','superuser'));
  assert.equal(emailSettingError('email_test_recipient','','superuser'),null);
  assert.equal(emailSettingError('email_delivery_mode','disabled','superuser'),null);
});
const rows = mode => [{key:'email_delivery_mode',value:mode}];
test('testmail is SU-only and disabled blocks even explicit tests', async () => {
  for(const role of ['admin','viewer','tester','cashier',null]) {
    await assert.rejects(deliverTestMail({role,body:{recipient:'me@example.org',kind:'system'},rows:rows('test'),config:{},send:()=>assert.fail('No provider call')}),error=>error.status===403);
  }
  for(const mode of ['disabled',undefined,'invalid']) await assert.rejects(deliverTestMail({role:'superuser',body:{recipient:'me@example.org',kind:'test'},rows:rows(mode),config:{},send:()=>assert.fail('No provider call')}));
});
test('each testmail type uses only the explicit recipient, shared template and no real data', async () => {
  for(const kind of ['system','test','production']) {
    let count=0;
    const result=await deliverTestMail({role:'superuser',body:{recipient:'Me@example.org',kind},rows:rows('test'),config:{apiKey:'server-only',from:'sender@example.org'},send:async(url,request)=>{
      count++;
      assert.equal(url,'https://api.resend.com/emails');
      const body=JSON.parse(request.body);
      assert.deepEqual(body.to,['me@example.org']);
      assert.ok(body.subject.startsWith('[TEST]'));
      assert.match(body.html,/TESTUNDERLAG/);
      assert.equal(body.attachments,undefined);
      assert.equal(request.headers.Authorization,'Bearer server-only');
      return Response.json({id:'fake-delivery'});
    }});
    assert.equal(count,1);assert.equal(result.sent,true);
    assert.ok(!JSON.stringify(result).includes('server-only'));
  }
});
test('receipt mail includes escaped identity, Stockholm timestamp and exact case link', () => {
  const input={...testMessage('production',new Date('2026-09-16T12:34:00Z')),isTest:false,submissionId:'12345678-1234-1234-1234-123456789abc',senderName:'<img src=x onerror=alert(1)>'};
  const mail=renderReceiptEmail(input);
  assert.match(mail.html,/&lt;img/);assert.ok(!mail.html.includes('<img src=x'));
  assert.match(mail.html,/14:34/);assert.match(mail.html,/2026/);
  assert.match(mail.html,/admin.html\?submission=12345678-1234-1234-1234-123456789abc/);
  assert.ok(!mail.subject.startsWith('[TEST]'));
});
test('provider failures do not leak provider response or secrets', async () => {
  for(const send of [async()=>new Response('secret',{status:500}),async()=>{throw Error('secret');}]) {
    const result=await sendReceiptEmail(testMessage('system'),'me@example.org',false,{apiKey:'secret',from:'sender@example.org'},send);
    assert.equal(result.sent,false);assert.ok(!JSON.stringify(result).includes('secret'));
  }
});
test('returnTo is restricted to local admin with a validated case identifier', () => {
  const base='https://example.org/idv-kvitto/admin-login.html';
  const home='https://example.org/idv-kvitto/admin.html';
  assert.equal(safeReturnTo('admin.html?submission=12345678-1234-1234-1234-123456789abc',base),home+'?submission=12345678-1234-1234-1234-123456789abc');
  assert.equal(safeReturnTo('admin-settings.html?redirect=https://evil.org#secret',base),'https://example.org/idv-kvitto/admin-settings.html');
  for(const input of ['https://evil.org/admin.html','//evil.org/admin.html','javascript:alert(1)','/other/admin.html','../admin.html','https://user:pass@example.org/idv-kvitto/admin.html','admin.html?redirect=https://evil.org#access_token=secret']) assert.equal(safeReturnTo(input,base),home);
  assert.equal(safeReturnTo('admin.html?submission=12345678-1234-1234-1234-123456789abc&view=settings',base),'https://example.org/idv-kvitto/admin-settings.html');
});
test('login accepts only public key types, never service-role or secret keys', () => {
  const jwt=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
  assert.equal(publicKeyOnly(jwt('anon')),true);
  assert.equal(publicKeyOnly('sb_publishable_example'),true);
  for(const key of [jwt('service_role'),'sb_secret_example','invalid']) assert.equal(publicKeyOnly(key),false);
});

test('mail rejection explanations are specific but never echo provider details',async()=>{
  const cases=[
    [401,'validation_error','Invalid API key secret','provider_credentials_rejected'],
    [403,'restricted_api_key','secret','provider_credentials_rejected'],
    [403,'validation_error','You can only send testing emails to your own email address secret','test_recipient_restricted'],
    [403,'validation_error','The secret domain is not verified','sender_domain_unverified'],
    [429,'rate_limit_exceeded','secret','provider_limit'],
    [422,'validation_error','secret','provider_invalid_request'],
    [500,'application_error','secret','provider_unavailable'],
    [403,'secret','secret','provider_rejected']
  ];
  for(const [status,name,message,code] of cases){
    const result=await sendReceiptEmail(testMessage('system'),'me@example.org',false,{apiKey:'secret',from:'sender@example.org'},async()=>Response.json({name,message},{status}));
    assert.equal(result.sent,false);assert.equal(result.error_code,code);
    assert.ok(!JSON.stringify(result).includes('secret'));assert.ok(!result.error.includes('Underlaget sparades'));
  }
});
