const ALLOWED_STATUS=new Set(['new','in_progress','done']);

export async function listSubmissions(client:any,status?:string|null){
  let query=client.from('receipt_submissions').select('id,created_at,sender_name,sender_email,event_tag,amount_total,receipt_total,travel_km,travel_description,travel_amount,status,status_updated_at,handled_by,admin_note,final_pdf_path').order('created_at',{ascending:false}).limit(500);
  if(status&&ALLOWED_STATUS.has(status))query=query.eq('status',status);
  const {data,error}=await query;
  if(error)throw error;
  return data||[];
}

export async function getSubmission(client:any,id:string){
  const {data,error}=await client.from('receipt_submissions').select('*,receipt_files(*)').eq('id',id).single();
  if(error)throw error;
  return data;
}

export async function updateSubmissionStatus(client:any,userId:string,id:string,status:string,note?:string){
  if(!ALLOWED_STATUS.has(status))throw new Error('Ogiltig status.');
  const patch:any={status,status_updated_at:new Date().toISOString(),handled_by:userId};
  if(typeof note==='string')patch.admin_note=note.slice(0,5000);
  const {data,error}=await client.from('receipt_submissions').update(patch).eq('id',id).select('id,status,status_updated_at,handled_by,admin_note').single();
  if(error)throw error;
  return data;
}

export async function createPdfLink(client:any,id:string){
  const {data:submission,error}=await client.from('receipt_submissions').select('final_pdf_path').eq('id',id).single();
  if(error)throw error;
  if(!submission?.final_pdf_path)throw new Error('Ingen sammanställd PDF finns.');
  const {data,error:signError}=await client.storage.from('receipt-files').createSignedUrl(submission.final_pdf_path,300);
  if(signError)throw signError;
  return data.signedUrl;
}
