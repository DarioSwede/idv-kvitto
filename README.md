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
