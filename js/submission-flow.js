/** Build the multipart payload sent to the submit-receipt Edge Function. */
export async function buildSubmissionFormData({name,email,eventTag='',otherInfo='',copyRequested=false,bank,travel,photos=[]}){
  const formData=new FormData();
  const receiptTotal=photos.reduce((sum,photo)=>sum+(Number(photo.amount)||0),0);
  formData.append('sender_name',String(name||'').trim());
  formData.append('sender_email',String(email||'').trim().toLowerCase());
  formData.append('clearing_number',bank.clearingNumber||'');
  formData.append('account_number',bank.accountNumber||'');
  formData.append('event_tag',String(eventTag||'').trim());
  formData.append('other_info',String(otherInfo||'').trim());
  formData.append('amount_total',receiptTotal+(Number(travel.amount)||0)||'');
  formData.append('travel_enabled',travel.enabled?'true':'false');
  formData.append('travel_km',travel.km??'');
  formData.append('travel_description',travel.description||'');
  formData.append('travel_amount',travel.amount||'');
  formData.append('travel_approved',travel.approved?'true':'false');
  formData.append('cc_self',copyRequested?'true':'false');
  for(let index=0;index<photos.length;index+=1){const photo=photos[index];formData.append('receipt_names',(photo.name||`Kvitto ${index+1}`).trim());formData.append('receipt_amounts',photo.amount||'');if(photo.pdf||photo.raw){formData.append('receipts',photo.file,photo.file.name||`kvitto_${index+1}`);continue}const blob=await canvasToBlob(photo.canvas);formData.append('receipts',blob,`kvitto_${index+1}.jpg`)}
  return formData;
}
function canvasToBlob(canvas){return new Promise((resolve,reject)=>{if(!canvas?.toBlob)return reject(new Error('Kvittoförhandsvisningen kunde inte bearbetas.'));canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Kvittofilen kunde inte komprimeras.')),'image/jpeg',.85)})}
