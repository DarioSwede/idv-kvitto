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
<div id="uploadThumbHome"><div class="thumbs" id="thumbs"></div></div>
<div class="info steps-help"><strong>Så här går det till</strong><ol><li>Lägg till ett eller flera kvitton.</li><li>Kontrollera miniatyrerna, namn och belopp. Öppna ett kvitto om du behöver inspektera eller maskera uppgifter.</li><li>Fyll i dina uppgifter och övrig information.</li><li>Kontrollera kvittona och sammanställningen.</li><li>Skicka in.</li></ol></div>
<div class="trust-note">🛡 Dina uppgifter hanteras tryggt och används endast för detta ärende.</div>
<div class="bar"><button class="btn secondary" id="continue" disabled>Fortsätt →</button></div>
</section>`;
  if(uploadStart>-1) html=html.slice(0,uploadStart)+upload+html.slice(uploadEnd);

  const maskStart=html.indexOf('<section class="screen" id="mask">');
  const maskEnd=html.indexOf('</section>',maskStart)+10;
  const mask=`<section class="screen" id="mask">
<div class="step">Steg 2 av 5 — Kontrollera kvitton</div>
<h1 id="maskTitle">Kontrollera kvittona</h1>
<p class="subtitle" id="maskSubtitle">Här kan du byta namn, ändra belopp och öppna varje kvitto för att kontrollera det.</p>
<div class="info" id="maskInstructions"><strong>Tryck på en miniatyr för att öppna kvittot.</strong><br>Om känsliga uppgifter syns kan du maskera dem inne i visningen.</div>
<div id="maskReceiptList" class="receipt-manager"></div>
<div id="pdfMaskReview" hidden></div>
<div id="maskEditorStorage" hidden>
  <div class="canvaswrap" id="maskCanvasWrap"><canvas id="canvas"></canvas></div>
  <div class="toolbar" id="maskToolbar"><button id="undo" type="button">↩ Ta bort senaste markeringen</button><button id="clear" type="button">Ta bort alla markeringar</button></div>
</div>
<button class="btn" id="next">Klar – gå vidare</button>
</section>`;
  if(maskStart>-1) html=html.slice(0,maskStart)+mask+html.slice(maskEnd);

  const oldLightbox='<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Förhandsvisning av kvitto">\n<button class="lightbox-close" id="lightboxClose" aria-label="Stäng förhandsvisning">✕</button>\n<img id="lightboxImage" alt="Förhandsvisning av kvitto"><div id="lightboxPdf" class="pdf-preview"></div>\n</div>';
  const lightbox=`<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Inspektera kvitto">
<button class="lightbox-close" id="lightboxClose" aria-label="Stäng förhandsvisning">✕</button>
<div class="inspector-panel">
  <div class="inspector-stage" id="inspectorStage"><img id="lightboxImage" alt="Förhandsvisning av kvitto"><div id="lightboxPdf" class="pdf-preview"></div><div id="inspectorCanvasHost"></div></div>
  <div class="inspector-tools" id="inspectorTools" hidden>
    <div class="mask-toggle-card"><div class="mask-toggle-copy"><strong>Maskera känsliga uppgifter</strong><span>Slå på markering och dra över det som ska döljas. Stäng av för att scrolla fritt.</span></div><label class="switch" aria-label="Slå på eller av maskering"><input id="maskModeToggle" type="checkbox"><span class="switch-track"></span></label></div>
    <div class="mask-status" id="maskModeStatus">Markering av – du kan scrolla fritt.</div>
    <div id="inspectorToolbarHost"></div>
  </div>
</div>
</div>`;
  html=html.replace(oldLightbox,lightbox);

  const stateNeedle="let photos=[],idx=0,drawing=false,start=null,current=null,processing=0,maxReached=0;const screens=['upload','mask','form','review','preview'];";
  const stateReplacement="let photos=[],idx=0,drawing=false,start=null,current=null,processing=0,maxReached=0;const screens=['upload','mask','form','review','preview'];window.__idvReceiptState={get photos(){return photos},get idx(){return idx},set idx(value){idx=value},show:id=>show(id),render:()=>render(),load:()=>load(),draw:()=>draw(),openReceipt:p=>openReceipt(p),closeLightbox:()=>closeLightbox()};";
  html=html.replace(stateNeedle,stateReplacement);

  const doneStart=html.indexOf('<section class="screen" id="done">');
  const doneEnd=html.indexOf('</section>',doneStart)+10;
  if(doneStart>-1){
    const done=`<section class="screen" id="done"><div class="done-panel"><div class="done-kicker">Idrottsveteranerna</div><h1>Tack! Vi har tagit emot ditt kvitto.</h1><p class="done-message">Tack för att du skickade in ditt underlag till IDV. Ditt kvitto är mottaget och kommer att hanteras vidare enligt vår ersättningsrutin.</p><div class="payout-note"><strong>Om utbetalningen</strong><span>Information om handläggningstid, utbetalningssätt och vilka bankuppgifter som behövs kommer att uppdateras här när IDV:s rutin är fastställd.</span></div><p class="done-question">Vill du skicka in fler kvitton?</p><button class="btn" id="restartDone" type="button">Skicka in ett till kvitto</button><span id="doneText" hidden></span></div></section>`;
    html=html.slice(0,doneStart)+done+html.slice(doneEnd);
  }
  return html;
}
