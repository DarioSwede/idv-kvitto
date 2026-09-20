const formatAmount = (amount) => amount === null ? "" : new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " kr";
const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
const toBase64 = (bytes) => { let result = ""; for (let i = 0; i < bytes.length; i += 32768) result += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(result); };
const modeLabel = (mode) => mode === "travel" ? "Endast milersättning" : mode === "combined" ? "Kvitton + milersättning" : "Endast kvitton";
const maskAccountNumber = (value) => value.length > 4 ? `•••• ${value.slice(-4)}` : "••••";
export function adminLink(id) {
  const url = new URL('https://darioswede.github.io/idv-kvitto/admin.html');
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '')) url.searchParams.set('submission', id);
  return url.href;
}
export function renderReceiptEmail(input, senderCopy = false) {
  const rows = input.receiptNames.map((name, index) => `<tr><td style="padding:8px;border-bottom:1px solid #e7e3d8">${escapeHtml(name)}</td><td style="padding:8px;border-bottom:1px solid #e7e3d8;text-align:right">${escapeHtml(formatAmount(input.receiptAmounts[index])) || "—"}</td></tr>`).join("");
  const timestamp = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(input.submittedAt);
  const receiptTotalRow = input.submissionMode !== "travel" ? `<tr><td style="padding:10px 8px">Summa kvitton</td><td style="padding:10px 8px;text-align:right">${escapeHtml(formatAmount(input.receiptTotal))}</td></tr>` : "";
  const travelRows = input.travel.enabled ? `<tr><td style="padding:10px 8px">Milersättning<br><small>${escapeHtml(input.travel.description)} · ${escapeHtml(input.travel.calculation)}</small></td><td style="padding:10px 8px;text-align:right">${escapeHtml(formatAmount(input.travel.amount))}</td></tr>` : "";
  const title = modeLabel(input.submissionMode);
  const intro = senderCopy ? `Här är din kopia av underlaget som skickades in ${escapeHtml(timestamp)}.` : `Nytt underlag inskickat ${escapeHtml(timestamp)} av ${escapeHtml(input.senderName)} (${escapeHtml(input.senderEmail)}).`;
  const accountForRecipient = senderCopy ? maskAccountNumber(input.bank.accountNumber) : input.bank.accountNumber;
  const bankRow = `<p><strong>Konto för utbetalning:</strong><br>Clearing ${escapeHtml(input.bank.clearingNumber)} · Konto ${escapeHtml(accountForRecipient)}</p>`;
  const html = `<!doctype html><html lang="sv"><body style="margin:0;background:#faf8f3;color:#1a2e2a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"><div style="max-width:640px;margin:auto;padding:28px 18px"><div style="background:#fff;border:1px solid #d8d3c4;border-radius:16px;padding:24px"><p style="margin:0 0 8px;color:#2d6a4f;font-weight:700;text-transform:uppercase">Idrottsveteranerna</p><h1 style="margin:0 0 16px;font-size:26px">${senderCopy ? "Kopia på inskickat underlag" : "Nytt inskickat underlag"}</h1><p>${intro}</p>${input.isTest ? "<p><strong>TESTUNDERLAG – ska inte betalas ut.</strong></p>" : ""}<p><strong>Typ av underlag:</strong> ${escapeHtml(title)}</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><tbody>${rows}${receiptTotalRow}${travelRows}<tr><td style="padding:10px 8px;font-weight:700">Totalt</td><td style="padding:10px 8px;text-align:right;font-weight:700">${escapeHtml(formatAmount(input.amountTotal)) || "—"}</td></tr></tbody></table>${bankRow}${input.eventTag ? `<p><strong>Tillfälle:</strong> ${escapeHtml(input.eventTag)}</p>` : ""}${input.otherInfo ? `<p><strong>Övrig information:</strong><br>${escapeHtml(input.otherInfo).replace(/\n/g, "<br>")}</p>` : ""}${!senderCopy ? `<p><a href="${escapeHtml(adminLink(input.submissionId))}">Öppna ärendet i kvittoadministrationen</a></p>` : ""}<p style="margin-top:24px;color:#6b7871;font-size:13px">Automatiskt meddelande från IDV:s ersättningsapp.</p></div></div></body></html>`;

  return {subject: `${input.isTest ? '[TEST] ' : ''}${senderCopy ? 'Kopia: ' : ''}${title} – Idrottsveteranerna`, html};
}
// Only fixed, allowlisted explanations leave the server; never echo provider payloads.
export function emailFailure(status, result) {
  const name=typeof result?.name==='string'?result.name:'';
  const message=typeof result?.message==='string'?result.message:'';
  let code='provider_rejected', explanation='E-posttjänsten avvisade meddelandet.';
  if (status===403 && name==='validation_error' && /only send testing emails/i.test(message)) {
    code='test_recipient_restricted';explanation='Resend tillåter just nu bara testmejl till kontots egen adress. Verifiera en avsändardomän för andra mottagare.';
  } else if (status===403 && name==='validation_error' && /domain.*not verified/i.test(message)) {
    code='sender_domain_unverified';explanation='Avsändardomänen är inte verifierad i Resend. Kontrollera domänen och RECEIPT_EMAIL_FROM.';
  } else if (status===401 || ['invalid_api_key','missing_api_key','restricted_api_key','suspended_api_key','invalid_permission'].includes(name)) {
    code='provider_credentials_rejected';explanation='Resend nekar API-nyckeln eller dess behörighet. Kontrollera RESEND_API_KEY i Supabase.';
  } else if (status===429) {
    code='provider_limit';explanation='Resends sändningsgräns har nåtts. Kontrollera kvot och hastighetsgräns.';
  } else if (status===400 || status===422) {
    code='provider_invalid_request';explanation='Resend godkände inte meddelandets format eller avsändaradress.';
  } else if (status>=500) {
    code='provider_unavailable';explanation='E-posttjänsten är tillfälligt otillgänglig. Kontrollera leveransstatus innan ett nytt försök.';
  }
  return {sent:false,error:`${explanation} (${code}, HTTP ${status})`,error_code:code};
}
export async function sendReceiptEmail(input, recipient, senderCopy, {apiKey, from}, send = fetch) {
  if (!apiKey || !from) return {sent:false, error:'E-posttjänsten är inte konfigurerad.'};
  const message = renderReceiptEmail(input, senderCopy);
  try {
    const response = await send('https://api.resend.com/emails', {
      method:'POST', redirect:'error', signal:AbortSignal.timeout(15000),
      headers:{Authorization:`Bearer ${apiKey}`, 'Content-Type':'application/json'},
      body:JSON.stringify({from, to:[recipient], ...message,
        ...(input.pdfBytes ? {attachments:[{filename:input.isTest ? 'TEST-underlag.pdf' : 'inskickat-underlag.pdf', content:toBase64(input.pdfBytes)}]} : {})})
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return emailFailure(response.status,result);
    return {sent:true, id:typeof result.id === 'string' ? result.id : null};
  } catch {
    return {sent:false, error:'Leveransen kunde inte bekräftas. Kontrollera leveransstatus innan du försöker igen.'};
  }
}
