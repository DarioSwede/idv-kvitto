# Starta om projektet

## Rekommenderad start på Mac

Dubbelklicka på `Starta admin.command`. Skriptet:

1. går till projektmappen,
2. startar kontrollcentret på port `43920`,
3. startar admin-/förhandsvisningsservern på port `43922`,
4. öppnar `http://localhost:43922/admin.html`.

Om macOS blockerar skriptet första gången: högerklicka på filen, välj **Öppna** och bekräfta.

## Manuell start

```sh
cd "/Users/torbjornzimmerman/Documents/Codex/2026-08-26/referenced-chatgpt-conversation-this-is-an/work/idv-kvitto-live"
npm install
npm run control-center
```

Öppna sedan kontrollcentret på `http://localhost:43920/control-center.html` och starta förhandsvisningen därifrån. Adminvyn finns på `http://localhost:43922/admin.html`.

## Sparad konfiguration

- Projektets sökväg och portar finns i `Starta admin.command`.
- Supabase URL, anon/public key och admin-e-post sparas av adminvyn i webbläsarens localStorage efter anslutning.
- Aktiv inloggningssession sparas bara tillfälligt i sessionStorage. Efter omstart eller utgången session behöver lösenordet anges igen.
- Lösenord, service role keys och andra hemligheter ska inte sparas i projektfiler, dokumentation eller Git.
- Versionskällan är `version.json`; kör `npm run version:show` för att kontrollera aktuell version.

## Om något inte startar

```sh
lsof -nP -iTCP:43920 -sTCP:LISTEN
lsof -nP -iTCP:43922 -sTCP:LISTEN
cat /tmp/idv-kvitto-control-center.log
```

Stoppa en gammal kontrollcenterprocess genom att stänga dess terminalfönster. Starta därefter `Starta admin.command` igen.

## Modulgränser

- `admin.html`: adminlayout, vyväxling, filter och admininteraktioner.
- `scripts/control-center-server.mjs`: lokalt kontrollcenter, testkörning och previewserver.
- `control-center.html`: kontrollcentrets gränssnitt.
- `js/`: publik webbapps funktioner, uppdelade efter ansvar.
- `styles/`: publik webbapps visuella lager.
- `version.json`, `scripts/version.mjs`, `CHANGELOG.md`: versionering.
- `tests/`: automatiserade tester.

Börja med den minsta berörda modulen. Ändra inte server-, publik app- och adminlogik i samma ändring om det inte behövs.
