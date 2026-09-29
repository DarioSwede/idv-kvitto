# Korta ärendenummer

`receipt_submissions.case_number` är en permanent visningsreferens, exempelvis `2026-0042`. Året kommer från inskickningstidpunkten i Europe/Stockholm. Löpnumret är globalt, startar på 1 och återställs inte vid årsskiftet. Minst fyra siffror visas; fler än 9999 ärenden stöds. Luckor i serien är tillåtna. UUID förblir primärnyckel och används i API-anrop och länkar.

Migreringen låser tabellen under tilldelningen till befintliga ärenden, sorterade på created_at och id. Nya nummer tilldelas atomiskt av en PostgreSQL-sekvens. En trigger skyddar numret mot senare ändring och ignorerar klientangivet nummer vid insert. Ingen RLS-policy eller tabellbehörighet ändras. Sekvensen är bara tillgänglig för service_role och databasägaren. Testärenden använder samma serie.

## Publiceringsordning

Efter ägarens godkännande:

1. Spara aktuell admin-api-version som återgångspunkt och kontrollera aktuell migreringsstatus.
2. Applicera `20260929204738_add_receipt_case_numbers.sql`. Kontrollera att alla rader har ett unikt case_number och att UUID, antal ärenden och originaluppgifter är oförändrade. Kör Supabase säkerhetsrådgivare.
3. Publicera admin-api med case_number i listprojektionen. Behåll produktionsversionens övriga funktioner; jämför alla filer före publicering.
4. Publicera adminvyn och verifiera två befintliga ärenden inloggat. Inga bankuppgifter behöver läsas ut.

Frontend kan publiceras före backend, men visar då tidigare förkortade UUID. Backendens nya projektion kräver migreringen först.

## Återgång

Återställ tidigare frontend/backend vid behov, men behåll tilldelade case_number och sekvensen. Dessa är additiva och påverkar inte den tidigare projektionen. Radera eller numrera inte om referenser som hunnit visas för användare.

## Lokalt verifierat

Migreringen har körts i PGlite/PostgreSQL på syntetiska tomma och befintliga tabeller: kronologisk tilldelning, svenskt årsskifte, nya nummer, skydd mot ändring, klientangivna värden, femsiffriga löpnummer och sekvensbehörigheter. Frontendtester kontrollerar visningsreferens och oförändrat UUID för PDF- och arkiveringsanrop.
