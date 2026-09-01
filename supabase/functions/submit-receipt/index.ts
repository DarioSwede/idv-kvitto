import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = { "Access-Control-Allow-Origin": "https://darioswede.github.io", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif", "application/pdf"]);
const submissionModes = new Set(["receipts", "travel", "combined"]);
const TRAVEL_RATE_PER_KM = 2.5;
const TRAVEL_RATE_PER_MIL = 25;
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });
const shortText = (value: string, max = 95) => { const clean = value.replace(/[\r\n\t]+/g, " ").trim(); return clean.length > max ? clean.slice(0, max - 1) + "…" : clean; };
const pdfSafeText = (value: string) => value.normalize("NFC").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[^\x20-\x7E\u00A0-\u00FF]/gu, "?");
const formatAmount = (amount: number | null) => amount === null ? "" : new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount) + " kr";
const formatNumber = (value: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(value);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
const toBase64 = (bytes: Uint8Array) => { let result = ""; for (let i = 0; i < bytes.length; i += 32768) result += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(result); };
const modeLabel = (mode: string) => mode === "travel" ? "Endast reseräkning" : mode === "combined" ? "Kvitton + reseräkning" : "Endast kvitton";

type TravelDetails = { enabled: boolean; km: number | null; description: string; amount: number; calculation: string };

async function sendSelfCopy(input: { submissionMode: string; senderName: string; senderEmail: string; eventTag: string; otherInfo: string; receiptNames: string[]; receiptAmounts: Array<number | null>; receiptTotal: number; amountTotal: number; travel: TravelDetails; submittedAt: Date; pdfBytes: Uint8Array }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RECEIPT_EMAIL_FROM");
  if (!apiKey || !from) return { sent: false, error: "E-posttjänsten är ännu inte konfigurerad." };
  const rows = input.receiptNames.map((name, index) => `<tr><td style="padding:8px;border-bottom:1px solid #e7e3d8">${escapeHtml(name)}</td><td style="padding:8px;border-bottom:1px solid #e7e3d8;text-align:right">${escapeHtml(formatAmount(input.receiptAmounts[index])) || "—"}</td></tr>`).join("");
  const timestamp = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(input.submittedAt);
  const receiptTotalRow = input.submissionMode !== "travel" ? `<tr><td style="padding:10px 8px">Summa kvitton</td><td style="padding:10px 8px;text-align:right">${escapeHtml(formatAmount(input.receiptTotal))}</td></tr>` : "";
  const travelRows = input.travel.enabled ? `<tr><td style="padding:10px 8px">Reseersättning<br><small>${escapeHtml(input.travel.description)} · ${escapeHtml(input.travel.calculation)}</small></td><td style="padding:10px 8px;text-align:right">${escapeHtml(formatAmount(input.travel.amount))}</td></tr>` : "";
  const title = modeLabel(input.submissionMode);
  const html = `<!doctype html><html lang="sv"><body style="margin:0;background:#faf8f3;color:#1a2e2a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"><div style="max-width:640px;margin:auto;padding:28px 18px"><div style="background:#fff;border:1px solid #d8d3c4;border-radius:16px;padding:24px"><p style="margin:0 0 8px;color:#2d6a4f;font-weight:700;text-transform:uppercase">Idrottsveteranerna</p><h1 style="margin:0 0 16px;font-size:26px">Kopia på inskickat underlag</h1><p>Hej ${escapeHtml(input.senderName)},</p><p>Här är din kopia av underlaget som skickades in ${escapeHtml(timestamp)}.</p><p><strong>Typ av underlag:</strong> ${escapeHtml(title)}</p><table style="width:100%;border-collapse:collapse;margin:20px 0"><tbody>${rows}${receiptTotalRow}${travelRows}<tr><td style="padding:10px 8px;font-weight:700">Totalt</td><td style="padding:10px 8px;text-align:right;font-weight:700">${escapeHtml(formatAmount(input.amountTotal)) || "—"}</td></tr></tbody></table>${input.eventTag ? `<p><strong>Tillfälle:</strong> ${escapeHtml(input.eventTag)}</p>` : ""}${input.otherInfo ? `<p><strong>Övrig information:</strong><br>${escapeHtml(input.otherInfo).replace(/\n/g, "<br>")}</p>` : ""}<p style="margin-top:24px;color:#6b7871;font-size:13px">Detta är en automatisk kopia från IDV:s ersättningsapp.</p></div></div></body></html>`;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [input.senderEmail], subject: `${title} – Idrottsveteranerna`, html, attachments: [{ filename: "inskickat-underlag.pdf", content: toBase64(input.pdfBytes) }] }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { console.error("self-copy email failed", response.status, result); return { sent: false, error: "Kopian kunde inte skickas, men underlaget är inskickat." }; }
  return { sent: true, id: typeof result?.id === "string" ? result.id : null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method === "GET") return respond({ ok: true, email_configured: Boolean(Deno.env.get("RESEND_API_KEY") && Deno.env.get("RECEIPT_EMAIL_FROM")) });
  if (req.method !== "POST") return respond({ error: "Metoden stöds inte." }, 405);
  const origin = req.headers.get("origin");
  if (origin && origin !== "https://darioswede.github.io") return respond({ error: "Otillåten avsändare." }, 403);
  try {
    const form = await req.formData();
    const submissionMode = String(form.get("submission_mode") ?? "").trim();
    const senderName = String(form.get("sender_name") ?? "").trim();
    const senderEmail = String(form.get("sender_email") ?? "").trim().toLowerCase();
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
    if (!submissionModes.has(submissionMode)) return respond({ error: "Välj om du skickar kvitton, reseräkning eller båda." }, 400);
    const needsReceipts = submissionMode !== "travel";
    const needsTravel = submissionMode !== "receipts";
    if (!senderName || senderName.length > 200) return respond({ error: "Ange ett giltigt namn." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(senderEmail) || senderEmail.length > 320) return respond({ error: "Ange en giltig e-postadress." }, 400);
    if (eventTag.length > 300 || otherInfo.length > 5000) return respond({ error: "Texten är för lång." }, 400);
    if (needsReceipts && (!files.length || files.length > 10)) return respond({ error: "Lägg till mellan 1 och 10 kvittofiler." }, 400);
    if (!needsReceipts && files.length) return respond({ error: "Kvittofiler ska inte skickas i läget endast reseräkning." }, 400);
    if (receiptNames.length !== files.length || receiptNames.some((name) => !name || name.length > 200)) return respond({ error: "Ange vad varje kvitto gäller." }, 400);
    if (receiptAmounts.length !== files.length || receiptAmounts.some((amount) => amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99))) return respond({ error: "Kontrollera beloppen." }, 400);
    if (needsTravel) {
      if (!travelEnabled || !travelApproved || travelKm === null || !Number.isFinite(travelKm) || travelKm < 0.01 || travelKm > 10000 || Math.abs(travelKm * 100 - Math.round(travelKm * 100)) > 1e-9) return respond({ error: "Kontrollera antal kilometer och godkänn reseersättningen." }, 400);
      if (!travelDescription || travelDescription.length > 500) return respond({ error: "Beskriv resan med högst 500 tecken." }, 400);
      const expected = Math.round(travelKm * TRAVEL_RATE_PER_KM * 100) / 100;
      if (!Number.isFinite(travelAmount) || travelAmount !== expected) return respond({ error: `Reseersättningen stämmer inte med ${TRAVEL_RATE_PER_KM.toLocaleString('sv-SE')} kr per kilometer.` }, 400);
    } else if (travelEnabled || travelApproved || travelKmRaw || travelDescription || travelAmountRaw) return respond({ error: "Reseuppgifter får inte skickas i läget endast kvitton." }, 400);
    let totalSize = 0;
    for (const file of files) { totalSize += file.size; if (!allowedTypes.has(file.type)) return respond({ error: `Filtypen för ${file.name} stöds inte.` }, 400); if (!file.size || file.size > 10 * 1024 * 1024) return respond({ error: `${file.name} är tom eller större än 10 MB.` }, 400); }
    if (totalSize > 25 * 1024 * 1024) return respond({ error: "Filerna får tillsammans vara högst 25 MB." }, 400);
    const url = Deno.env.get("SUPABASE_URL"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) throw new Error("Supabase-miljön saknar servernyckel.");
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const submittedAt = new Date(), receiptTotal = receiptAmounts.reduce((sum, amount) => sum + (amount ?? 0), 0), amountTotal = receiptTotal + travelAmount;
    const calculation = needsTravel ? `${formatNumber(travelKm!)} km ÷ 10 × ${TRAVEL_RATE_PER_MIL} kr = ${formatAmount(travelAmount)}` : "";
    const travel: TravelDetails = { enabled: needsTravel, km: needsTravel ? travelKm : null, description: needsTravel ? travelDescription : "", amount: needsTravel ? travelAmount : 0, calculation };
    const travelSummary = needsTravel ? `Reseersättning\nResa: ${travelDescription}\nKilometer: ${formatNumber(travelKm!)} km\nBeräkning: ${calculation}\nGodkänt belopp: ${formatAmount(travelAmount)}` : "";
    const storedOtherInfo = [`Typ av underlag: ${modeLabel(submissionMode)}`, otherInfo, travelSummary].filter(Boolean).join("\n\n");
    const { data: submission, error: submissionError } = await supabase.from("receipt_submissions").insert({ sender_name: senderName, sender_email: senderEmail, event_tag: eventTag, other_info: storedOtherInfo, amount_total: amountTotal || null, receipt_total: needsReceipts ? (receiptTotal || null) : null, travel_km: needsTravel ? travelKm : null, travel_description: needsTravel ? travelDescription : null, travel_amount: needsTravel ? travelAmount : null, cc_self: false }).select("id").single();
    if (submissionError) throw submissionError;
    const uploadedPaths: string[] = [];
    let finalPdfBytes: Uint8Array;
    try {
      const fileRows = [], finalPdf = await PDFDocument.create(), footerFont = await finalPdf.embedFont(StandardFonts.Helvetica);
      const summaryPage = finalPdf.addPage([595.28, 841.89]);
      const summaryLines = [`Inskickad sammanställning`, `Typ av underlag: ${modeLabel(submissionMode)}`, `Avsändare: ${shortText(senderName, 70)}`, `E-post: ${shortText(senderEmail, 80)}`, eventTag ? `Tillfälle: ${shortText(eventTag, 80)}` : "", "", needsReceipts ? `Summa kvitton: ${formatAmount(receiptTotal) || "—"}` : "", needsTravel ? `Resa: ${shortText(travelDescription, 80)}` : "", needsTravel ? `Beräkning: ${calculation}` : "", needsTravel ? `Godkänd reseersättning: ${formatAmount(travelAmount)}` : "", `Totalt: ${formatAmount(amountTotal) || "—"}`, otherInfo ? "" : "", otherInfo ? `Övrig information: ${shortText(otherInfo, 120)}` : ""].filter((line, index, all) => line || (index > 0 && all[index - 1]));
      summaryLines.forEach((line, index) => summaryPage.drawText(pdfSafeText(line), { x: 48, y: 790 - index * 28, size: index === 0 ? 18 : 11, font: footerFont, color: rgb(0.1, 0.18, 0.16) }));
      let logo: Awaited<ReturnType<typeof finalPdf.embedPng>> | null = null;
      try { const logoResponse = await fetch("https://darioswede.github.io/idv-kvitto/idv-mark.png"); if (logoResponse.ok) logo = await finalPdf.embedPng(new Uint8Array(await logoResponse.arrayBuffer())); } catch { /* PDF remains valid without the decorative mark. */ }
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
        if (file.type === "application/pdf") { const sourcePdf = await PDFDocument.load(bytes); const pages = await finalPdf.copyPages(sourcePdf, sourcePdf.getPageIndices()); for (const page of pages) { finalPdf.addPage(page); stamp(page); } }
        else if (file.type === "image/jpeg" || file.type === "image/png") { const image = file.type === "image/png" ? await finalPdf.embedPng(bytes) : await finalPdf.embedJpg(bytes); const page = finalPdf.addPage([595.28, 841.89]), maxWidth = page.getWidth() - 72, maxHeight = page.getHeight() - 122, scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1), width = image.width * scale, height = image.height * scale; page.drawText(pdfSafeText(shortText(details, 70)), { x: 36, y: page.getHeight() - 36, size: 12, font: footerFont, color: rgb(0.1, 0.18, 0.16) }); page.drawImage(image, { x: (page.getWidth() - width) / 2, y: 50 + (maxHeight - height) / 2, width, height }); stamp(page); }
        else throw new Error(`${file.name} kunde inte omvandlas till PDF. Öppna bilden på telefonen och spara den som JPG.`);
      }
      if (fileRows.length) { const { error: filesError } = await supabase.from("receipt_files").insert(fileRows); if (filesError) throw filesError; }
      const finalPdfPath = `${submission.id}/sammanstallt-underlag.pdf`; finalPdfBytes = new Uint8Array(await finalPdf.save());
      const { error: finalUploadError } = await supabase.storage.from("receipt-files").upload(finalPdfPath, finalPdfBytes, { contentType: "application/pdf", upsert: false }); if (finalUploadError) throw finalUploadError;
      uploadedPaths.push(finalPdfPath);
      const { error: updateError } = await supabase.from("receipt_submissions").update({ final_pdf_path: finalPdfPath }).eq("id", submission.id); if (updateError) throw updateError;
    } catch (error) { if (uploadedPaths.length) await supabase.storage.from("receipt-files").remove(uploadedPaths); await supabase.from("receipt_submissions").delete().eq("id", submission.id); throw error; }
    let copyResult: { sent: boolean; error?: string; id?: string | null } = { sent: false };
    if (ccSelf) {
      copyResult = await sendSelfCopy({ submissionMode, senderName, senderEmail, eventTag, otherInfo, receiptNames, receiptAmounts, receiptTotal, amountTotal, travel, submittedAt, pdfBytes: finalPdfBytes! });
      if (copyResult.sent) await supabase.from("receipt_submissions").update({ cc_self: true }).eq("id", submission.id);
    }
    return respond({ ok: true, submission_id: submission.id, submission_mode: submissionMode, copy_requested: ccSelf, copy_sent: copyResult.sent, copy_error: copyResult.error ?? null });
  } catch (error) { console.error("submit-receipt failed", error); const message = error instanceof Error && error.message.includes("kunde inte omvandlas") ? error.message : "Något gick fel. Försök igen om en stund."; return respond({ error: message }, 500); }
});