import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDeliveryRecipient } from '../supabase/functions/submit-receipt/email-config.js';

test('uses the configured test recipient in test mode', () => {
  const recipient = resolveDeliveryRecipient({
    emailDeliveryMode: 'test',
    emailTestRecipient: 'mail@torbjornzimmerman.se',
    receiptEmailTo: 'kvitto@idrottsveteranerna.se',
  });

  assert.equal(recipient, 'mail@torbjornzimmerman.se');
});

test('uses production recipient in production mode', () => {
  const recipient = resolveDeliveryRecipient({
    emailDeliveryMode: 'production',
    emailTestRecipient: 'mail@torbjornzimmerman.se',
    receiptEmailTo: 'kvitto@idrottsveteranerna.se',
  });

  assert.equal(recipient, 'kvitto@idrottsveteranerna.se');
});

test('returns null when emails are disabled', () => {
  const recipient = resolveDeliveryRecipient({
    emailDeliveryMode: 'disabled',
    emailTestRecipient: 'mail@torbjornzimmerman.se',
    receiptEmailTo: 'kvitto@idrottsveteranerna.se',
  });

  assert.equal(recipient, null);
});
