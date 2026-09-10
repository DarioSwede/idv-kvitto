# Adminvyn

## Start

Adminvyn finns i `admin.html` och kan visas via den lokala servern på `http://localhost:43922/admin.html`.

## Layout

- Headern visar `idv-mark.png`, **Kvittoadministration** och aktuell version.
- Statusfiltren **Alla**, **Nya**, **Pågår**, **Klart** och **Arkiv** ligger centrerade i headern.
- **Översikt** är den stora standardvyn. Switchreglaget bredvid **Inkomna underlag** växlar till **Kompakt**, som visar tätare ärenderader.
- Markerat ärende får en diskret grön bakgrund i stället för en svart ram.
- Inkomstdatum och tid ligger uppe till vänster i varje kort.
- Avsändarens e-postadress är en `mailto:`-länk.
- Checkboxar och den tidigare statusbrickan i detaljhuvudet är borttagna.
- Knappar använder en gemensam upphöjd pill-stil; statusknapparna behåller färg per status.
- **Inställningar** öppnar en dropdown-panel. Den stängs genom att trycka på knappen igen eller med `Esc`.
- **Inkorg** visar alla ej arkiverade inkomna ärenden; den är en navigationsknapp, inte en åtgärd på ett enskilt underlag.
- Sammanställningen visar klientgenererat ärende-ID, clearingnummer och maskerat bankkonto samt en svag logotyp som vattenstämpel.
- Tema-switchens ljusa/mörka läge sparas lokalt i webbläsaren och återställs efter omladdning.
- Ärenden sorteras alltid med senaste inkomna först; samma tidsstämpel bryts stabilt med ärende-ID.

## Versionshantering

Versionskällan är `version.json` och historiken finns i `CHANGELOG.md`.

```sh
npm run version:show
npm run version:bump
```

`version:bump` ökar patch-versionen, skapar ett nytt build-id och lägger till en post i changeloggen. Kör det när en sammanhållen användarförändring är klar, och uppdatera vid behov versionstexten i `admin.html`.

## Fortsatt arbete

Ändra i första hand `admin.html` för adminlayouten. Håll anslutning och API-logik i samma fil tills den bryts ut med ett tydligt separat ansvar. Kör alltid:

```sh
npm run version:show
git diff --check
npm test
```

Skicka aldrig service keys eller riktiga lösenord till versionshantering eller dokumentation.
