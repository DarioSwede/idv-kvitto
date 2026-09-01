# Versionshistorik

## 2026.09.01.2
- Inskick delas upp i tre tydliga lägen: endast kvitton, endast reseräkning eller båda.
- Endast reseräkning kan skickas utan kvittofiler, medan övriga lägen kräver kvitton.
- Frontend och backend validerar varje valt flöde separat och skickar `submission_mode` i underlaget.
- PDF och e-postsammanställning visar vilken typ av underlag som skickats in.
- Reseersättningen fortsätter använda 25 kr per mil, alltså 2,50 kr per kilometer.
- Den förenklade OCR-hanteringen behålls.

## 2026.09.01.1
- Reseersättningen höjs till 25 kr per mil, alltså 2,50 kr per kilometer.
- Servervalidering, PDF, e-post och tester använder samma beräkningsgrund.
- Grund för modulär adminbackend läggs till med separata moduler för autentisering, inställningar och inskick.
- Datamodellen förbereds för status Ny, Pågående och Klar, adminanteckning, handläggare och strukturerad reseinformation.
- Centrala framtida parametrar för bland annat milersättning, filgränser, OCR, mottagaradress och lagringstid läggs i en inställningstabell.

## 2026.08.31.3
- Valfri reseersättning för eget fordon kan anges med kilometer och resbeskrivning.
- Appen beräknar 2,40 kr per kilometer och kräver att användaren godkänner förslaget.
- Kvitton, reseersättning och total visas separat i slutkontroll, PDF och inskickad sammanställning.
- Integritetslänken ligger direkt under uppladdningsrutan och öppnas separat så uppladdade kvitton inte försvinner.

## 2026.08.31.2
- Integritetsinformation läggs till och länkas från formulärets sidfot.
- README med drift, versionering och återställning införs.
- Playwright-smoketest testar den faktiska webbappen och kritiska delar av kvittoflödet.
- Kvalitetskontrollen verifierar att `version.json` och `CHANGELOG.md` är synkroniserade.
- Manuell release-workflow skapar Git-tagg och GitHub Release från aktuell version.

## 2026.08.31.1
- Central versionsfil (`version.json`) införs.
- Sidan läser aktuell version automatiskt och använder build-id för cache-busting.
- Versionsnumret i sidfoten hämtas från versionsfilen.
- Mottagaradressen visas diskret i uppladdningsrutan och kopplas till den för skärmläsare.

## 2026.08.31
- Tydligare färger och högre kontrast.
- Versionsrad, "Byggd av Zimmerman" och copyright i sidfoten.
