export const SUBMISSION_MODES=new Set(['receipts','travel','combined']);

const MODE_LABELS={receipts:'Endast kvitton för utlägg',travel:'Endast milersättning',combined:'Kvitton + milersättning'};

export function initSubmissionMode(){
  const upload=document.getElementById('upload'),form=document.getElementById('form');
  const subtitle=document.getElementById('uploadInstructions'),dropzone=document.getElementById('dropzone');
  const fileInput=document.getElementById('file'),receiptPanel=document.getElementById('uploadThumbHome');
  const continueBtn=document.getElementById('continue'),receiptActions=document.querySelector('#upload .receipt-actions');
  const travelCard=document.querySelector('.travel-card'),travelEnabled=document.getElementById('travelEnabled');
  const eventField=document.getElementById('event'),otherField=document.getElementById('other');
  const addMore=document.querySelector('.missing-receipt'),summary=document.getElementById('summary');
  const bankCard=document.querySelector('.bank-account-card'),contactFields=document.querySelector('#form .contact-grid');
  const profileNext=document.getElementById('previewBtn');
  if(!upload||!form||!continueBtn||!profileNext)return;

  const style=document.createElement('style');
  style.textContent=`.timeline{grid-template-columns:repeat(3,minmax(0,1fr))}.timeline::before{left:16.66%;right:16.66%}.compensation-picker{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;border:0;padding:0;margin:16px 0}.compensation-picker legend{grid-column:1/-1;font-weight:900;padding:0;margin:0 0 3px}.compensation-picker label{position:relative;display:flex;align-items:center;min-height:82px;border:2px solid var(--line);border-radius:14px;padding:13px;background:#fff;cursor:pointer;transition:.18s ease}.compensation-picker input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}.compensation-picker span{display:grid;gap:4px;pointer-events:none}.compensation-picker strong{font-size:1.02rem}.compensation-picker small{color:var(--muted);font-weight:400;line-height:1.3}.compensation-picker label:has(input:checked){border-color:var(--action);background:var(--action-soft);box-shadow:inset 0 0 0 1px var(--action)}.compensation-picker label:has(input:checked) strong::before{content:'✓ ';color:var(--action)}.compensation-picker label:hover,.compensation-picker label:has(input:focus-visible){border-color:var(--action);box-shadow:0 0 0 3px rgba(23,107,74,.13)}.compensation-section{padding:16px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.94);box-shadow:0 4px 14px rgba(26,46,42,.05);margin:14px 0}.compensation-section[hidden]{display:none!important}.compensation-section h2{font-size:1rem;margin:0 0 12px}.compensation-section .dropzone,.compensation-section .travel-card{margin:0}.compensation-section #event{margin-bottom:10px}.profile-form{display:grid;gap:12px}.profile-section{padding:16px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.94);box-shadow:0 4px 14px rgba(26,46,42,.05)}.profile-section h2{margin:0 0 12px;font-size:1rem}.profile-section .contact-grid,.profile-section .bank-account-card{margin:0}.profile-section .bank-account-card{padding:0;border:0;box-shadow:none}.mode-help{margin:4px 0 12px;color:var(--muted)}@media(max-width:560px){.compensation-picker{grid-template-columns:1fr}.compensation-picker label{min-height:68px}.compensation-section,.profile-section{padding:13px}}`;
  document.head.append(style);

  const formTitle=form.querySelector('h1'),formSubtitle=form.querySelector('.subtitle');
  if(formTitle)formTitle.textContent='Dina uppgifter';
  if(formSubtitle)formSubtitle.textContent='Fyll i uppgifterna som behövs för utbetalningen.';
  profileNext.textContent='Nästa: välj ersättning';
  const profileForm=document.createElement('div'),contactSection=document.createElement('section'),bankSection=document.createElement('section');
  profileForm.className='profile-form';contactSection.className='profile-section';bankSection.className='profile-section';
  contactSection.innerHTML='<h2>Kontaktuppgifter</h2>';
  form.insertBefore(profileForm,contactFields||profileNext);profileForm.append(contactSection,bankSection);
  if(contactFields)contactSection.append(contactFields);if(bankCard)bankSection.append(bankCard);

  const chooser=document.createElement('fieldset');
  chooser.className='compensation-picker';
  chooser.innerHTML=`<legend>Vad söker du ersättning för?</legend>
    <label><input type="checkbox" id="includeReceipts"><span><strong>Kvitton för utlägg</strong><small>Ladda upp ett eller flera kvitton.</small></span></label>
    <label><input type="checkbox" id="includeTravel"><span><strong>Milersättning</strong><small>Ange resa och antal kilometer.</small></span></label>`;
  upload.insertBefore(chooser,subtitle||upload.firstChild);
  const uploadTitle=upload.querySelector('h1');if(uploadTitle)uploadTitle.textContent='Välj ersättning';
  if(subtitle){subtitle.textContent='Välj en eller båda ersättningstyperna. Rätt fält öppnas automatiskt.';subtitle.classList.add('mode-help')}

  const receiptSection=document.createElement('section');
  receiptSection.className='compensation-section';receiptSection.hidden=true;receiptSection.innerHTML='<h2>Kvitton för utlägg</h2>';
  chooser.after(receiptSection);[fileInput,dropzone,receiptPanel].forEach(element=>{if(element)receiptSection.append(element)});
  const travelSection=document.createElement('section');
  travelSection.className='compensation-section';travelSection.hidden=true;travelSection.innerHTML='<h2>Resan</h2>';
  receiptSection.after(travelSection);if(eventField)travelSection.append(eventField);if(travelCard)travelSection.append(travelCard);
  if(otherField){otherField.placeholder='Övrig information (valfritt)';travelSection.after(otherField)}
  if(addMore)addMore.remove();

  const receiptsToggle=chooser.querySelector('#includeReceipts'),travelToggle=chooser.querySelector('#includeTravel');
  const baseCanLeaveReceipts=window.__idvCanLeaveReceipts||(()=>false);
  const getMode=()=>receiptsToggle.checked&&travelToggle.checked?'combined':receiptsToggle.checked?'receipts':travelToggle.checked?'travel':null;
  const hasReceipts=()=>Boolean(window.__idvReceiptState?.photos?.length);

  function decorateSummary(){
    if(!summary||!summary.innerHTML)return;
    let row=summary.querySelector('.submission-mode-summary');
    if(!row){row=document.createElement('div');row.className='row submission-mode-summary';row.innerHTML='<span>Typ av underlag</span><b></b>';summary.prepend(row)}
    const value=row.querySelector('b'),label=MODE_LABELS[getMode()]||'';if(value&&value.textContent!==label)value.textContent=label;
  }
  function canLeaveCompensation(){
    const mode=getMode();if(!mode)return false;
    const receiptsValid=!receiptsToggle.checked||Boolean(baseCanLeaveReceipts());
    const travelValid=!travelToggle.checked||(Boolean(window.__idvTravel?.getData()?.approved)&&Boolean(eventField?.value.trim()));
    return receiptsValid&&travelValid;
  }
  function sync(){
    const mode=getMode();
    receiptSection.hidden=!receiptsToggle.checked;travelSection.hidden=!travelToggle.checked;
    if(otherField)otherField.hidden=!mode;
    if(travelEnabled&&travelEnabled.checked!==travelToggle.checked){travelEnabled.checked=travelToggle.checked;travelEnabled.dispatchEvent(new Event('change',{bubbles:true}))}
    if(eventField){eventField.required=travelToggle.checked;eventField.placeholder='Tillfälle eller kort beskrivning av resan *';eventField.setAttribute('aria-label','Tillfälle eller kort beskrivning av resan')}
    continueBtn.disabled=!canLeaveCompensation();continueBtn.textContent='Nästa: kontrollera och skicka';
    continueBtn.title=mode?'Fyll i de valda ersättningarna innan du går vidare.':'Välj kvitton, milersättning eller båda.';
    receiptActions?.classList.toggle('continue-centered',!receiptsToggle.checked||!hasReceipts());
    document.body.dataset.submissionMode=mode||'none';document.body.dataset.hasReceipts=String(hasReceipts());
  }

  window.__idvSubmissionMode={getMode,needsReceipts:()=>receiptsToggle.checked,needsTravel:()=>travelToggle.checked,canLeaveReceipts:canLeaveCompensation,hasRequiredReceipts:()=>!receiptsToggle.checked||hasReceipts()};
  window.__idvCanLeaveReceipts=canLeaveCompensation;window.__idvSyncSubmissionMode=sync;
  [receiptsToggle,travelToggle].forEach(toggle=>toggle.addEventListener('change',sync));
  eventField?.addEventListener('input',sync);
  document.addEventListener('travel-state-change',sync);
  document.getElementById('thumbs')?.addEventListener('input',sync);
  const thumbs=document.getElementById('thumbs');if(thumbs)new MutationObserver(sync).observe(thumbs,{childList:true});
  if(summary)new MutationObserver(decorateSummary).observe(summary,{childList:true,subtree:true});
  sync();
}
