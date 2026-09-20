// Missing, invalid or unavailable settings must never enable delivery.
export const EMAIL_MODES = new Set(['production', 'test', 'disabled']);
export function validEmail(value) {
  return typeof value === 'string' && value.trim().length <= 254 &&
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(value.trim());
}
const email = value => validEmail(value) ? value.trim().toLowerCase() : '';
export function resolveEmailSettings(values = {}) {
  return {
    ccSelfEnabled: values.cc_self_enabled === true,
    receiptEmailTo: email(values.receipt_email_to),
    emailDeliveryMode: EMAIL_MODES.has(values.email_delivery_mode) ? values.email_delivery_mode : 'disabled',
    emailTestRecipient: email(values.email_test_recipient),
  };
}
export function resolveDeliveryRecipient(settings) {
  const production = email(settings.receiptEmailTo);
  const test = email(settings.emailTestRecipient);
  if (settings.emailDeliveryMode === 'production') return production || null;
  if (settings.emailDeliveryMode === 'test' && test && test !== production) return test;
  return null;
}
export function resolveCopyRecipient(settings, senderEmail, requested) {
  if (!requested || !settings.ccSelfEnabled || !resolveDeliveryRecipient(settings)) return null;
  return settings.emailDeliveryMode === 'test' ? resolveDeliveryRecipient(settings) : email(senderEmail) || null;
}
