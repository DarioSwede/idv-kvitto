import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { corsHeaders, isAllowedOrigin } from "./cors.js";
import { resolveDeliveryRecipient } from "./email-config.js";
import { clientAddress, enforceRateLimit, RateLimitError } from "./rate-limit.js";

const defaultAllowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif", "application/pdf"];
const submissionModes = new Set(["receipts", "travel", "combined"]);
const CLEARING_RANGES: Array<[number, number]> = [[1000,1099],[1100,1199],[1200,1399],[1400,2099],[2110,2189],[2300,2499],[3000,3409],[3410,4999],[5000,5999],[6000,6999],[7000,8999],[9020,9029],[9040,9049],[9060,9079],[9100,9109],[9120,9124],[9130,9199],[9230,9239],[9250,9259],[9270,9289],[9390,9449],[9460,9479],[9500,9599],[9600,9609],[9630,9689],[9700,9719],[9750,9759],[9780,9789],[9960,9969]];
const respond = (body: unknown, status = 200, origin: string | null = null) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" } });
const shortText = (value: string, max = 95) => { const clean = value.replace(/[\r\n\t]+/g, " ").trim(); return clean.length > max ? clean.slice(0, max - 1) + "…" : clean; };
const wrapText = (value: string, max = 88) => { const words = value.replace(/[\r\n\t]+/g, " ").trim().split(/\s+/).filter(Boolean); const lines: string[] = []; let line = ""; for (const word of words) { if (line && `${line} ${word}`.length > max) { lines.push(line); line = word; } else line = line ? `${line} ${word}` : word; } if (line) lines.push(line); return lines; };
const pdfSafeText = (value: string) => value.normalize("NFC").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[^\x20-\x7E\u00A0-\u00FF]/gu, "?");
const formatAmount = (amount: number | null) => amount === null ? "" : new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " kr";
const formatNumber = (value: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(value);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
const toBase64 = (bytes: Uint8Array) => { let result = ""; for (let i = 0; i < bytes.length; i += 32768) result += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(result); };
const modeLabel = (mode: string) => mode === "travel" ? "Endast reseräkning" : mode === "combined" ? "Kvitton + reseräkning" : "Endast kvitton";
const onlyDigits = (value: string) => value.replace(/\D/g, "");
const isKnownClearingNumber = (value: string) => value.length === 4 && CLEARING_RANGES.some(([from, to]) => Number(value) >= from && Number(value) <= to);
const maskAccountNumber = (value: string) => value.length > 4 ? `•••• ${value.slice(-4)}` : "••••";
const shortSubmissionId = (value: string) => value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
const positiveNumber = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
const boundedNumber = (value: unknown, fallback: number, maximum: number) => Math.min(positiveNumber(value, fallback), maximum);
async function runtimeSettings(client: ReturnType<typeof createClient>) {
  const defaults = {
    travelRatePerKm: 2.5,
    maxTravelKm: 10000,
    maxReceipts: 10,
    maxFileSizeMb: 10,
    maxTotalUploadMb: 25,
    allowedTypes: defaultAllowedTypes,
    ccSelfEnabled: true,
    receiptEmailTo: "betala@idrottsveteranerna.se",
    emailDeliveryMode: "production",
    emailTestRecipient: "mail@torbjornzimmerman.se",
    rateLimitRequests: 5,
    rateLimitWindowSeconds: 600
  };
  const { data, error } = await client.from("app_settings").select("key,value").in("key", ["travel_rate_per_km","max_travel_km","max_receipts","max_file_size_mb","max_total_upload_mb","allowed_mime_types","cc_self_enabled","receipt_email_to","email_delivery_mode","email_test_recipient","submission_rate_limit_requests","submission_rate_limit_window_seconds"]);
  if (error) { console.error("app settings unavailable", error); return defaults; }
  const values = Object.fromEntries((data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]));
  return {
    travelRatePerKm: positiveNumber(values.travel_rate_per_km, defaults.travelRatePerKm), maxTravelKm: positiveNumber(values.max_travel_km, defaults.maxTravelKm),
    maxReceipts: Math.floor(positiveNumber(values.max_receipts, defaults.maxReceipts)), maxFileSizeMb: positiveNumber(values.max_file_size_mb, defaults.maxFileSizeMb), maxTotalUploadMb: positiveNumber(values.max_total_upload_mb, defaults.maxTotalUploadMb),
    allowedTypes: Array.isArray(values.allowed_mime_types) && values.allowed_mime_types.every(value => typeof value === "string") ? values.allowed_mime_types : defaults.allowedTypes,
    ccSelfEnabled: typeof values.cc_self_enabled === "boolean" ? values.cc_self_enabled : defaults.ccSelfEnabled,
    receiptEmailTo: typeof values.receipt_email_to === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.receipt_email_to) ? values.receipt_email_to : defaults.receiptEmailTo,
    emailDeliveryMode: typeof values.email_delivery_mode === "string" ? values.email_delivery_mode : defaults.emailDeliveryMode,
    emailTestRecipient: typeof values.email_test_recipient === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email_test_recipient) ? values.email_test_recipient : defaults.emailTestRecipient,
    rateLimitRequests: Math.floor(boundedNumber(values.submission_rate_limit_requests, defaults.rateLimitRequests, 100)),
    rateLimitWindowSeconds: Math.floor(boundedNumber(values.submission_rate_limit_window_seconds, defaults.rateLimitWindowSeconds, 86400))
  };
}

