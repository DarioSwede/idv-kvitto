# IDV Kvitto

Mobilanpassat webbformulär för att skicka kvitton till Idrottsveteranerna. Den publika sidan körs som en statisk webbapp och använder Supabase Edge Function för inskick.

## Struktur

- `index.html` – startpunkt. Läser `version.json` och startar appen.
- `app-base.html` – funktionell kärna och grundmarkup.
- `js/` – UI, validering, OCR och hjälpfunktioner.
- `styles/` – visuella lager och kontrastjusteringar.
- `supabase/` – backendfunktion för kvittoinskick.
- `version.json` – enda källan för aktuell versions- och buildinformation.
- `CHANGELOG.md` – versionshistorik.
- `privacy.html` – information om personuppgiftshantering.
- `tests/` – webbläsarbaserade smoke-/flödestester.
- `admin.html` – lokal kvittoadministration med översikts- och kompaktvy.
- `scripts/control-center-server.mjs` – lokalt kontrollcenter på port 43920 och previewserver på port 43922.
- `docs/admin-ui.md` och `docs/restart.md` – adminens funktioner och återstart efter omstart/strömavbrott.

## Versionering

Versionen följer formatet `ÅÅÅÅ.MM.DD.REVISION`, exempelvis `2026.08.31.2`.

Vid en ny version:

1. Höj `version` och `build` i `version.json`.
2. Lägg till motsvarande rubrik överst i `CHANGELOG.md`.
3. Skapa PR och låt `quality` gå igenom.
4. Efter merge till `main`, kör GitHub Actions-workflow **Create release**. Den skapar taggen `v<version>` och en GitHub Release från aktuell `main`.

`build` används automatiskt för cache-busting av JavaScript, CSS och `app-base.html`, så en ny version når även webbläsare som har äldre filer cachade.

## Kvalitetskontroller

`.github/workflows/quality.yml` kör bland annat:

- JavaScript-syntaxkontroll.
- OCR-beloppstester.
- plattforms- och uppladdningslogik.
- kontaktvalidering.
- kontroll att `version.json` och `CHANGELOG.md` är synkroniserade.
- Playwright-smoketest i Chromium av den faktiska webbappen.
- `git diff --check` på pull requests.

Lokalt kan E2E-testet köras med:

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

## Lokal adminstart

Dubbelklicka på `Starta admin.command` på Mac. Den startar kontrollcentret, startar previewservern och öppnar `http://localhost:43922/admin.html`. Fullständig återstartsdokumentation finns i `docs/restart.md`.

Adminvyn hålls modulär i `admin.html`; serverstart och lokal test-API ligger i `scripts/control-center-server.mjs`. Ändra i första hand bara den modul som äger beteendet.

## Publicering

`main` är produktionsgren. GitHub Pages publicerar den statiska sidan från repot. Ändringar ska normalt gå via pull request så att den obligatoriska `quality`-kontrollen körs före merge.

## Återställning

Om en publicerad version får problem:

1. Identifiera senaste fungerande tagg/release, till exempel `v2026.08.31.1`.
2. Revertera den felaktiga merge-commiten i en ny PR eller återställ de berörda filerna från den fungerande taggen.
3. Höj versionsnumret igen; återanvänd inte ett redan publicerat versionsnummer.
4. Låt `quality` gå igenom och publicera en ny release.

## Integritet och säkerhet

Kvitton och kontaktuppgifter ska bara användas för att hantera det aktuella ersättningsärendet. Den publika sidan länkar till `privacy.html` för tydlig information till användaren. Kommunikation sker över HTTPS/TLS.

### E-poststatus i kontrollcentret

Öppna kontrollcentret på `http://localhost:43920`, välj **Hantera testläge** och logga in i IDV-projektet med ditt personalkonto. Välj **Till kontrollcentret** i samma flik. Sessionen lagras endast i flikens befintliga `sessionStorage`; en inloggning på previewport 43922 delas inte med kontrollcentret. Vid utgången session behöver du logga in igen.

Webbläsaren hämtar `/api/email-status` på sin egen adress. Den lokala servern vidarebefordrar användarens Bearer-token och publika API-nyckel till den fasta admin-routen `GET admin-api/email-status`, som använder `requireStaff`. Resend- och service-nycklar stannar i backend. Routen är skrivskyddad, har timeout och accepterar inte andra mål eller omdirigeringar. `submit-receipt` får inga nya CORS-undantag eller lättnader i autentisering.

Backendändringen i `admin-api` måste publiceras separat innan statusrouten kan användas mot drift. PR:n innebär ingen publicering. Saknad route visas som ett uttryckligt fel. Status visar konfiguration, inte bevis på levererad e-post. En framtida testmail-route ska använda samma personalautentisering, separat POST med admin/tester-behörighet och uttryckligt vald testmottagare; denna ändring skickar ingen e-post.
