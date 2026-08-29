export function applyTemplates(html){
  html=html.replace('<img class="logo" src="idv-mark.png" alt="Idrottsveteranerna">','');
  html=html.replace('<button class="restart" id="restart" type="button">Avbryt<br>och börja om</button>','');

  const timelineStart=html.indexOf('<div class="timeline" aria-label="Steg i formuläret">');
  const timelineEnd=html.indexOf('</div>',timelineStart)+6;
  const timeline=`<div class="timeline" aria-label="Steg i formuläret">
<button class="seg active" type="button" data-step="0">1. Kvitton</button>
<button class="seg" type="button" data-step="1" disabled>2. Uppgifter</button>
<button class="seg" type="button" data-step="2" disabled>3. Kontrollera</button>
</div>`;
  if(timelineStart>-1)html=html.slice(0,timelineStart)+timeline+html.slice(timelineEnd);

  const uploadStart=html.indexOf('<section class="screen active" id="upload">');
  const uploadEnd=html.indexOf('</section>',uploadStart)+10;
  const upload=`<section class="screen active" id="upload">
<div class="step">Steg 1 av 3 — Kvitton</div>
<h1>Lägg till och kontrollera kvitton</h1>
<p class="subtitle">Lägg till ett eller flera kvitton. De visas direkt här på sidan.</p>
<div id="uploadError" aria-live="polite"></div>
<input type="file" id="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.avif,image/*,application/pdf" multiple>
<div class="dropzone" id="dropzone" role="button" tabindex="0" aria-label="Dra och släpp kvittofiler här eller välj filer"><strong>Dra och släpp kvittofiler här</strong><span>eller använd knappen nedan</span><span class="formats">PDF · JPG/JPEG · PNG · HEIC/HEIF · WebP · AVIF &nbsp;•&nbsp; Högst 10 MB per fil</span></div>
<div class="upload-actions"><button class="btn" id="add" type="button" style="grid-column:1/-1"><span id="addLabel">📷 Ta foto / välj filer</span><span id="fileCountBadge" hidden style="display:none;margin-left:.55rem;min-width:1.75rem;height:1.75rem;padding:0 .45rem;border-radius:999px;background:rgba(255,255,255,.22);align-items:center;justify-content:center;font-size:.82rem;vertical-align:middle">0</span></button></div>
<p class="file-picker-note">På Mac öppnas den mapp du använde senast. Välj <strong>Bilder</strong> eller <strong>Hämtade filer</strong> i vänsterkanten om du hamnar fel.</p>
<div class="receipts-panel" id="uploadThumbHome"><h2 id="receiptListTitle" hidden>Dina kvitton</h2><p id="receiptListHelp" hidden>Ändra namn eller belopp direkt. Tryck på bilden för att kontrollera eller maskera kvittot.</p><div class="thumbs" id="thumbs"></div></div>
<div class="info steps-help"><strong>Så här går det till</strong><ol><li>Lägg till och kontrollera alla kvitton här.</li><li>Fyll i dina uppgifter.</li><li>Kontrollera sammanställningen och skicka in.</li></ol></div>
<div class="trust-note">🛡 Dina uppgifter hanteras tryggt och används endast för detta ärende.</div>
<div class="bar receipt-actions"><button class="btn secondary" id="restart" type="button">Avbryt</button><button class="btn" id="continue" disabled>Nästa: dina uppgifter</button></div>
</section>`;
  if(uploadStart>-1) html=html.slice(0,uploadStart)+upload+html.slice(uploadEnd);

  const maskStart=html.indexOf('<section class="screen" id="mask">');
  const maskEnd=html.indexOf('</section>',maskStart)+10;
  const mask=`<section id="mask" hidden aria-hidden="true">
<h1 id="maskTitle">Intern kvittohantering</h1>
<p id="maskSubtitle"></p><div id="maskInstructions"></div><div id="maskReceiptList"></div>
<div id="pdfMaskReview" hidden></div>
<div id="maskEditorStorage" hidden>
  <div class="canvaswrap" id="maskCanvasWrap"><canvas id="canvas"></canvas></div>
  <div class="toolbar" id="maskToolbar"><button id="undo" type="button">↩ Ta bort senaste markeringen</button><button id="clear" type="button">Ta bort alla markeringar</button></div>
</div>
<button id="next" type="button" hidden>Fortsätt</button>
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
  const stateReplacement="let photos=[],idx=0,drawing=false,start=null,current=null,processing=0,maxReached=0;const screens=['upload','form','preview'];window.__idvReceiptState={get photos(){return photos},get idx(){return idx},set idx(value){idx=value},show:id=>show(id),render:()=>render(),load:()=>load(),draw:()=>draw(),openReceipt:p=>openReceipt(p),closeLightbox:()=>closeLightbox()};";
  html=html.replace(stateNeedle,stateReplacement);

  const goToStepStart=html.indexOf('function goToStep(n){');
  const goToStepEnd=html.indexOf("document.querySelectorAll('.seg')",goToStepStart);
  if(goToStepStart>-1&&goToStepEnd>-1){
    html=html.slice(0,goToStepStart)+"function goToStep(n){if(n>maxReached)return;show(screens[n]||'upload')}\n"+html.slice(goToStepEnd);
  }

  html=html.replace('<div class="step">Steg 3 av 5 — Fyll i uppgifter</div>','<div class="step">Steg 2 av 3 — Dina uppgifter</div>');
  html=html.replace('<div class="step">Steg 5 av 5 — Kontrollera och skicka</div>','<div class="step">Steg 3 av 3 — Kontrollera och skicka</div>');
  html=html.replace('Nästa: kontrollera kvittona','Nästa: kontrollera och skicka');

  const doneStart=html.indexOf('<section class="screen" id="done">');
  const doneEnd=html.indexOf('</section>',doneStart)+10;
  if(doneStart>-1){
    const done=`<section class="screen" id="done"><div class="done-panel"><div class="done-kicker">Idrottsveteranerna</div><h1>Tack! Vi har tagit emot ditt kvitto.</h1><p class="done-message">Tack för att du skickade in ditt underlag till IDV. Ditt kvitto är mottaget och kommer att hanteras vidare enligt vår ersättningsrutin.</p><div class="payout-note"><strong>Om utbetalningen</strong><span>Information om handläggningstid, utbetalningssätt och vilka bankuppgifter som behövs kommer att uppdateras här när IDV:s rutin är fastställd.</span></div><p class="done-question">Vill du skicka in fler kvitton?</p><button class="btn" id="restartDone" type="button">Skicka in ett till kvitto</button><span id="doneText" hidden></span></div></section>`;
    html=html.slice(0,doneStart)+done+html.slice(doneEnd);
  }
  return html;
}
