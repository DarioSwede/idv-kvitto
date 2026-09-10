export function renderReceiptList({container,documentRef=document,photos=[],processing=0,openReceipt=()=>{},onRemove=()=>{},onRerender=()=>{},successElement,continueButton}={}){
  if(!container)return;
  container.replaceChildren();
  photos.forEach((photo,index)=>{
    const item=documentRef.createElement('div');
    item.className='receipt-item';
    const thumbnail=documentRef.createElement('div');
    thumbnail.className='thumb';
    thumbnail.setAttribute('role','button');
    thumbnail.tabIndex=0;
    thumbnail.setAttribute('aria-label','Öppna '+(photo.name||'kvitto'));
    if(photo.pdf)thumbnail.innerHTML='<div style="display:grid;place-items:center;height:100%;font-size:2rem">📄</div>';
    else if(photo.canvas){const image=new Image();image.src=photo.canvas.toDataURL('image/jpeg',.7);thumbnail.append(image)}
    else thumbnail.innerHTML='<div style="display:grid;place-items:center;height:100%;font-size:2rem">🖼️</div>';
    thumbnail.onclick=()=>openReceipt(photo);
    thumbnail.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openReceipt(photo)}};
    const remove=documentRef.createElement('button');
    remove.className='remove';
    remove.textContent='✕';
    remove.setAttribute('aria-label','Ta bort '+(photo.name||'kvitto'));
    remove.onclick=event=>{event.stopPropagation();onRemove(index)};
    thumbnail.append(remove);
    const hint=documentRef.createElement('button');
    hint.type='button';hint.disabled=true;hint.className='ocr-status receipt-hint';hint.dataset.state=photo.ocrState||'';hint.textContent=photo.ocrMessage||'OCR väntar';
    if(photo.ocrState==='working'){const progress=documentRef.createElement('span');progress.className='ocr-progress-bar';progress.setAttribute('aria-hidden','true');hint.append(progress)}
    const nameRow=documentRef.createElement('div');
    nameRow.className='receipt-name-row';
    const nameInput=documentRef.createElement('input');
    nameInput.className='receipt-name';nameInput.value=photo.name||'';nameInput.maxLength=200;nameInput.placeholder='Namnge kvittot';nameInput.setAttribute('aria-label',`Vad kvitto ${index+1} gäller`);
    nameInput.oninput=event=>{photo.name=event.target.value;photo.autoNamePending=false};
    nameRow.append(nameInput);
    const amountGroup=documentRef.createElement('label');
    amountGroup.className='receipt-amount-group';amountGroup.textContent='Belopp';
    const amountWrap=documentRef.createElement('div');
    amountWrap.className='receipt-amount-wrap';
    const amountInput=documentRef.createElement('input');
    amountInput.className='receipt-amount';amountInput.type='number';amountInput.min='0.01';amountInput.step='0.01';amountInput.placeholder='0,00';amountInput.value=photo.amount||'';amountInput.setAttribute('aria-label',`Belopp för kvitto ${index+1}`);
    amountInput.oninput=event=>{photo.amount=event.target.value;photo.amountSource='manual';photo.ocrSuggestion='';photo.ocrState='manual';photo.ocrMessage='Ditt manuella belopp behålls';hint.disabled=true;hint.dataset.state='manual';hint.textContent=photo.ocrMessage};
    amountWrap.append(amountInput,documentRef.createTextNode('kr'));amountGroup.append(amountWrap);
    if(photo.ocrSuggestion&&photo.amountSource!=='manual'){
      hint.disabled=false;hint.dataset.state='suggested';hint.textContent='OCR-förslag '+Number(photo.ocrSuggestion).toLocaleString('sv-SE',{maximumFractionDigits:0})+' kr (avrundat till hel krona). Använd?';
      hint.onclick=()=>{photo.amount=photo.ocrSuggestion;photo.amountSource='ocr';photo.ocrSuggestion='';photo.ocrState='accepted';photo.ocrMessage='OCR-förslaget används';onRerender()};
    }
    item.append(thumbnail,hint,nameRow,amountGroup);container.append(item);
  });
  if(successElement){successElement.hidden=!photos.length;successElement.textContent=photos.length===1?'✓ 1 kvitto tillagt':`✓ ${photos.length} kvitton tillagda`}
  if(continueButton)continueButton.disabled=!photos.length||processing>0;
}