type TravelDetails = { enabled: boolean; km: number | null; description: string; amount: number; calculation: string };
type BankDetails = { clearingNumber: string; accountNumber: string };

async function sendReceiptEmail(input: { submissionMode: string; senderName: string; senderEmail: string; eventTag: string; otherInfo: string; receiptNames: string[]; receiptAmounts: Array<number | null>; receiptTotal: number; amountTotal: number; travel: TravelDetails; bank: BankDetails; submittedAt: Date; pdfBytes: Uint8Array }, recipient: string, senderCopy = false) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RECEIPT_EMAIL_FROM");
  if (!apiKey || !from) return { sent: false, error: "E-posttjänsten är ännu inte konfigurerad." };
  const rows = input.receiptNames.map((name, index) => `<tr><td style="padding:8px;border-bottom:1px solid #e7e3d8">${escapeHtml(name)}</td><td style="padding:8px;border-bottom:1px solid #e7e3d8;text-align:right">${escapeHtml(formatAmount(input.receiptAmounts[index])) || "—"}</td></tr>`).join("");
  const timestamp = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(input.submittedAt);
  const receiptTotalRow = input.submissionMode !== "travel" ? `<tr><td style="padding:10px 8px">Summa kvitton</td><td style="padding:10px 8px;text-align:right">${escapeHtml(formatAmount(input.receiptTotal))}</td></tr>` : "";
  const travelRows = input.travel.enabled ? `<tr><td style="padding:10px 8px">Reseersättning<br><small>${escapeHtml(input.travel.description)} · ${escapeHtml(input.travel.calculation)}</small></td><td style="padding:10px 8px;text-align:right">${escapeHtml(formatAmount(input.travel.amount))}</td></tr>` : "";
  const title = modeLabel(input.submissionMode);
  const intro = senderCopy ? `Här är din kopia av underlaget som skickades in ${escapeHtml(timestamp)}.` : `Nytt underlag inskickat ${escapeHtml(timestamp)} av ${escapeHtml(input.senderName)} (${escapeHtml(input.senderEmail)}).`;
  const accountForRecipient = senderCopy ? maskAccountNumber(input.bank.accountNumber) : input.bank.accountNumber;
  const bankRow = `<p><strong>Konto för utbetalning:</strong><br>Clearing ${escapeHtml(input.bank.clearingNumber)} · Konto ${escapeHtml(accountForRecipient)}</p>`;
  const html = `<!doctype html><html lang="sv"><body style="margin:0;background:#faf8f3;color:#1a2e2a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"><div style="max-width:640px;margin:auto;padding:28px 18px"><div style="background:#fff;border:1px solid #d8d3c4;border-radius:16px;padding:24px"><p style="margin:0 0 8px;color:#2d6a4f;font-weight:700;text-transform:uppercase">Idrottsveteranerna</p><h1 style="margin:0 0 16px;font-size:26px">${senderCopy ? "Kopia på inskickat underlag" : "Nytt inskickat underlag"}</h1><p>${intro}</p><p><strong>Typ av underlag:</strong> ${escapeHtml(title)}</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><tbody>${rows}${receiptTotalRow}${travelRows}<tr><td style="padding:10px 8px;font-weight:700">Totalt</td><td style="padding:10px 8px;text-align:right;font-weight:700">${escapeHtml(formatAmount(input.amountTotal)) || "—"}</td></tr></tbody></table>${bankRow}${input.eventTag ? `<p><strong>Tillfälle:</strong> ${escapeHtml(input.eventTag)}</p>` : ""}${input.otherInfo ? `<p><strong>Övrig information:</strong><br>${escapeHtml(input.otherInfo).replace(/\n/g, "<br>")}</p>` : ""}<p style="margin-top:24px;color:#6b7871;font-size:13px">Automatiskt meddelande från IDV:s ersättningsapp.</p></div></div></body></html>`;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [recipient], subject: `${senderCopy ? "Kopia: " : ""}${title} – Idrottsveteranerna`, html, attachments: [{ filename: "inskickat-underlag.pdf", content: toBase64(input.pdfBytes) }] }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { console.error("receipt email failed", recipient, response.status, result); return { sent: false, error: senderCopy ? "Kopian kunde inte skickas, men underlaget är inskickat." : "Underlaget sparades, men kunde inte mejlas till mail@torbjornzimmerman.se." }; }
  return { sent: true, id: typeof result?.id === "string" ? result.id : null };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) return respond({ error: "Otillåten avsändare." }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method === "GET") {
    const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return respond({ error: "Tjänsten är inte konfigurerad." }, 503, origin);
    const settings = await runtimeSettings(createClient(url, serviceKey, { auth: { persistSession: false } }));
    return respond({ ok: true, email_configured: Boolean(settings.ccSelfEnabled && Deno.env.get("RESEND_API_KEY") && Deno.env.get("RECEIPT_EMAIL_FROM")), settings: { travel_rate_per_km: settings.travelRatePerKm, max_travel_km: settings.maxTravelKm, max_receipts: settings.maxReceipts, max_file_size_mb: settings.maxFileSizeMb, max_total_upload_mb: settings.maxTotalUploadMb, allowed_mime_types: settings.allowedTypes, cc_self_enabled: settings.ccSelfEnabled, receipt_email_to: settings.receiptEmailTo, email_delivery_mode: settings.emailDeliveryMode, email_test_recipient: settings.emailTestRecipient } }, 200, origin);
  }
  if (req.method !== "POST") return respond({ error: "Metoden stöds inte." }, 405, origin);
  const reply = (body: unknown, status = 200) => respond(body, status, origin);
  try {
    const form = await req.formData();
    const submissionMode = String(form.get("submission_mode") ?? "").trim();
    const senderName = String(form.get("sender_name") ?? "").trim();
    const senderEmail = String(form.get("sender_email") ?? "").trim().toLowerCase();
    const clearingNumber = onlyDigits(String(form.get("clearing_number") ?? ""));
    const accountNumber = onlyDigits(String(form.get("account_number") ?? ""));
    const eventTag = String(form.get("event_tag") ?? "").trim();
    const otherInfo = String(form.get("other_info") ?? "").trim();
    const ccSelf = String(form.get("cc_self") ?? "false") === "true";
    const travelEnabled = String(form.get("travel_enabled") ?? "false") === "true";
    const travelApproved = String(form.get("travel_approved") ?? "false") === "true";
    const travelKmRaw = String(form.get("travel_km") ?? "").trim();
    const travelDescription = String(form.get("travel_description") ?? "").trim();
    const travelAmountRaw = String(form.get("travel_amount") ?? "").trim();
    const travelKm = travelKmRaw === "" ? null : Number(travelKmRaw);
    const travelAmount = travelAmountRaw === "" ? 0 : Number(travelAmountRaw);
    const files = form.getAll("receipts").filter((value): value is File => value instanceof File);
    const receiptNames = form.getAll("receipt_names").map((value) => String(value).trim());
    const receiptAmounts = form.getAll("receipt_amounts").map((value) => { const raw = String(value).trim(); return raw === "" ? null : Number(raw); });
    const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Supabase-miljön saknar servernyckel.");
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const settings = await runtimeSettings(supabase), allowedTypes = new Set(settings.allowedTypes);
    const limiterPepper = Deno.env.get("RATE_LIMIT_PEPPER") || serviceKey;
    if (ccSelf && !settings.ccSelfEnabled) return reply({ error: "E-postkopian är inte aktiverad." }, 400);
    if (!submissionModes.has(submissionMode)) return reply({ error: "Välj om du skickar kvitton, reseräkning eller båda." }, 400);
    const needsReceipts = submissionMode !== "travel";
    const needsTravel = submissionMode !== "receipts";
    if (!senderName || senderName.length > 200) return reply({ error: "Ange ett giltigt namn." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(senderEmail) || senderEmail.length > 320) return reply({ error: "Ange en giltig e-postadress." }, 400);
    if (!isKnownClearingNumber(clearingNumber)) return reply({ error: "Ange ett giltigt fyrsiffrigt clearingnummer från en svensk clearingserie." }, 400);
    if (!/^\d{7,12}$/.test(accountNumber)) return reply({ error: "Ange ett kontonummer med 7–12 siffror utan clearingnummer." }, 400);
    if (eventTag.length > 300 || otherInfo.length > 5000) return reply({ error: "Texten är för lång." }, 400);
    if (needsReceipts && (!files.length || files.length > settings.maxReceipts)) return reply({ error: `Lägg till mellan 1 och ${settings.maxReceipts} kvittofiler.` }, 400);
    if (!needsReceipts && files.length) return reply({ error: "Kvittofiler ska inte skickas i läget endast reseräkning." }, 400);
    if (receiptNames.length !== files.length || receiptNames.some((name) => !name || name.length > 200)) return reply({ error: "Ange vad varje kvitto gäller." }, 400);
    if (receiptAmounts.length !== files.length || receiptAmounts.some((amount) => amount === null || !Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99)) return reply({ error: "Ange ett belopp större än 0 för varje kvitto." }, 400);
    if (needsTravel) {
      if (!travelEnabled || !travelApproved || travelKm === null || !Number.isFinite(travelKm) || travelKm < 0.01 || travelKm > settings.maxTravelKm || Math.abs(travelKm * 100 - Math.round(travelKm * 100)) > 1e-9) return reply({ error: "Kontrollera antal kilometer och godkänn reseersättningen." }, 400);
      if (travelDescription.length > 500) return reply({ error: "Resebeskrivningen får vara högst 500 tecken." }, 400);
      const expected = Math.round(travelKm * settings.travelRatePerKm * 100) / 100;
      if (!Number.isFinite(travelAmount) || travelAmount !== expected) return reply({ error: `Reseersättningen stämmer inte med ${settings.travelRatePerKm.toLocaleString('sv-SE')} kr per kilometer.` }, 400);
    } else if (travelEnabled || travelApproved || travelKmRaw || travelDescription || travelAmountRaw) return reply({ error: "Reseuppgifter får inte skickas i läget endast kvitton." }, 400);
    let totalSize = 0;
    for (const file of files) { totalSize += file.size; if (!allowedTypes.has(file.type)) return reply({ error: `Filtypen för ${file.name} stöds inte.` }, 400); if (!file.size || file.size > settings.maxFileSizeMb * 1024 * 1024) return reply({ error: `${file.name} är tom eller större än ${settings.maxFileSizeMb} MB.` }, 400); }
    if (totalSize > settings.maxTotalUploadMb * 1024 * 1024) return reply({ error: `Filerna får tillsammans vara högst ${settings.maxTotalUploadMb} MB.` }, 400);
    const address = clientAddress(req.headers);
    if (address !== "unknown") await enforceRateLimit(supabase, { scope: "ip", value: address, windowSeconds: settings.rateLimitWindowSeconds, maxRequests: settings.rateLimitRequests, pepper: limiterPepper });
    await enforceRateLimit(supabase, { scope: "email", value: senderEmail, windowSeconds: settings.rateLimitWindowSeconds, maxRequests: settings.rateLimitRequests, pepper: limiterPepper });
    const submittedAt = new Date(), receiptTotal = receiptAmounts.reduce((sum, amount) => sum + (amount ?? 0), 0), amountTotal = receiptTotal + travelAmount;
    const calculation = needsTravel ? `${formatNumber(travelKm!)} km × ${formatNumber(settings.travelRatePerKm)} kr = ${formatAmount(travelAmount)}` : "";
    const travelNote = travelDescription || "Kilometerersättning";
    const travel: TravelDetails = { enabled: needsTravel, km: needsTravel ? travelKm : null, description: needsTravel ? travelNote : "", amount: needsTravel ? travelAmount : 0, calculation };
    const travelSummary = needsTravel ? `Reseersättning\nResa: ${travelNote}\nKilometer: ${formatNumber(travelKm!)} km\nBeräkning: ${calculation}\nGodkänt belopp: ${formatAmount(travelAmount)}` : "";
    const storedOtherInfo = [`Typ av underlag: ${modeLabel(submissionMode)}`, otherInfo, travelSummary].filter(Boolean).join("\n\n");
    const { data: submission, error: submissionError } = await supabase.from("receipt_submissions").insert({ sender_name: senderName, sender_email: senderEmail, bank_clearing_number: clearingNumber, bank_account_number: accountNumber, event_tag: eventTag, other_info: storedOtherInfo, amount_total: amountTotal || null, receipt_total: needsReceipts ? (receiptTotal || null) : null, travel_km: needsTravel ? travelKm : null, travel_description: needsTravel ? travelDescription : null, travel_amount: needsTravel ? travelAmount : null, cc_self: false }).select("id").single();
    if (submissionError) throw submissionError;
    const uploadedPaths: string[] = [];
    let finalPdfBytes: Uint8Array;
    try {
      const fileRows = [], finalPdf = await PDFDocument.create(), footerFont = await finalPdf.embedFont(StandardFonts.Helvetica);
      let logo: Awaited<ReturnType<typeof finalPdf.embedPng>> | null = null;
      try { const logoResponse = await fetch("https://darioswede.github.io/idv-kvitto/idv-mark.png"); if (logoResponse.ok) logo = await finalPdf.embedPng(new Uint8Array(await logoResponse.arrayBuffer())); } catch { /* PDF remains valid without the decorative mark. */ }
      const summaryPage = finalPdf.addPage([595.28, 841.89]);
      const ink = rgb(0.1, 0.18, 0.16), muted = rgb(0.35, 0.42, 0.39), brand = rgb(0.18, 0.42, 0.31), soft = rgb(0.92, 0.96, 0.93);
      summaryPage.drawRectangle({ x: 0, y: 770, width: 595.28, height: 71.89, color: rgb(1, 1, 1) });
      if (logo) summaryPage.drawImage(logo, { x: 42, y: 785, width: 38, height: 48, opacity: 0.9 });
      summaryPage.drawText(pdfSafeText("IDROTTSVETERANERNA"), { x: 92, y: 812, size: 10, font: footerFont, color: brand });
      summaryPage.drawText(pdfSafeText("Inskickad sammanställning"), { x: 92, y: 785, size: 21, font: footerFont, color: ink });
      const coverRows: Array<[string, string]> = [
        ["Typ av underlag", modeLabel(submissionMode)],
        ["Ärende-ID", shortSubmissionId(submission.id)],
        ["Avsändare", shortText(senderName, 70)],
        ["E-post", shortText(senderEmail, 80)],
        ["Konto för utbetalning", `Clearing ${clearingNumber} · Konto ${maskAccountNumber(accountNumber)}`],
        ...(eventTag ? [["Tillfälle", shortText(eventTag, 80)] as [string, string]] : [])
      ];
      let coverY = 724;
      for (const [label, value] of coverRows) {
        summaryPage.drawText(pdfSafeText(label.toUpperCase()), { x: 48, y: coverY, size: 8, font: footerFont, color: muted });
        const valueLines = wrapText(value, 76);
        valueLines.forEach((line, index) => summaryPage.drawText(pdfSafeText(line), { x: 48, y: coverY - 18 - index * 14, size: 12, font: footerFont, color: ink }));
        coverY -= 42 + Math.max(0, valueLines.length - 1) * 14;
      }
      const amountRows: Array<[string, string]> = [];
      if (needsReceipts) amountRows.push(["Summa kvitton", formatAmount(receiptTotal) || "-"]);
      if (needsTravel) {
        amountRows.push(["Reseersättning", formatAmount(travelAmount) || "-"]);
        amountRows.push(["Beräkning", `${formatNumber(travelKm!)} km x ${formatNumber(settings.travelRatePerKm)} kr`]);
      }
      const amountBoxTop = coverY - 4;
      const amountBoxHeight = 52 + amountRows.length * 24;
      summaryPage.drawRectangle({ x: 38, y: amountBoxTop - amountBoxHeight, width: 519, height: amountBoxHeight, color: soft });
      summaryPage.drawText(pdfSafeText("BELOPPSÖVERSIKT"), { x: 52, y: amountBoxTop - 18, size: 9, font: footerFont, color: brand });
      let amountY = amountBoxTop - 42;
      for (const [label, value] of amountRows) {
        summaryPage.drawText(pdfSafeText(label), { x: 52, y: amountY, size: 11, font: footerFont, color: ink });
        summaryPage.drawText(pdfSafeText(value), { x: 425, y: amountY, size: 11, font: footerFont, color: ink });
        amountY -= 24;
      }
      summaryPage.drawText(pdfSafeText("TOTALT"), { x: 52, y: amountY - 6, size: 12, font: footerFont, color: ink });
      summaryPage.drawText(pdfSafeText(formatAmount(amountTotal) || "-"), { x: 425, y: amountY - 6, size: 13, font: footerFont, color: brand });
      let notesY = amountBoxTop - amountBoxHeight - 28;
      if (needsTravel) {
        summaryPage.drawText(pdfSafeText(`Resa: ${travelNote}`), { x: 48, y: notesY, size: 10, font: footerFont, color: muted });
        notesY -= 18;
      }
      if (otherInfo) {
        summaryPage.drawText(pdfSafeText("Övrigt:"), { x: 48, y: notesY, size: 10, font: footerFont, color: muted });
        wrapText(otherInfo, 92).forEach((line, index) => summaryPage.drawText(pdfSafeText(line), { x: 48, y: notesY - 14 - index * 14, size: 10, font: footerFont, color: muted }));
      }
      if (logo) summaryPage.drawImage(logo, { x: 205, y: 265, width: 185, height: 185, opacity: 0.055 });
      summaryPage.drawText(pdfSafeText("Detta försättsblad följs av inskickade underlag."), { x: 48, y: 42, size: 9, font: footerFont, color: muted });
      for (const [index, file] of files.entries()) {
        const displayName = receiptNames[index], displayAmount = receiptAmounts[index];
        const rawExtension = file.name.includes(".") ? file.name.split(".").pop()! : "bin", extension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
        const path = `${submission.id}/${String(index + 1).padStart(2, "0")}-${crypto.randomUUID()}.${extension}`, bytes = new Uint8Array(await file.arrayBuffer());
        const { error: uploadError } = await supabase.storage.from("receipt-files").upload(path, bytes, { contentType: file.type, upsert: false }); if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        fileRows.push({ submission_id: submission.id, storage_path: path, original_name: file.name.slice(0, 255) || `kvitto-${index + 1}`, display_name: displayName, display_amount: displayAmount, mime_type: file.type, size_bytes: file.size });
        const details = [displayName, formatAmount(displayAmount)].filter(Boolean).join(" · ");
        const stampSender = pdfSafeText(`Avsändare: ${shortText(senderName, 45)} · E-post: ${shortText(senderEmail, 55)}`);
        const stampReceipt = pdfSafeText(`Kvitto: ${shortText(displayName, 60)} · Belopp: ${formatAmount(displayAmount) || "—"}`);
        const stamp = (page: any) => { page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: 44, color: rgb(1, 1, 1), opacity: 0.94 }); if (logo) page.drawImage(logo, { x: 8, y: 9, width: 26, height: 26 }); const textX = logo ? 42 : 12; page.drawText(stampSender, { x: textX, y: 25, size: 7.5, font: footerFont, color: rgb(0.1, 0.18, 0.16) }); page.drawText(stampReceipt, { x: textX, y: 11, size: 7.5, font: footerFont, color: rgb(0.1, 0.18, 0.16) }); };
        if (file.type === "application/pdf") { let sourcePdf; try { sourcePdf = await PDFDocument.load(bytes); } catch { throw new Error(`PDF-filen ${file.name} kunde inte läsas. Prova att öppna den och spara en ny PDF innan du laddar upp igen.`); } const pages = await finalPdf.copyPages(sourcePdf, sourcePdf.getPageIndices()); for (const page of pages) { finalPdf.addPage(page); stamp(page); } }
        else if (file.type === "image/jpeg" || file.type === "image/png") { const image = file.type === "image/png" ? await finalPdf.embedPng(bytes) : await finalPdf.embedJpg(bytes); const page = finalPdf.addPage([595.28, 841.89]), maxWidth = page.getWidth() - 72, maxHeight = page.getHeight() - 122, scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1), width = image.width * scale, height = image.height * scale; page.drawText(pdfSafeText(shortText(details, 70)), { x: 36, y: page.getHeight() - 36, size: 12, font: footerFont, color: rgb(0.1, 0.18, 0.16) }); page.drawImage(image, { x: (page.getWidth() - width) / 2, y: 50 + (maxHeight - height) / 2, width, height }); stamp(page); }
        else throw new Error(`${file.name} kunde inte omvandlas till PDF. Öppna bilden på telefonen och spara den som JPG.`);
      }
      if (fileRows.length) { const { error: filesError } = await supabase.from("receipt_files").insert(fileRows); if (filesError) throw filesError; }
      const finalPdfPath = `${submission.id}/sammanstallt-underlag.pdf`; finalPdfBytes = new Uint8Array(await finalPdf.save());
      const { error: finalUploadError } = await supabase.storage.from("receipt-files").upload(finalPdfPath, finalPdfBytes, { contentType: "application/pdf", upsert: false }); if (finalUploadError) throw finalUploadError;
      uploadedPaths.push(finalPdfPath);
      const { error: updateError } = await supabase.from("receipt_submissions").update({ final_pdf_path: finalPdfPath }).eq("id", submission.id); if (updateError) throw updateError;
    } catch (error) { if (uploadedPaths.length) await supabase.storage.from("receipt-files").remove(uploadedPaths); await supabase.from("receipt_submissions").delete().eq("id", submission.id); throw error; }
    const emailInput = { submissionMode, senderName, senderEmail, eventTag, otherInfo, receiptNames, receiptAmounts, receiptTotal, amountTotal, travel, bank: { clearingNumber, accountNumber }, submittedAt, pdfBytes: finalPdfBytes! };
    const deliveryRecipient = resolveDeliveryRecipient(settings);
    const deliveryResult = deliveryRecipient ? await sendReceiptEmail(emailInput, deliveryRecipient) : { sent: false, error: "E-post är avstängt i backend-konfigurationen." };
    let copyResult: { sent: boolean; error?: string; id?: string | null } = { sent: false };
    if (ccSelf && settings.ccSelfEnabled) {
      copyResult = await sendReceiptEmail(emailInput, senderEmail, true);
      if (copyResult.sent) await supabase.from("receipt_submissions").update({ cc_self: true }).eq("id", submission.id);
    }
    const { data: signedPdf } = await supabase.storage.from("receipt-files").createSignedUrl(`${submission.id}/sammanstallt-underlag.pdf`, 900);
    return reply({ ok: true, submission_id: submission.id, submission_mode: submissionMode, final_pdf_url: signedPdf?.signedUrl ?? null, delivery_mode: settings.emailDeliveryMode, delivery_recipient: deliveryRecipient, delivery_sent: deliveryResult.sent, delivery_error: deliveryResult.error ?? null, copy_requested: ccSelf && settings.ccSelfEnabled, copy_sent: copyResult.sent, copy_error: copyResult.error ?? null });
  } catch (error) {
    if (error instanceof RateLimitError) return reply({ error: error.message, retry_after_seconds: error.retryAfterSeconds }, 429);
    console.error("submit-receipt failed", error);
    const safeError = error instanceof Error && (error.message.includes("kunde inte omvandlas") || error.message.includes("kunde inte läsas"));
    const message = safeError ? error.message : "Något gick fel. Försök igen om en stund.";
    return reply({ error: message }, 500);
  }
});
