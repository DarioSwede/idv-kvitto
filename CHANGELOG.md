# Versionshistorik

## 2026.09.06.5
- I läget Endast reseersättning döljs panelen för kvittonamn och kvittofiler.

## 2026.09.06.4
- Formaterade kontonummer normaliseras innan längdvalidering, så mellanslag och bindestreck inte kan kapa det inskickade numret.

## 2026.09.06.3
- Inskickaren anger clearing- och kontonummer för utbetalningen.
- Clearingnumret kontrolleras mot aktuella svenska clearingserier och kontonumret längdkontrolleras.
- Kontonumret visas maskerat i kontrollsteget och i avsändarens e-postkopia.
- Fullständiga kontouppgifter skickas endast till kvittohanteringen och lagras i den RLS-skyddade inskickstabellen.

## 2026.09.06.2
- OCR-förslag avrundas enligt vanlig standard till närmaste hela krona, till exempel 21,78 kr till 22 kr.
- Ett nytt OCR-förslag pulserar diskret tills användaren godkänner eller ändrar beloppet.

## 2026.09.06.1
- Ett tomt totalbelopp orsakar inte längre ett otydligt serverfel.
- Underlaget mejlas med sammanställning och färdig PDF till `kvitton@idrottsveteranerna.se`.
- Användaren kan välja en egen e-postkopia med exakt samma sammanställning och PDF.
- En PDF som inte kan läsas ger ett begripligt fel med filnamn och förslag på åtgärd.

## 2026.09.01.5
- "Nästa: dina uppgifter" ligger fullbredd och på samma plats i alla tre inskickslägen.
- Avbryt-knappen tas bort från första steget.
- Kvittolägen kräver fortfarande kvitto innan nästa steg kan öppnas, medan Endast reseräkning kan fortsätta utan kvitto.

## 2026.09.01.4
- Ensamma huvudknappar centreras även i övriga steg i flödet för ett mer konsekvent visuellt uttryck.
- När en sekundär knapp blir synlig återgår huvudknappen till ordinarie radlayout.

## 2026.09.01.3
- Toppmenyn får en mjukare, sammanhållen progressdesign med tydliga steg och bättre mobil läsbarhet.
- Knappen "Nästa: dina uppgifter" centreras när inget kvitto ännu lagts till i läget Endast kvitton.
- Knappen återgår till normal layout när ett kvitto läggs till eller när Endast reseräkning väljs.

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
