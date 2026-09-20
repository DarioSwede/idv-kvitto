import {validEmail, resolveEmailSettings} from '../submit-receipt/email-config.js';
import {renderReceiptEmail, sendReceiptEmail} from '../submit-receipt/receipt-email.js';

export class MailValidationError extends Error {}
export function testMessage(kind, now = new Date()) {
  if (!['test', 'production', 'system'].includes(kind)) throw new MailValidationError('Välj typ av test.');
  return {
    isTest:true, submissionId:null, submissionMode:'combined',
    senderName:kind === 'system' ? 'Systemtest' : 'Exempelperson', senderEmail:'example@example.org',
    eventTag:kind === 'system' ? 'Neutralt systemtest' : `Representativt kassörsmeddelande (${kind === 'test' ? 'testmottagare' : 'produktionsmottagare'})`,
    otherInfo:'Detta är ett test utan verkligt ärende eller PDF-bilaga. Ingen utbetalning ska göras.',
    receiptNames:kind === 'system' ? [] : ['Exempelkvitto'], receiptAmounts:kind === 'system' ? [] : [100],
    receiptTotal:kind === 'system' ? 0 : 100, amountTotal:kind === 'system' ? 0 : 125,
    travel:{enabled:kind !== 'system', description:'Exempelresa', calculation:'10 km × 2,50 kr = 25,00 kr', amount:25},
    bank:{clearingNumber:'TEST', accountNumber:'TEST'}, submittedAt:now,
  };
}
export async function deliverTestMail({role, body, rows, config, send = fetch}) {
  if (role !== 'superuser') throw new Response(JSON.stringify({error:'SU-behörighet krävs.'}), {status:403});
  if (!validEmail(body?.recipient)) throw new MailValidationError('Ange en giltig e-postadress.');
  const settings = resolveEmailSettings(Object.fromEntries(rows.map(row => [row.key, row.value])));
  if (settings.emailDeliveryMode === 'disabled') throw new MailValidationError('E-post är avstängd. Välj Test eller Produktion och spara först.');
  const message = testMessage(body.kind);
  const result = await sendReceiptEmail(message, body.recipient.trim().toLowerCase(), false, config, send);
  return {...result, preview:renderReceiptEmail(message)};
}
