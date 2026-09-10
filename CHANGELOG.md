# Versionshistorik

## 2026.09.10.1
- Samlar det nya modulära kvitto- och reseräkningsflödet i en verifierad releasekandidat.
- Lägger till den skyddade adminhanteringen, konfigurerbar leverans, arkivering och hastighetsbegränsning.
- Säkerställer att kombinationsläget kräver både giltigt kvitto och godkänd reseersättning.

## 2026.09.06.31
- Den lokala testinskickningen visar nu ett riktigt testunderlag som PDF i resultatlänken.

## 2026.09.06.30
- Lägger till opt-in lokal testinskickning som simulerar leverans till `betala@idrottsveteranerna.se`.

## 2026.09.06.29
- Tillåter lokal utvecklingsorigin i inskickningsfunktionens CORS-hantering.

## 2026.09.06.28
- Låser båda checkboxarna till exakt samma storlek.

## 2026.09.06.27
- Matchar textstorlek, typografi och intern layout för kopia- och bekräftelserutorna.

## 2026.09.06.26
- Kör OCR-jobb sekventiellt igen för att undvika att flera Tesseract-workers hänger samtidigt.
- Köade kvitton visar tydligt att de väntar på sin tur.

## 2026.09.06.25
- Gör OCR-jobb oberoende så ett hängande kvitto inte blockerar övriga kvitton.
- Avslutar varje OCR-worker vid timeout, fel eller färdig körning.

## 2026.09.06.24
- Visar tydligt när kvitton väntar i OCR-kön i stället för att se ut att ha hängt sig.

## 2026.09.06.23
- Byter plats på kopia-valet och bekräftelsen.
- Ger båda kontrollrutorna exakt samma visuella kortstil.

## 2026.09.06.22
- Gör bekräftelserutan dynamisk med samma gröna aktiva stil som kopia-valet.
- Uppdaterar kopia-sammanfattningen direkt när valet ändras.
- Centrerar bifogade kvitton i kontrollsteget.

## 2026.09.06.21
- Tillfällig mottagaradress är `mail@torbjornzimmerman.se`.

## 2026.09.06.20
- Flyttar kopia-valet till kontrollsteget och väljer kopia automatiskt från början.

## 2026.09.06.19
- Visar “Totalt kvitton” när endast kvitton har valts.
- Gör kopia-checkboxen valbar igen efter e-postkontrollen, även vid tillbaka-navigering.

## 2026.09.06.18
- Matchar namnfältets utseende med e-postfältet.
- Döljer “Tillfälle” och “Övrig information” i kvittots formulärsteg.

## 2026.09.06.17
- Håller knappen “Nästa” synkroniserad med godkännandet av reseersättningen.

## 2026.09.06.16
- Reseersättning kan gå vidare först efter att kilometerbeloppet har godkänts.
- Reseuppgifter och bankkonto aktiveras stegvis efter godkännandet.

## 2026.09.06.15
- Endast reseräkning visar en stegvis kedja: kilometer, godkännande, reseuppgifter och bankuppgifter.
- Kvittofältet för saknade namn eller belopp döljs i reseräkningsläget.

## 2026.09.06.14
- Flyttar kilometerhjälpen till fältets placeholder och visar beräkningen först efter inmatning.

## 2026.09.06.13
- Återinför stegindikatorn och anpassar första steget efter valt inskicksläge.
- Lägger samma hover-effekt på lägesknapparna som på kvittofältet.

## 2026.09.06.12
- Flyttar integritetslänken till säkerhetsfotnoten under informationen om krypterad överföring.

## 2026.09.06.11
- Tar bort den dubbla synliga resefrågan; reseersättning väljs endast i lägesväljaren.

## 2026.09.06.10
- Återställer lägesväljaren till första stegets tidigare logik med kvittoläge förvalt.
- Reseersättning visar kilometerfältet direkt när reseräkning eller kombination väljs.
- Samma kortlayout och typografi används för alla tre lägesval.

## 2026.09.06.9
- Informationsrutan använder samma storlek och placering som uppladdningsrutan för kvittofiler.

## 2026.09.06.8
- Informationsrutan försvinner när användaren väljer något av de tre inskickslägena.

## 2026.09.06.7
- Startsidan visar information om underlag, handläggningstid och bankuppgifter innan användaren väljer läge.

## 2026.09.06.6
- Startsidan visar endast frågan "Vad vill du göra?" och de tre lägesvalen.
- Kvittoformuläret visas först när användaren väljer "Endast kvitton för utlägg".

## 2026.09.06.5
- Namn och e-post visas kompakt på samma rad på större skärmar.
- Reseersättningen visar kilometer och beräkning tillsammans och tänder beskrivning samt godkännande stegvis.
- Den dubbla fordonsfrågan lämnas dold när reseersättning redan valts på första sidan.

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
