export function applyTemplates(html){
  html=html.replace('<img class="logo" src="idv-mark.png" alt="Idrottsveteranerna">','');
  html=html.replace('<button class="restart" id="restart" type="button">Avbryt<br>och börja om</button>','<button class="restart" id="restart" type="button">Avbryt</button>');

  const uploadStart=html.indexOf('<section class="screen active" id="upload">');
  const uploadEnd=html.indexOf('</section>',uploadStart)+10;
  const upload=`<section class="screen active" id="upload">
<div class="step">Steg 1 av 5 — Ladda upp kvitton</div>
<h1>Lägg till dina kvitton</h1>
<p class="subtitle">Lägg till ett eller flera kvitton. På dator kan du dra dem direkt till rutan nedan.</p>
<div id="uploadError" aria-live="polite"></div>
<input type="file" id="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.avif,image/*,application/pdf" multiple>
<input type="file" id="cameraFile" accept="image/*" capture="environment">
<div class="dropzone" id="dropzone" role="button" tabindex="0" aria-label="Dra och släpp kvittofiler här eller välj filer"><strong>Dra och släpp kvittofiler här</strong><span>eller välj ett av alternativen nedan</span><span class="formats">PDF · JPG/JPEG · PNG · HEIC/HEIF · WebP · AVIF &nbsp;•&nbsp; Högst 10 MB per fil</span></div>
<div class="upload-actions"><button class="btn" id="camera" type="button">📷 Ta foto</button><button class="btn secondary" id="add" type="button">📁 Välj filer</button></div>
<div class="file-status" id="fileStatus"><span class="count" id="fileCount">0</span><span id="fileStatusText">Inga filer tillagda ännu</span></div>
<div class="thumbs" id="thumbs"></div>
<div class="info steps-help"><strong>Så här går det till</strong><ol><li>Lägg till ett eller flera kvitton.</li><li>Dölj eventuella känsliga uppgifter.</li><li>Fyll i namn, belopp och övrig information.</li><li>Kontrollera kvittona och sammanställningen.</li><li>Skicka in.</li></ol></div>
<div class="trust-note">🛡 Dina uppgifter hanteras tryggt och används endast för detta ärende.</div>
<div class="bar"><button class="btn secondary" id="continue" disabled>Fortsätt →</button></div>
</section>`;
  if(uploadStart>-1) html=html.slice(0,uploadStart)+upload+html.slice(uploadEnd);

  const maskStart=html.indexOf('<section class="screen" id="mask">');
  const maskEnd=html.indexOf('</section>',maskStart)+10;
  if(maskStart>-1){
    let mask=html.slice(maskStart,maskEnd)
      .replace('<h1 id="maskTitle">Täck över det som inte ska synas</h1>','<h1 id="maskTitle">Dölj känsliga uppgifter</h1>')
      .replace('<p class="subtitle" id="maskSubtitle">Kontrollera bilden. Dölj bara sådant som inte ska följa med.</p>','<p class="subtitle" id="maskSubtitle">Slå på markering när du vill täcka över något. Stäng av den för att scrolla fritt över sidan och kvittot.</p>')
      .replace('<div class="info" id="maskInstructions"><strong>Gör så här:</strong><br>Dra fingret över exempelvis personnummer, kontonummer eller kortnummer.<br><br>Om inget behöver döljas kan du gå vidare direkt.</div>','<div class="info" id="maskInstructions"><strong>Kontrollera kvittot.</strong><br>Se att hela kvittot syns och att texten är tillräckligt läsbar.</div>');
    html=html.slice(0,maskStart)+mask+html.slice(maskEnd);
  }

  const doneStart=html.indexOf('<section class="screen" id="done">');
  const doneEnd=html.indexOf('</section>',doneStart)+10;
  if(doneStart>-1){
    const done=`<section class="screen" id="done"><div class="done-panel"><div class="done-kicker">Idrottsveteranerna</div><h1>Tack! Vi har tagit emot ditt kvitto.</h1><p class="done-message">Tack för att du skickade in ditt underlag till IDV. Ditt kvitto är mottaget och kommer att hanteras vidare enligt vår ersättningsrutin.</p><div class="payout-note"><strong>Om utbetalningen</strong><span>Information om handläggningstid, utbetalningssätt och vilka bankuppgifter som behövs kommer att uppdateras här när IDV:s rutin är fastställd.</span></div><p class="done-question">Vill du skicka in fler kvitton?</p><button class="btn" id="restartDone" type="button">Skicka in ett till kvitto</button><span id="doneText" hidden></span></div></section>`;
    html=html.slice(0,doneStart)+done+html.slice(doneEnd);
  }
  return html;
}
