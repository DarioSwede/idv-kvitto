export function resolveDeliveryRecipient(settings) {
  const mode = settings.emailDeliveryMode || 'production';
  const testRecipient = typeof settings.emailTestRecipient === 'string' ? settings.emailTestRecipient.trim() : '';
  const productionRecipient = typeof settings.receiptEmailTo === 'string' ? settings.receiptEmailTo.trim() : '';

  if (mode === 'disabled') return null;
  if (mode === 'test') return testRecipient || productionRecipient || null;
  return productionRecipient || testRecipient || null;
}
