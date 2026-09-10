export function renderReceiptPreviews({container,documentRef=document,photos=[],openReceipt=()=>{}}={}){
  if(!container)return;
  container.replaceChildren();
  photos.forEach(receipt=>{
    const thumbnail=documentRef.createElement('div');
    thumbnail.className='thumb';
    if(receipt.pdf){
      const icon=documentRef.createElement('div');
      icon.style.cssText='display:grid;place-items:center;height:100%;font-size:2rem';
      icon.textContent='📄';
      thumbnail.append(icon);
    }else if(receipt.canvas){
      const image=new Image();
      image.src=receipt.canvas.toDataURL('image/jpeg',.8);
      image.alt=receipt.name||'Kvitto';
      thumbnail.append(image);
    }else{
      const icon=documentRef.createElement('div');
      icon.style.cssText='display:grid;place-items:center;height:100%;font-size:2rem';
      icon.textContent='🖼️';
      thumbnail.append(icon);
    }
    thumbnail.style.cursor='pointer';
    thumbnail.onclick=()=>openReceipt(receipt);
    thumbnail.title=receipt.name||'Kvitto';
    container.append(thumbnail);
  });
  container.dataset.columns=String(Math.min(Math.max(photos.length,1),3));
}

export function prepareSubmissionReview({documentRef=document,photos=[],submissionMode='receipts',openReceipt=()=>{},name='',email='',eventTag='',travel,bank,validate,summaryModule,renderReview,show}={}){
  const validation=validate?.({name,email,eventTag,bank,travel,photos,submissionMode})||{valid:false,message:'Valideringsmodulen kunde inte laddas. Ladda om sidan.'};
  if(!validation.valid)return validation;
  renderReceiptPreviews({container:documentRef.getElementById('previewThumbs'),documentRef,photos,openReceipt});
  if(!summaryModule)return {valid:false,message:'Sammanställningsmodulen kunde inte laddas. Ladda om sidan.'};
  summaryModule.renderSubmissionSummary({container:documentRef.getElementById('summary'),documentRef,name,email,eventTag,photos,travel,bank,submissionMode});
  renderReview?.();
  show?.('review');
  return {valid:true,message:''};
}
