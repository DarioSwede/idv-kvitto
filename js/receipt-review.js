export function renderReceiptReview({container,documentRef=document,photos=[],openReceipt=()=>{},onAmountChange=()=>{}}={}){
  if(!container)return;
  container.replaceChildren();
  photos.forEach((photo,index)=>{
    const card=documentRef.createElement('article');
    card.className='review-file';
    const heading=documentRef.createElement('h2');
    heading.textContent=`Kvitto ${index+1}`;
    const edits=documentRef.createElement('div');
    edits.className='review-edit-grid';
    const nameLabel=documentRef.createElement('label');
    nameLabel.textContent='Kvittonamn';
    const nameInput=documentRef.createElement('input');
    nameInput.value=photo.name||'';
    nameInput.placeholder='Namnge kvittot';
    nameInput.oninput=event=>{photo.name=event.target.value;photo.autoNamePending=false};
    nameLabel.append(nameInput);
    const amountLabel=documentRef.createElement('label');
    amountLabel.textContent='Belopp';
    const amountWrap=documentRef.createElement('span');
    amountWrap.className='review-amount-wrap';
    const amountInput=documentRef.createElement('input');
    amountInput.type='number';
    amountInput.min='0';
    amountInput.step='.01';
    amountInput.value=photo.amount||'';
    amountInput.placeholder='Belopp';
    amountInput.oninput=event=>{photo.amount=event.target.value;photo.amountSource='manual';onAmountChange(photo,index)};
    amountWrap.append(amountInput,documentRef.createTextNode('kr'));
    amountLabel.append(amountWrap);
    edits.append(nameLabel,amountLabel);
    card.append(heading,edits);
    if(photo.pdf){
      const button=documentRef.createElement('button');
      button.className='pdf-open';
      button.textContent='📄 Förhandsgranska '+(photo.name||`PDF-kvitto ${index+1}`);
      button.onclick=()=>openReceipt(photo);
      card.append(button);
    }else{
      const image=new Image();
      image.alt=photo.name||`Kvitto ${index+1}`;
      image.src=photo.canvas?photo.canvas.toDataURL('image/jpeg',.92):URL.createObjectURL(photo.file);
      card.append(image);
    }
    container.append(card);
  });
}
