export function getPlatformUploadHelp(nav=globalThis.navigator){
  const platform=String(nav?.userAgentData?.platform||nav?.platform||'').toLowerCase();
  const userAgent=String(nav?.userAgent||'').toLowerCase();
  const isAppleMobile=/iphone|ipad|ipod/.test(userAgent)||(platform==='macintel'&&Number(nav?.maxTouchPoints)>1);
  if(isAppleMobile)return 'Välj Kamera, Bilder eller Filer.';
  if(platform.includes('mac'))return 'Välj Bilder eller Hämtade filer i sidomenyn.';
  if(platform.includes('win'))return 'Välj Bilder eller Hämtade filer i Utforskaren.';
  if(/android/.test(userAgent))return 'Välj Kamera, Bilder eller Filer.';
  return 'Välj bilder eller filer från din enhet.';
}

export function hasCompleteReceiptAmounts(values,receiptCount=values.length){
  return receiptCount>0&&values.length===receiptCount&&values.every(value=>String(value).trim()!==''&&Number(value)>0);
}

export function canContinueReceiptStep(values,receiptCount=values.length,processing=0){
  return Number(processing)===0&&hasCompleteReceiptAmounts(values,receiptCount);
}

export function initUploadUi(){
  const thumbs=document.getElementById('thumbs');
  const badge=document.getElementById('fileCountBadge');
  const addLabel=document.getElementById('addLabel');
  const listTitle=document.getElementById('receiptListTitle');
  const listHelp=document.getElementById('receiptListHelp');
  const continueBtn=document.getElementById('continue');
  const restartBtn=document.getElementById('restart');
  const upload=document.getElementById('upload');
  const dropzoneTitle=document.getElementById('dropzoneTitle');
  const platformHelp=document.getElementById('platformHelp');
  const uploadInstructions=document.getElementById('uploadInstructions');

  if(platformHelp)platformHelp.textContent=getPlatformUploadHelp();

  function canLeaveReceipts(){
    const n=thumbs?thumbs.children.length:0;
    const amounts=thumbs?[...thumbs.querySelectorAll('.receipt-amount')].map(input=>input.value):[];
    const processing=window.__idvReceiptState?.processing||0;
    return canContinueReceiptStep(amounts,n,processing);
  }
  window.__idvCanLeaveReceipts=canLeaveReceipts;

  function sync(){
    const n=thumbs?thumbs.children.length:0;
    const hasReceipts=n>0;
    const canContinue=canLeaveReceipts();
    const onFirstStep=!!upload?.classList.contains('active');

    if(thumbs)thumbs.dataset.columns=String(Math.min(Math.max(n,1),3));
    if(dropzoneTitle)dropzoneTitle.textContent=hasReceipts?'Välj fler kvittofiler':'Välj kvittofiler';
    if(uploadInstructions)uploadInstructions.textContent=hasReceipts?'Välj filer, ändra namn, välj identifierat totalbelopp eller skriv in eget.':'Välj filer från dator eller telefon.';

    if(badge){
      badge.textContent=String(n);
      badge.hidden=!hasReceipts;
      badge.style.display=hasReceipts?'inline-flex':'none';
      badge.setAttribute('aria-label',n===1?'1 fil tillagd':n+' filer tillagda');
    }

    if(addLabel)addLabel.textContent=hasReceipts?'＋ Lägg till fler kvitton':'📷 Ta foto / välj filer';
    if(listTitle)listTitle.hidden=!hasReceipts;
    if(listHelp)listHelp.hidden=!hasReceipts;

    if(continueBtn){
      continueBtn.disabled=!canContinue;
      continueBtn.hidden=!hasReceipts;
      continueBtn.style.display=hasReceipts?'':'none';
      continueBtn.title=canContinue?'':'Fyll i belopp på alla kvitton och vänta tills filerna är klara';
    }

    if(restartBtn){
      const hideRestart=onFirstStep&&!hasReceipts;
      restartBtn.hidden=hideRestart;
      restartBtn.style.display=hideRestart?'none':'';
    }
  }

  if(thumbs){
    new MutationObserver(sync).observe(thumbs,{childList:true});
    thumbs.addEventListener('input',sync);
  }
  if(upload){
    new MutationObserver(sync).observe(upload,{attributes:true,attributeFilter:['class']});
  }
  sync();
}
