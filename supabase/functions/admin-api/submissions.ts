const ALLOWED_STATUS=new Set(['new','in_progress','done','archived']);
export class SubmissionValidationError extends Error{}

export async function listSubmissions(client:any,status?:string|null){
  if(status&&!ALLOWED_STATUS.has(status))throw new SubmissionValidationError('Ogiltigt statusfilter.');
  let query=client.from('receipt_submissions').select('id,created_at,sender_name,sender_email,event_tag,amount_total,receipt_total,travel_km,travel_description,travel_amount,status,status_updated_at,handled_by,admin_note,final_pdf_path,archived_at,archived_by').order('created_at',{ascending:false}).limit(500);
  if(status==='archived'){
    query=query.not('archived_at','is',null);
    const {data:retentionSetting}=await client.from('app_settings').select('value').eq('key','retention_days').maybeSingle();
    const retentionDays=Number(retentionSetting?.value||365);
    const cutoff=new Date(Date.now()-Math.max(1,Number.isFinite(retentionDays)?retentionDays:365)*86400000).toISOString();
    query=query.gte('archived_at',cutoff);
  }
  else if(status)query=query.is('archived_at',null);
  if(status&&status!=='archived'&&ALLOWED_STATUS.has(status))query=query.eq('status',status);
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
  if(!ALLOWED_STATUS.has(status))throw new SubmissionValidationError('Ogiltig status.');
  const patch:any={status,status_updated_at:new Date().toISOString(),handled_by:userId};
  if(typeof note==='string')patch.admin_note=note.slice(0,5000);
  const {data,error}=await client.from('receipt_submissions').update(patch).eq('id',id).select('id,status,status_updated_at,handled_by,admin_note').single();
  if(error)throw error;
  return data;
}

export async function archiveSubmission(client:any,userId:string,id:string,archived:boolean){
  const patch:any=archived
    ? {archived_at:new Date().toISOString(),archived_by:userId}
    : {archived_at:null,archived_by:null};
  const {data,error}=await client.from('receipt_submissions').update(patch).eq('id',id).select('id,archived_at,archived_by').single();
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

export async function deleteSubmission(client:any,id:string){
  const {data:submission,error:submissionError}=await client.from('receipt_submissions').select('id,final_pdf_path,receipt_files(storage_path)').eq('id',id).single();
  if(submissionError)throw submissionError;
  const paths=[submission.final_pdf_path,...(submission.receipt_files||[]).map((file:any)=>file.storage_path)].filter(Boolean);
  const uniquePaths=[...new Set(paths)];
  if(uniquePaths.length){
    const {error:storageError}=await client.storage.from('receipt-files').remove(uniquePaths);
    if(storageError)throw storageError;
  }
  const {error:filesError}=await client.from('receipt_files').delete().eq('submission_id',id);
  if(filesError)throw filesError;
  const {error:deleteError}=await client.from('receipt_submissions').delete().eq('id',id);
  if(deleteError)throw deleteError;
  return {id,deleted:true};
}

export async function purgeExpiredSubmissions(client:any){
  const {data:retentionSetting,error:settingError}=await client.from('app_settings').select('value').eq('key','retention_days').maybeSingle();
  if(settingError)throw settingError;
  const configuredDays=Number(retentionSetting?.value||365);
  const retentionDays=Math.max(1,Number.isFinite(configuredDays)?configuredDays:365);
  const cutoff=new Date(Date.now()-retentionDays*86400000).toISOString();
  const {data,error}=await client.from('receipt_submissions').select('id').not('archived_at','is',null).lt('archived_at',cutoff).limit(100);
  if(error)throw error;
  for(const submission of data||[])await deleteSubmission(client,String(submission.id));
  return {deleted:(data||[]).length,cutoff};
}
