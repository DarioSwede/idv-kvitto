export function parseSubmissionResponse(responseText=''){
  try{return responseText?JSON.parse(responseText):{}}
  catch{return {}}
}

export function buildSubmissionResult(result={}){
  const messages=[];
  const recipient=result.delivery_recipient||'mail@torbjornzimmerman.se';
  messages.push(result.delivery_sent?`Underlaget har skickats till ${recipient}.`:(result.delivery_error||'Underlaget har sparats säkert.'));
  if(result.copy_requested)messages.push(result.copy_sent?'En kopia med samma sammanställning och PDF har skickats till din e-postadress.':(result.copy_error||'Kopian kunde inte skickas.'));
  return{message:messages.join(' '),warning:!result.delivery_sent||(result.copy_requested&&!result.copy_sent),pdfUrl:result.final_pdf_url||''};
}
