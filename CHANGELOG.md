# Versionshistorik

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
