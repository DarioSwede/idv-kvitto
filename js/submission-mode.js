export const SUBMISSION_MODES=new Set(['receipts','travel','combined']);

const MODE_LABELS={receipts:'Endast kvitton för utlägg',travel:'Endast reseräkning/kilometerersättning',combined:'Kvitton + kilometerersättning'};
const STEP_LABELS={receipts:'Kvitton',travel:'Reseersättning',combined:'Kvitton + resa'};

export function initSubmissionMode(){
  const upload=document.getElementById('upload');
  const subtitle=document.getElementById('uploadInstructions');
  const dropzone=document.getElementById('dropzone');
  const fileInput=document.getElementById('file');
  const receiptPanel=document.getElementById('uploadThumbHome');
  const continueBtn=document.getElementById('continue');
  const receiptActions=document.querySelector('#upload .receipt-actions');
  const travelCard=document.querySelector('.travel-card');
  const travelEnabled=document.getElementById('travelEnabled');
  const travelOption=document.querySelector('.travel-option');
  const addMore=document.querySelector('.missing-receipt');
  const summary=document.getElementById('summary');
  const bankCard=document.querySelector('.bank-account-card');
  const eventField=document.getElementById('event');
  const otherField=document.getElementById('other');
  if(!upload||!continueBtn)return;

  const chooser=document.createElement('fieldset');
  chooser.className='submission-mode-card';
  chooser.innerHTML=`<legend>Vad vill du göra?</legend>
    <label><input type="radio" name="submissionMode" value="receipts" checked><span><strong>Endast kvitton</strong><small>Ersättning för utlägg med ett eller flera kvitton.</small></span></label>
    <label><input type="radio" name="submissionMode" value="travel"><span><strong>Endast reseräkning</strong><small>Eget fordon, utan kvittofiler.</small></span></label>
    <label><input type="radio" name="submissionMode" value="combined"><span><strong>Kvitton + reseräkning</strong><small>Skicka båda delarna i samma underlag.</small></span></label>`;
  upload.insertBefore(chooser,subtitle||upload.firstChild);

  const style=document.createElement('style');
  style.textContent=`.submission-mode-card{border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px;margin:14px 0}.submission-mode-card legend{font-weight:800;padding:0 6px}.submission-mode-card label{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:12px;margin:8px 0;cursor:pointer;transition:.18s ease}.submission-mode-card label:hover,.submission-mode-card label:has(input:focus-visible){border-color:var(--action);background:#f5faf6;box-shadow:0 10px 30px rgba(45,106,79,.11);outline:3px solid rgba(45,106,79,.13);outline-offset:0}.submission-mode-card input{width:auto;margin:3px 0 0;accent-color:var(--action)}.submission-mode-card span{display:grid;gap:3px}.submission-mode-card small{font-weight:400;color:var(--muted);line-height:1.35}.submission-mode-card label:has(input:checked){border-color:var(--action);background:var(--action-soft);box-shadow:0 0 0 1px var(--action)}.submission-mode-card label:has(input:focus-visible){outline:3px solid rgba(23,107,74,.2);outline-offset:2px}`;
  document.head.append(style);

  const radios=[...chooser.querySelectorAll('input[name="submissionMode"]')];
  const travelParent=travelCard?.parentElement;
  const travelAnchor=travelCard?.nextSibling;
  const eventParent=eventField?.parentElement;
  const eventAnchor=eventField?.nextSibling;
  let travelCardRestored=false;
  const baseCanLeaveReceipts=window.__idvCanLeaveReceipts||(()=>false);
  const getMode=()=>radios.find(r=>r.checked)?.value||null;
  const hasReceipts=()=>Boolean(window.__idvReceiptState?.photos?.length);
  let travelApproved=false;
  function syncTravelDependentFields(){
    const travelOnly=getMode()==='travel';
    const reveal=travelOnly&&travelApproved;
    if(otherField&&travelOnly)otherField.hidden=true;
    if(bankCard&&travelOnly)bankCard.hidden=!reveal;
  }
  const restoreTravelCard=()=>{
    travelCardRestored=true;
    const contactFields=document.querySelector('#form .contact-grid');
    if(getMode()!=='receipts'&&contactFields){
      if(eventField)contactFields.before(eventField);
      if(travelCard)contactFields.before(travelCard);
    }else{
      if(eventField&&eventParent&&eventField.parentElement!==eventParent){
        eventParent.insertBefore(eventField,eventAnchor);
      }
      if(travelCard&&travelParent&&travelCard.parentElement!==travelParent){
        travelParent.insertBefore(travelCard,travelAnchor);
      }
    }
    if(travelEnabled){
      travelEnabled.checked=getMode()!=='receipts';
      travelEnabled.dispatchEvent(new Event('change',{bubbles:true}));
    }
  };
  window.__idvRestoreTravelCard=restoreTravelCard;

  function decorateSummary(){
    if(!summary||!summary.innerHTML)return;
    let row=summary.querySelector('.submission-mode-summary');
    if(!row){
      row=document.createElement('div');
      row.className='row submission-mode-summary';
      row.innerHTML='<span>Typ av underlag</span><b></b>';
      summary.prepend(row);
    }
    const value=row.querySelector('b');
    const label=MODE_LABELS[getMode()];
    if(value&&value.textContent!==label)value.textContent=label;
  }

  function sync(){
    const mode=getMode();
    const stepLabels=[...document.querySelectorAll('.timeline .seg-label')];
    if(stepLabels[0])stepLabels[0].textContent=STEP_LABELS[mode]||STEP_LABELS.receipts;
    if(stepLabels[1])stepLabels[1].textContent='Dina uppgifter';
    if(stepLabels[2])stepLabels[2].textContent='Kontroll & skicka';
    const receiptsPresent=hasReceipts();
    const needsReceipts=mode!=='travel';
    const needsTravel=mode!=='receipts';
    if(needsTravel&&!travelCardRestored&&travelCard&&travelCard.parentElement!==upload){
      upload.insertBefore(travelCard,receiptActions||null);
      if(eventField)upload.insertBefore(eventField,travelCard);
    }else if(!needsTravel){
      restoreTravelCard();
    }
    [dropzone,fileInput,receiptPanel].forEach(el=>{if(el)el.hidden=!needsReceipts});
    if(travelCard)travelCard.hidden=!needsTravel;
    document.getElementById('travelFields').hidden=!needsTravel;
    if(addMore)addMore.hidden=!needsReceipts;
    if(travelOption)travelOption.hidden=true;
    if(travelEnabled){
      travelEnabled.checked=needsTravel;
      travelEnabled.dispatchEvent(new Event('change',{bubbles:true}));
    }
    document.getElementById('travelFields').hidden=!needsTravel;
    const hasTravelPurpose=Boolean(eventField?.value.trim());
    const receiptsValid=!needsReceipts||baseCanLeaveReceipts();
    const travelValid=!needsTravel||(travelApproved&&hasTravelPurpose);
    const canContinue=receiptsValid&&travelValid;
    continueBtn.hidden=false;
    continueBtn.style.display='';
    continueBtn.disabled=!canContinue;
    continueBtn.textContent='Nästa: dina uppgifter';
    continueBtn.title=canContinue?'':needsTravel?'Beskriv kort vad resan avsåg och godkänn reseersättningen.':'Lägg till minst ett kvitto och fyll i belopp på alla kvitton';
    if(subtitle)subtitle.textContent=mode==='travel'?'Ange antalet kilometer och godkänn reseersättningen.':mode==='combined'?'Lägg till kvitton och ange sedan kilometerersättningen.':'Lägg till kvitton och fyll i belopp innan du går vidare.';
    const uploadTitle=document.querySelector('#upload h1');
    const formTitle=document.querySelector('#form h1');
    const travelKmLabelText=document.getElementById('travelKmLabelText');
    if(travelKmLabelText)travelKmLabelText.textContent=mode==='travel'?'Ange antal kilometer':'Antal kilometer';
    if(uploadTitle)uploadTitle.textContent=mode==='travel'?'Reseersättning':mode==='combined'?'Kvitton och reseräkning':'Lägg till kvitton';
    if(formTitle)formTitle.textContent=mode==='travel'?'Fyll i reseräkningen':'Vem gäller kvittot?';
    if(eventField){
      eventField.hidden=false;
      eventField.required=needsTravel;
      eventField.placeholder=needsTravel?'Tillfälle eller kort beskrivning av resan *':'Tillfälle (valfritt), t.ex. Fyradagarsmarschen 2026';
      eventField.setAttribute('aria-label',needsTravel?'Tillfälle eller kort beskrivning av resan':'Vilket tillfälle gäller det?');
    }
    if(otherField)otherField.hidden=mode==='travel';
    const centerContinue=mode==='receipts'&&!receiptsPresent;
    receiptActions?.classList.toggle('continue-centered',centerContinue);
    document.body.dataset.submissionMode=mode;
    document.body.dataset.hasReceipts=String(receiptsPresent);
    syncTravelDependentFields();
  }

  window.__idvSubmissionMode={
    getMode,
    needsReceipts:()=>getMode()!=='travel',
    needsTravel:()=>getMode()!=='receipts',
    canLeaveReceipts:()=>{
      const mode=getMode();
      const receiptsValid=mode==='travel'||baseCanLeaveReceipts();
      const travelValid=mode==='receipts'||(travelApproved&&Boolean(eventField?.value.trim()));
      return receiptsValid&&travelValid;
    },
    hasRequiredReceipts:()=>getMode()==='travel'||hasReceipts()
  };
  window.__idvCanLeaveReceipts=()=>window.__idvSubmissionMode.canLeaveReceipts();

  radios.forEach(radio=>radio.addEventListener('change',()=>{
    travelCardRestored=false;
    travelApproved=false;
    sync();
  }));
  eventField?.addEventListener('input',sync);
  document.addEventListener('travel-state-change',event=>{
    travelApproved=Boolean(event.detail?.approved);
    syncTravelDependentFields();
    if(getMode()==='travel'&&continueBtn){
      const canContinue=travelApproved&&Boolean(eventField?.value.trim());
      continueBtn.disabled=!canContinue;
      continueBtn.title=canContinue?'':'Beskriv kort vad resan avsåg och godkänn reseersättningen.';
    }
  });
  document.getElementById('thumbs')?.addEventListener('input',sync);
  const thumbs=document.getElementById('thumbs');
  if(thumbs)new MutationObserver(sync).observe(thumbs,{childList:true});
  if(summary)new MutationObserver(decorateSummary).observe(summary,{childList:true,subtree:true});
  document.getElementById('previewBtn')?.addEventListener('click',()=>setTimeout(decorateSummary,0));
  sync();
}
