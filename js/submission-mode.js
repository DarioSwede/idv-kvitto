export const SUBMISSION_MODES=new Set(['receipts','travel','combined']);

export function initSubmissionMode(){
  const radios=[...document.querySelectorAll('input[name="submissionMode"]')];
  const uploadBox=document.getElementById('receiptUploadArea');
  const continueBtn=document.getElementById('continue');
  const travelCard=document.querySelector('.travel-card');
  const travelEnabled=document.getElementById('travelEnabled');
  const travelOption=document.querySelector('.travel-option');
  const addMore=document.querySelector('.missing-receipt');
  if(!radios.length)return;

  const baseCanLeaveReceipts=window.__idvCanLeaveReceipts||(()=>false);
  const getMode=()=>radios.find(r=>r.checked)?.value||'receipts';
  const hasReceipts=()=>Boolean(window.__idvReceiptState?.photos?.length);

  function sync(){
    const mode=getMode();
    const needsReceipts=mode!=='travel';
    const needsTravel=mode!=='receipts';
    if(uploadBox)uploadBox.hidden=!needsReceipts;
    if(travelCard)travelCard.hidden=!needsTravel;
    if(addMore)addMore.hidden=!needsReceipts;
    if(travelOption)travelOption.hidden=true;
    if(travelEnabled){
      travelEnabled.checked=needsTravel;
      travelEnabled.dispatchEvent(new Event('change',{bubbles:true}));
    }
    if(continueBtn){
      const canContinue=mode==='travel'||baseCanLeaveReceipts();
      continueBtn.hidden=false;
      continueBtn.style.display='';
      continueBtn.disabled=!canContinue;
      continueBtn.textContent=mode==='travel'?'Nästa: dina uppgifter':'Nästa: dina uppgifter';
      continueBtn.title=canContinue?'':'Lägg till minst ett kvitto och fyll i belopp på alla kvitton';
    }
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
  radios.forEach(radio=>radio.addEventListener('change',sync));
  document.getElementById('thumbs')?.addEventListener('input',sync);
  new MutationObserver(sync).observe(document.getElementById('thumbs'),{childList:true});
  sync();
}
