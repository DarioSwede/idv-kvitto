import test from 'node:test';
import assert from 'node:assert/strict';
import { readEmailStatus } from '../scripts/control-center-email.mjs';
import { emailStatus } from '../supabase/functions/admin-api/email-status.js';
import { resolveEmailSettings } from '../supabase/functions/submit-receipt/email-config.js';

const request = (headers = {}) => ({ headers: {
  host: 'localhost:43920', origin: 'http://localhost:43920',
  'sec-fetch-site': 'same-origin', authorization: 'Bearer fake-user-token', apikey: 'fake-public-key', ...headers,
} });
const rows = mode => [
  { key: 'email_delivery_mode', value: mode },
  { key: 'receipt_email_to', value: 'receipts@example.org' },
  { key: 'email_test_recipient', value: 'test@example.org' },
  { key: 'cc_self_enabled', value: false },
];
const ready = mode => emailStatus(rows(mode), { apiKey: 'fake-secret', from: 'sender@example.org' });

test('delivery readiness is independent of sender-copy setting in all modes', () => {
  for (const mode of ['production', 'test', 'disabled']) {
    const data = ready(mode);
    assert.equal(data.delivery_configured, true);
    assert.equal(data.copy_available, false);
    assert.equal(data.delivery_enabled, mode !== 'disabled');
    assert.equal(data.effective_recipient, mode === 'disabled' ? null : mode === 'test' ? 'test@example.org' : 'receipts@example.org');
    assert.ok(!JSON.stringify(data).includes('fake-secret'));
    assert.ok(!JSON.stringify(data).includes('sender@example.org'));
  }
});

test('missing provider credentials never report configured', () => {
  for (const config of [{}, {apiKey: 'fake'}, {from: 'sender@example.org'}]) {
    assert.equal(emailStatus([], config).delivery_configured, false);
    assert.equal(emailStatus([], config).copy_available, false);
  }
});

test('admin status and delivery share fallback values', () => {
  const settings = resolveEmailSettings({receipt_email_to: 'invalid', email_test_recipient: null});
  const status = emailStatus([{key: 'receipt_email_to', value: 'invalid'}], {});
  assert.equal(status.settings.receipt_email_to, settings.receiptEmailTo);
  assert.equal(status.settings.email_test_recipient, settings.emailTestRecipient);
  assert.equal(status.settings.email_delivery_mode, settings.emailDeliveryMode);
});

test('proxy rejects missing credentials and untrusted origins before fetching', async () => {
  for (const [headers, status] of [
    [{authorization: undefined}, 401], [{apikey: undefined}, 401], [{authorization: 'Basic fake'}, 401],
    [{host: 'attacker.example:43920'}, 403], [{origin: 'https://attacker.example'}, 403],
    [{'sec-fetch-site': 'cross-site'}, 403], [{origin: 'http://localhost:43922'}, 403],
  ]) {
    const result = await readEmailStatus(request(headers), () => assert.fail('must not contact backend'));
    assert.equal(result.status, status);
  }
});

test('proxy uses fixed admin route and both headers without forwarding browser origin', async () => {
  const result = await readEmailStatus(request(), async (url, options) => {
    assert.equal(url, 'https://ohwalxqwtxtlldalsclj.supabase.co/functions/v1/admin-api/email-status');
    assert.deepEqual(options.headers, {authorization: 'Bearer fake-user-token', apikey: 'fake-public-key'});
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({...ready('production'), internal_secret: 'must-not-leak'});
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.delivery_configured, true);
  assert.equal(result.body.internal_secret, undefined);
});

test('proxy preserves auth and deployment errors and sanitizes upstream errors', async () => {
  for (const status of [401, 403, 404, 500, 429]) {
    const result = await readEmailStatus(request(), async () => new Response('sensitive upstream error', {status}));
    assert.equal(result.status, status < 405 ? status : 502);
    assert.ok(!JSON.stringify(result).includes('sensitive'));
  }
});

test('proxy fails closed on timeout, malformed JSON and unknown modes', async () => {
  for (const fetchStatus of [
    async () => { throw new Error('timeout with sensitive details'); },
    async () => new Response('not JSON'),
    async () => Response.json({}),
    async () => Response.json({...ready('test'), settings:{...ready('test').settings,email_delivery_mode:'invalid'}}),
  ]) {
    const result = await readEmailStatus(request(), fetchStatus);
    assert.equal(result.status, 502);
    assert.ok(!JSON.stringify(result).includes('sensitive'));
  }
});
