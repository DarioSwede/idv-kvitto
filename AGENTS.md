# IDV Kvitto – arbetssätt för Codex

## Arbetsflöde

Dela större uppgifter i små, självständiga ändringar:

1. Kartlägg först nuläge, branch, remote och berörda filer.
2. Ändra bara filer som hör till den aktuella uppgiften.
3. Kör fokuserade kontroller efter varje ändring.
4. Kör hela Playwright-sviten innan commit.
5. Commit och PR ska beskriva en sammanhållen ändring.
6. Merge och publicering kräver uttryckligt godkännande.

## Kommandon

```sh
# Snabba kontroller
node --check js/bank-account.js
git diff --check

# Hela användarflödet
npm test
```

Playwright körs på port `43921` för att inte återanvända en annan lokal förhandsvisning.

## Kontext och kvot

- Håll en uppgift till en tydlig ändring; starta en ny Codex-chatt när området byts.
- Undvik att skicka samma skärmbilder eller stora filer flera gånger.
- Använd låg/normal resonans för enkla UI- och textändringar och högre resonans för arkitektur, säkerhet och komplex felsökning.
- Kontrollera `/status` eller Usage Dashboard före en lång körning.
- Be om plan först vid större arbete, därefter implementation och verifiering i separata steg.

## Säkerhetsgränser

- Skicka aldrig hemligheter, service keys eller riktiga bankuppgifter i chatt, tester eller commits.
- Ändra inte `main`, mergea inte och publicera inte utan användarens uttryckliga godkännande.
- Rapportera alltid lokalt verifierat, pushat, mergeat och live som separata tillstånd.
- Lämna inte testfiler, `node_modules` eller `test-results` i commits.

## Smart och modulärt byggande

- Dela funktioner i små moduler med ett tydligt ansvar och stabila gränssnitt.
- Håll UI, ren affärslogik, nätverksanrop och lagring separerade när det är praktiskt.
- Återanvänd befintliga komponenter och hjälpfunktioner innan ny kod skapas.
- Versionshantera varje sammanhållen förändring med små, begripliga commits och tydliga versionsnummer eller changelog när användarbeteendet ändras.
- Gör förändringar reversibla och undvik stora blandade refaktorer utan egen testning.
