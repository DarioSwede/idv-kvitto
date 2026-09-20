# Admininloggning, inbjudningar och säkerhetslogg

Version: 2026.09.20.2. Implementerat lokalt på feature/control-center-email.

## Publikt formulär och separat administration

index.html är fortsatt publikt och kräver ingen adminsession. admin.html går först via admin-login.html om session eller personalbehörighet saknas. Inställningar är en helsidesvy inom administrationen (admin.html?view=settings), inte ett överlägg. Endast aktuell adminroll får öppna vyn, hämta inställningarna eller ändra dem. Övriga personalroller ser inkorgen och logout men hämtar inte inställningsdata. Servern nekar både GET och PATCH /settings för övriga roller. Ändrad roll upptäcks vid återkommande sessionskontroll och sidan laddas om.

## Flöde

- Login använder appens befintliga publika anon-nyckel. Avancerad anslutningsinställning finns kvar för felsökning. Inga servernycklar finns i klienten.
- POST admin-api/login använder en separat, publik Supabase Auth-klient. En serviceklient kontrollerar därefter aktuell admin_users-roll. Lösenord/tokens sparas aldrig i applikationsloggen. Rate limit: 10 försök per normaliserad e-postadress/10 minuter, med hashad nyckel.
- Alla andra adminroutes kräver verifierad Supabase-användare och aktuell personalroll. /invite och /audit kräver admin. Behörighetskontrollen ligger på servern.
- Inbjudan använder Auths inviteUserByEmail och en fast returadress till admin-login.html. Standardroll är viewer. Befintlig medlemskapspost skrivs aldrig över. Auth kan neka inbjudan till ett redan registrerat konto; sådana konton behöver kontrolleras i Supabase, inte automatiskt få en annan roll.
- Avstängd e-post blockerar även inbjudningsfunktionen. Test/Produktion tillåter en uttrycklig admininbjudan till den angivna adressen. Den är en kontoinbjudan, inte ett simulerat kvittomejl. Auths SMTP-konfiguration används för dessa mejl; testmail/kvittomejl använder Resend från Edge Function.
- Inbjudningslänkens tokens tas genast bort ur adressfältet. Servern verifierar behörigheten innan användaren kan välja lösenord och öppna admin. Lösenordet kräver minst 12 tecken; Supabase-policy gäller också.
- Om Auth skickar inbjudan men DB-tilldelningen misslyckas visas detta uttryckligen. Kontot får inte åtkomst utan medlemsraden. Inget automatiskt omförsök görs.
- Logout återkallar Auth-sessionens refresh token och tömmer klientens sessionsdata. Supabase access-JWT kan fortfarande vara giltigt till utgången; borttagen personalroll nekas vid nästa serveranrop.

## Loggning

receipt_admin_audit innehåller DB-tid (UTC), verifierat user_id när känt, event_type, resultat, servergenererat request_id, validerat target_id, metod, fast route, begränsad user-agent och auth_method.

- Appens lösenordsinloggning loggar både lyckade och misslyckade Auth-/rollkontroller. /me loggas som access, inte som en ny lösenordsinloggning.
- Inbjudan, testmail, settings, ärendestatus, arkivering, utloggning och läsning av loggen loggas server-side.
- Ändringar/utskick får först en loggrad med success=null (Påbörjad). Utan denna loggning startas inte åtgärden. En slutrad med samma request_id visar resultatet. Om en åtgärd hinner genomföras men slutloggen fallerar kan den första raden finnas kvar utan bekräftat resultat; kontrollera verkligt utfall innan omförsök. Externa mejl och databaslogg är ingen gemensam transaktion.
- Tokens, lösenord, Authorization, request body, fria felmeddelanden, frågesträngar, bankuppgifter och mejlinnehåll lagras inte.
- IP/land är för närvarande NULL: betrodd proxy-headerkedja har inte verifierats. User-agent är klientstyrd information och behandlas som text, inte som identitetsbevis. Ingen extern geolokalisering används.
- Loggen täcker appens admin-API. Direkt Auth-användning och andra appar i samma Supabase-projekt hör till Supabase Auth Audit Logs. Direkta SQL/Data API-ändringar utanför admin-API:t ingår inte i denna applikationslogg. Befintliga log-access används inte som säkerhetsbevis.
- RLS är på. anon/authenticated saknar tabellåtkomst; endast service kan skriva/läsa och serverroute /audit kräver aktuell adminroll. API visar senaste 100 inom 90 dagar. Daglig pg_cron-gallring tar bort äldre rader. Inga klientroller kan ändra logg eller medlemskap direkt.

## Före publicering (inte utfört)

1. Granska ändringarna och godkänn separat publicering; PR #40 är redan mergad och omfattar inte dessa lokala ändringar.
2. Kontrollera befintliga migrations-ID:n och schema. Applicera receipt_email_safety och receipt_admin_security i ordning. Kör inte om historiska migrationsfiler blint på det delade projektet.
3. Bekräfta att pg_cron kan installeras/användas och att receipt-admin-audit-retention verkligen schemaläggs. Migrationen ska misslyckas, inte hoppa över retention, om pg_cron saknas/inte kan aktiveras.
4. Granska delade app_settings-policyer, särskilt public_select_app_settings och äldre owner-policyer. De har inte ändrats eftersom tabellen används av andra delar av projektet. Använd inte tabellen för hemligheter.
5. Sätt Auth redirect allowlist till exakt https://darioswede.github.io/idv-kvitto/admin-login.html. Kontrollera Auth-mejlmall, Site URL och SMTP, samt att inbjudningslänken återför type=invite och session enligt implicit Auth-flöde. PKCE används inte för admininbjudan.
6. Deploya admin-api med verify_jwt=false enligt den funktionsspecifika config.toml. Endast /login är publik; alla andra routes gör egen getUser-/rollkontroll. Rör inte submit-receipt:s gateway-/CORS-konfiguration. Servermiljön behöver SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY samt tidigare Resend-/rate-limit-konfiguration.
7. Deploya submit-receipt med befintliga säkerhetsinställningar och publicera frontend. Gör sedan ett uttryckligen godkänt end-to-end-test av inbjudan, login, ärenderetur, Test/Avstängd och logg/gallring mot live. Inga riktiga mejl har skickats i utvecklingstesterna.
8. Verifiera betrodda edge-headers innan eventuell IP/landinsamling införs. Denna version samlar inte dessa värden.

Rollback: återställ frontend/serverfunktioner som ett samordnat paket. Behåll auditdata för sin retention; återställ inte auth genom att ta bort behörighetskontroller. Den additiva is_test-kolumnen kan ligga kvar. Ta inte bort personal eller auditdata för att återgå till äldre UI.

## Verifiering

Unit/E2E använder syntetiska data och mockade Auth-/mailanrop. Deno kontrollerar båda serverfunktionerna. Isolerad PostgreSQL (PGlite) verifierar migrations-DDL, grants/RLS, roller, blockerad klientåtkomst och gallrings-SQL, men kan inte köra pg_cron. Live-publicering, SMTP-leverans och schemalagd gallring är inte verifierade.

Referenser: https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail och https://supabase.com/docs/guides/auth/audit-logs .
