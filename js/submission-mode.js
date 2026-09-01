export const SUBMISSION_MODES=new Set(['receipts','travel','combined']);

const MODE_LABELS={receipts:'Endast kvitton',travel:'Endast reseräkning',combined:'Kvitton + reseräkning'};

export function initSubmissionMode(){
  const upload=document.getElementById('upload');
  const subtitle=document.getElementById('uploadInstructions');
  const dropzone=document.getElementById('dropzone');
  const fileInput=document.getElementById('file');
  const receiptPanel=document.getElementById('uploadThumbHome');
  const continueBtn=document.getElementById('continue');
  const travelCard=document.querySelector('.travel-card');
  const travelEnabled=document.getElementById('travelEnabled');
  const travelOption=document.querySelector('.travel-option');
  const addMore=document.querySelector('.missing-receipt');
  const summary=document.getElementById('summary');
  if(!upload||!continueBtn)return;

  const chooser=document.createElement('fieldset');
  chooser.className='submission-mode-card';
  chooser.innerHTML=`<legend>Vad vill du skicka in?</legend>
    <label><input type="radio" name="submissionMode" value="receipts" checked><span><strong>Endast kvitton</strong><small>Ersättning för utlägg med ett eller flera kvitton.</small></span></label>
    <label><input type="radio" name="submissionMode" value="travel"><span><strong>Endast reseräkning</strong><small>Eget fordon, utan kvittofiler.</small></span></label>
    <label><input type="radio" name="submissionMode" value="combined"><span><strong>Kvitton + reseräkning</strong><small>Skicka båda delarna i samma underlag.</small></span></label>`;
  upload.insertBefore(chooser,subtitle||upload.firstChild);

  const style=document.createElement('style');
  style.textContent=`.submission-mode-card{border:1px solid var(--line);border-radius:14px;background:#fff;padding:14px;margin:14px 0}.submission-mode-card legend{font-weight:800;padding:0 6px}.submission-mode-card label{display:flex;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:10px;padding:12px;margin:8px 0;cursor:pointer}.submission-mode-card input{width:auto;margin:3px 0 0}.submission-mode-card span{display:grid;gap:3px}.submission-mode-card small{font-weight:400;color:var(--muted);line-height:1.35}.submission-mode-card label:has(input:checked){border-color:var(--action);background:#eef5f0}`;
  document.head.append(style);

  const radios=[...chooser.querySelectorAll('input[name="submissionMode"]')];
  const baseCanLeaveReceipts=window.__idvCanLeaveReceipts||(()=>false);
  const getMode=()=>radios.find(r=>r.checked)?.value||'receipts';
  const hasReceipts=()=>Boolean(window.__idvReceiptState?.photos?.length);

  function decorateSummary(){
    if(!summary||!summary.innerHTML)return;
    let row=summary.querySelector('.submission-mode-summary');
    if(!row){
      row=document.createElement('div');
      row.className='row submission-mode-summary';
      row.innerHTML='<span>Typ av underlag</span><b></b>';
      summary.prepend(row);
    }
    row.querySelector('b').textContent=MODE_LABELS[getMode()];
  }

  function sync(){
    const mode=getMode();
    const needsReceipts=mode!=='travel';
    const needsTravel=mode!=='receipts';
    [dropzone,fileInput,receiptPanel].forEach(el=>{if(el)el.hidden=!needsReceipts});
    if(travelCard)travelCard.hidden=!needsTravel;
    if(addMore)addMore.hidden=!needsReceipts;
    if(travelOption)travelOption.hidden=true;
    if(travelEnabled){
      travelEnabled.checked=needsTravel;
      travelEnabled.dispatchEvent(new Event('change',{bubbles:true}));
    }
    const canContinue=mode==='travel'||baseCanLeaveReceipts();
    continueBtn.hidden=false;
    continueBtn.style.display='';
    continueBtn.disabled=!canContinue;
    continueBtn.textContent='Nästa: dina uppgifter';
    continueBtn.title=canContinue?'':'Lägg till minst ett kvitto och fyll i belopp på alla kvitton';
    if(subtitle)subtitle.textContent=mode==='travel'?'Du behöver inte bifoga något kvitto. Fyll i resan i nästa steg.':needsReceipts?'Lägg till kvitton och fyll i belopp innan du går vidare.':'';
    document.body.dataset.submissionMode=mode;
  }

  window.__idvSubmissionMode={
    getMode,
    needsReceipts:()=>getMode()!=='travel',
    needsTravel:()=>getMode()!=='receipts',
    canLeaveReceipts:()=>getMode()==='travel'||baseCanLeaveReceipts(),
    hasRequiredReceipts:()=>getMode()==='travel'||hasReceipts()
  };
  window.__idvCanLeaveReceipts=()=>window.__idvSubmissionMode.canLeaveReceipts();

  const nativeFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    if(init?.body instanceof FormData&&String(init.method||'GET').toUpperCase()==='POST'){
      init.body.set('submission_mode',getMode());
    }
    return nativeFetch(input,init);
  };

  radios.forEach(radio=>radio.addEventListener('change',sync));
  document.getElementById('thumbs')?.addEventListener('input',sync);
  const thumbs=document.getElementById('thumbs');
  if(thumbs)new MutationObserver(sync).observe(thumbs,{childList:true});
  if(summary)new MutationObserver(decorateSummary).observe(summary,{childList:true,subtree:true});
  document.getElementById('previewBtn')?.addEventListener('click',()=>setTimeout(decorateSummary,0));
  sync();
}
