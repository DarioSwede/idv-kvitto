// Shared by receipt delivery and the authenticated admin status route.
export function resolveEmailSettings(values = {}) {
  const email = (value, fallback) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : fallback;
  return {
    ccSelfEnabled: typeof values.cc_self_enabled === 'boolean' ? values.cc_self_enabled : true,
    receiptEmailTo: email(values.receipt_email_to, 'betala@idrottsveteranerna.se'),
    emailDeliveryMode: typeof values.email_delivery_mode === 'string' ? values.email_delivery_mode : 'production',
    emailTestRecipient: email(values.email_test_recipient, 'mail@torbjornzimmerman.se'),
  };
}

export function resolveDeliveryRecipient(settings) {
  const mode = settings.emailDeliveryMode || 'production';
  const testRecipient = typeof settings.emailTestRecipient === 'string' ? settings.emailTestRecipient.trim() : '';
  const productionRecipient = typeof settings.receiptEmailTo === 'string' ? settings.receiptEmailTo.trim() : '';

  if (mode === 'disabled') return null;
  if (mode === 'test') return testRecipient || productionRecipient || null;
  return productionRecipient || testRecipient || null;
}
