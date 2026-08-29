export function initUploadUi(){
  const thumbs=document.getElementById('thumbs');
  const badge=document.getElementById('fileCountBadge');
  const addLabel=document.getElementById('addLabel');
  const listTitle=document.getElementById('receiptListTitle');
  const listHelp=document.getElementById('receiptListHelp');
  const continueBtn=document.getElementById('continue');
  const restartBtn=document.getElementById('restart');
  const upload=document.getElementById('upload');

  function sync(){
    const n=thumbs?thumbs.children.length:0;
    const hasReceipts=n>0;
    const onFirstStep=!!upload?.classList.contains('active');

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
      continueBtn.disabled=!hasReceipts;
      continueBtn.hidden=!hasReceipts;
      continueBtn.style.display=hasReceipts?'':'none';
    }

    if(restartBtn){
      const hideRestart=onFirstStep&&!hasReceipts;
      restartBtn.hidden=hideRestart;
      restartBtn.style.display=hideRestart?'none':'';
    }
  }

  if(thumbs){
    new MutationObserver(sync).observe(thumbs,{childList:true});
  }
  if(upload){
    new MutationObserver(sync).observe(upload,{attributes:true,attributeFilter:['class']});
  }
  sync();
}
