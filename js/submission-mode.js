export const SUBMISSION_MODES=new Set(['receipts','travel','combined']);

const MODE_LABELS={receipts:'Endast kvitton för utlägg',travel:'Endast reseersättning',combined:'Kvitton + reseersättning'};
const STEP_LABELS={receipts:'Kvitton',travel:'Fyll i reseersättningen',combined:'Kvitton + reseersättning'};

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
  const contactFields=document.querySelector('#form .contact-grid');
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
  style.textContent=`.submission-mode-card{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;border:0;background:transparent;padding:0;margin:14px 0}.submission-mode-card legend{grid-column:1/-1;font-weight:800;padding:0;margin:0 0 2px}.submission-mode-card label{position:relative;display:flex;align-items:center;justify-content:center;min-height:76px;border:1px solid var(--line);border-radius:12px;padding:11px 9px;margin:0;background:#fff;cursor:pointer;text-align:center;transition:.18s ease}.submission-mode-card label:hover,.submission-mode-card label:has(input:focus-visible){border-color:var(--action);background:#f5faf6;box-shadow:0 8px 22px rgba(45,106,79,.11);outline:3px solid rgba(45,106,79,.13);outline-offset:0}.submission-mode-card input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}.submission-mode-card span{display:grid;gap:4px;pointer-events:none}.submission-mode-card small{font-weight:400;color:var(--muted);line-height:1.3}.submission-mode-card label:has(input:checked){border-color:var(--action);background:var(--action-soft);box-shadow:inset 0 0 0 2px var(--action)}.submission-mode-card label:has(input:focus-visible){outline:3px solid rgba(23,107,74,.2);outline-offset:2px}.timeline .seg[hidden],.travel-only-form[hidden]{display:none!important}body[data-submission-mode="travel"] .timeline{grid-template-columns:repeat(2,minmax(0,1fr))}body[data-submission-mode="travel"] .timeline::before{left:25%;right:25%}.travel-only-form{display:grid;gap:12px;margin:18px 0}.travel-only-section{padding:15px 16px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.92);box-shadow:0 4px 14px rgba(26,46,42,.05)}.travel-only-section h2{margin:0 0 12px;font-size:1rem}.travel-only-section .contact-grid,.travel-only-section .bank-account-card,.travel-only-section .travel-card{margin:0}.travel-only-section .bank-account-card{padding:0;border:0;box-shadow:none}.travel-only-section #event{margin-bottom:10px}@media(max-width:560px){.submission-mode-card{grid-template-columns:1fr}.submission-mode-card label{min-height:0;justify-content:flex-start;text-align:left}.travel-only-section{padding:13px}}`;
  document.head.append(style);

  const radios=[...chooser.querySelectorAll('input[name="submissionMode"]')];
  const travelOnlyForm=document.createElement('div');
  travelOnlyForm.className='travel-only-form';
  travelOnlyForm.hidden=true;
  travelOnlyForm.innerHTML='<section class="travel-only-section"><h2>Dina uppgifter</h2><div data-travel-slot="contact"></div></section><section class="travel-only-section"><h2>Resan</h2><div data-travel-slot="journey"></div></section><section class="travel-only-section"><h2>Konto för utbetalning</h2><div data-travel-slot="bank"></div></section>';
  upload.insertBefore(travelOnlyForm,receiptActions||null);
  const contactSlot=travelOnlyForm.querySelector('[data-travel-slot="contact"]');
  const journeySlot=travelOnlyForm.querySelector('[data-travel-slot="journey"]');
  const bankSlot=travelOnlyForm.querySelector('[data-travel-slot="bank"]');
  const travelParent=travelCard?.parentElement;
  const travelAnchor=travelCard?.nextSibling;
  const eventParent=eventField?.parentElement;
  const eventAnchor=eventField?.nextSibling;
  const bankParent=bankCard?.parentElement;
  const contactParent=contactFields?.parentElement;
  const receiptDetailsForm=document.createElement('div');
  receiptDetailsForm.className='receipt-details-form travel-only-form';
  receiptDetailsForm.hidden=true;
  receiptDetailsForm.innerHTML='<section class="travel-only-section"><h2>Dina uppgifter</h2><div data-receipt-slot="contact"></div></section><section class="travel-only-section"><h2>Kort beskrivning</h2><div data-receipt-slot="event"></div></section><section class="travel-only-section"><h2>Konto för utbetalning</h2><div data-receipt-slot="bank"></div></section>';
  contactParent?.insertBefore(receiptDetailsForm,contactFields);
  const receiptContactSlot=receiptDetailsForm.querySelector('[data-receipt-slot="contact"]');
  const receiptEventSlot=receiptDetailsForm.querySelector('[data-receipt-slot="event"]');
  const receiptBankSlot=receiptDetailsForm.querySelector('[data-receipt-slot="bank"]');
  const baseCanLeaveReceipts=window.__idvCanLeaveReceipts||(()=>false);
  const getMode=()=>radios.find(r=>r.checked)?.value||null;
  const hasReceipts=()=>Boolean(window.__idvReceiptState?.photos?.length);
  let travelApproved=false;
  function syncTravelDependentFields(){
    const travelOnly=getMode()==='travel';
    if(otherField&&travelOnly)otherField.hidden=true;
    if(bankCard&&travelOnly)bankCard.hidden=false;
  }
  const restoreFormFields=()=>{
    if(travelCard&&travelParent)travelParent.insertBefore(travelCard,travelAnchor);
    if(eventField&&eventParent)eventParent.insertBefore(eventField,eventAnchor);
    if(bankCard&&bankParent)bankParent.insertBefore(bankCard,eventField||eventAnchor);
    if(contactFields&&contactParent)contactParent.insertBefore(contactFields,bankCard||eventField||eventAnchor);
  };
  const fieldsPlacedFor=mode=>{
    if(mode==='travel')return contactFields?.parentElement===contactSlot&&eventField?.parentElement===journeySlot&&travelCard?.parentElement===journeySlot&&bankCard?.parentElement===bankSlot;
    if(mode==='combined'&&document.getElementById('form')?.classList.contains('active'))return eventField?.parentElement===eventParent&&travelCard?.parentElement===travelParent;
    if(mode==='combined')return eventField?.parentElement===upload&&travelCard?.parentElement===upload&&contactFields?.parentElement===contactParent&&bankCard?.parentElement===bankParent;
    if(mode==='receipts')return contactFields?.parentElement===receiptContactSlot&&eventField?.parentElement===receiptEventSlot&&bankCard?.parentElement===receiptBankSlot;
    return eventField?.parentElement===eventParent&&travelCard?.parentElement===travelParent&&contactFields?.parentElement===contactParent&&bankCard?.parentElement===bankParent;
  };
  const restoreTravelCard=()=>{
    restoreFormFields();
    if(getMode()==='combined'&&contactFields){
      if(eventField)contactFields.before(eventField);
      if(travelCard)contactFields.before(travelCard);
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
    const travelOnly=mode==='travel';
    const segments=[...document.querySelectorAll('.timeline .seg')];
    const stepLabels=[...document.querySelectorAll('.timeline .seg-label')];
    if(stepLabels[0])stepLabels[0].textContent=STEP_LABELS[mode]||STEP_LABELS.receipts;
    if(stepLabels[1])stepLabels[1].textContent='Dina uppgifter';
    if(stepLabels[2])stepLabels[2].textContent='Kontroll & skicka';
    if(segments[1])segments[1].hidden=travelOnly;
    if(segments[0])segments[0].title=travelOnly?'Fyll i reseersättningen':'Gå till kvitton';
    const finalStepIndex=segments[2]?.querySelector('.seg-index');
    if(finalStepIndex)finalStepIndex.textContent=travelOnly?'2':'3';
    const receiptsPresent=hasReceipts();
    const needsReceipts=mode!=='travel';
    const needsTravel=mode!=='receipts';
    travelOnlyForm.hidden=!travelOnly;
    receiptDetailsForm.hidden=mode!=='receipts';
    if(!fieldsPlacedFor(mode)){
      restoreFormFields();
      if(travelOnly){
        if(contactFields&&contactSlot)contactSlot.append(contactFields);
        if(eventField&&journeySlot)journeySlot.append(eventField);
        if(travelCard&&journeySlot)journeySlot.append(travelCard);
        if(bankCard&&bankSlot)bankSlot.append(bankCard);
      }else if(needsTravel&&travelCard){
        upload.insertBefore(travelCard,receiptActions||null);
        if(eventField)upload.insertBefore(eventField,travelCard);
      }else if(mode==='receipts'){
        if(contactFields&&receiptContactSlot)receiptContactSlot.append(contactFields);
        if(eventField&&receiptEventSlot)receiptEventSlot.append(eventField);
        if(bankCard&&receiptBankSlot)receiptBankSlot.append(bankCard);
      }
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
    const contactValid=!travelOnly||Boolean(window.__idvCanLeaveContact?.());
    const canContinue=receiptsValid&&travelValid&&contactValid;
    continueBtn.hidden=false;
    continueBtn.style.display='';
    continueBtn.disabled=!canContinue;
    continueBtn.textContent=travelOnly?'Nästa: kontrollera och skicka':'Nästa: dina uppgifter';
    continueBtn.title=canContinue?'':travelOnly?'Fyll i dina uppgifter, resan och ett giltigt konto samt godkänn uträkningen.':needsTravel?'Beskriv kort vad resan avsåg och godkänn reseersättningen.':'Lägg till minst ett kvitto och fyll i belopp på alla kvitton';
    if(subtitle)subtitle.textContent=mode==='travel'?'Fyll i uppgifterna och godkänn reseersättningen innan du går vidare.':mode==='combined'?'Lägg till kvitton och ange sedan reseersättningen.':'Lägg till kvitton och fyll i belopp innan du går vidare.';
    const uploadTitle=document.querySelector('#upload h1');
    const formTitle=document.querySelector('#form h1');
    const travelKmLabelText=document.getElementById('travelKmLabelText');
    if(travelKmLabelText)travelKmLabelText.textContent=mode==='travel'?'Ange antal kilometer':'Antal kilometer';
    if(uploadTitle)uploadTitle.textContent=mode==='travel'?'Reseersättning':mode==='combined'?'Kvitton och reseersättning':'Lägg till kvitton';
    if(formTitle)formTitle.textContent=mode==='travel'?'Fyll i reseersättningen':'Vem gäller kvittot?';
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
  window.__idvSyncSubmissionMode=sync;

  radios.forEach(radio=>radio.addEventListener('change',()=>{
    travelApproved=false;
    sync();
  }));
  eventField?.addEventListener('input',sync);
  contactFields?.querySelectorAll('input').forEach(input=>input.addEventListener('input',sync));
  document.addEventListener('bank-account-change',sync);
  document.addEventListener('travel-state-change',event=>{
    travelApproved=Boolean(event.detail?.approved);
    sync();
  });
  document.getElementById('thumbs')?.addEventListener('input',sync);
  const thumbs=document.getElementById('thumbs');
  if(thumbs)new MutationObserver(sync).observe(thumbs,{childList:true});
  if(summary)new MutationObserver(decorateSummary).observe(summary,{childList:true,subtree:true});
  document.getElementById('previewBtn')?.addEventListener('click',()=>setTimeout(decorateSummary,0));
  sync();
}
