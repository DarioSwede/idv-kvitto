# Adminbackend – arkitektur

Backenddelen är uppdelad så att inlämning, administration och inställningar kan utvecklas oberoende av varandra.

## Säkerhetsmodell

- Admin använder Supabase Auth.
- Endast användare som finns i `admin_users` med rollen `admin` får använda admin-API:t.
- Admin-API:t kör med `verify_jwt=true` och gör dessutom en egen behörighetskontroll på serversidan.
- RLS är aktiverat på `admin_users`, `app_settings`, `receipt_submissions` och `receipt_files`.
- Service-role-nyckeln används endast inne i Edge Functions och får aldrig skickas till webbläsaren.
- Serverhemligheter som Resend-nycklar och service-role-nyckel ska fortsatt ligga som Supabase secrets, inte i `app_settings`.
- PDF-länkar till admin är kortlivade signerade länkar, inte publika filer.

## Moduler

`supabase/functions/admin-api/auth.ts`
: autentisering och adminbehörighet.

`supabase/functions/admin-api/settings.ts`
: läsning och ändring av tillåtna parametrar.

`supabase/functions/admin-api/submissions.ts`
: lista inskick, detaljvy, status, adminanteckning och signerad PDF-länk.

`supabase/functions/admin-api/index.ts`
: tunn router som kopplar HTTP-routes till modulerna.

`supabase/functions/submit-receipt/index.ts`
: publik kvittoinlämning. Den ska hållas frikopplad från admin-UI så att ett adminfel inte stoppar nya inskick.

## Förberedda inställningar

- `travel_rate_per_km` – 2,50 kr/km (25 kr/mil)
- `max_travel_km`
- `max_receipts`
- `max_file_size_mb`
- `max_total_upload_mb`
- `allowed_mime_types`
- `ocr_enabled`
- `ocr_retry_enabled`
- `cc_self_enabled`
- `receipt_email_to`
- `retention_days`

Faktiska e-posthemligheter, API-nycklar och service-role-nycklar ska **inte** göras redigerbara i admin.

## Inskick och status

Varje inskick får status:

- `new` – nytt/obehandlat
- `in_progress` – pågående handläggning
- `done` – klart

Admin-API:t kan sortera inskick efter datum, filtrera på status, öppna detaljdata, uppdatera status och adminanteckning samt skapa en signerad PDF-länk för visning/utskrift.

## Nästa UI-steg

En separat `/admin/`-klient kan byggas ovanpå API:t med fyra oberoende sektioner: Inloggning, Inskick, Detalj/utskrift och Inställningar. Varje sektion bör ligga i egen JavaScript-modul så att den kan uppdateras utan att övriga delar behöver ändras.
