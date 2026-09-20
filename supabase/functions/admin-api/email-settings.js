import {EMAIL_MODES, validEmail} from '../submit-receipt/email-config.js';
export function emailSettingError(key, value, role) {
  if (!['email_delivery_mode','email_test_recipient','receipt_email_to'].includes(key)) return null;
  if (role !== 'admin') return 'Endast admin får ändra e-postinställningar.';
  if (key === 'email_delivery_mode') return EMAIL_MODES.has(value) ? null : 'Ogiltigt e-postläge.';
  return value === '' || validEmail(value) ? null : 'Ange en giltig e-postadress eller lämna tomt för att blockera leverans.';
}
