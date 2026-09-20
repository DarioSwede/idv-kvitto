import { resolveEmailSettings, resolveDeliveryRecipient } from '../submit-receipt/email-config.js';

// Read-only foundation for email administration. Never return provider secrets.
export function emailStatus(rows, { apiKey, from }) {
  const settings = resolveEmailSettings(Object.fromEntries(rows.map(row => [row.key, row.value])));
  const configured = Boolean(apiKey && from);
  return {
    settings: {
      email_delivery_mode: settings.emailDeliveryMode,
      receipt_email_to: settings.receiptEmailTo,
      email_test_recipient: settings.emailTestRecipient,
    },
    delivery_configured: configured,
    copy_available: configured && settings.ccSelfEnabled && Boolean(resolveDeliveryRecipient(settings)),
    delivery_enabled: Boolean(resolveDeliveryRecipient(settings)),
    effective_recipient: resolveDeliveryRecipient(settings),
  };
}
