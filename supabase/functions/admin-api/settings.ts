import {requireSettingsAdmin} from './roles.js';
import {emailSettingError} from './email-settings.js';
export const EDITABLE_SETTING_KEYS=new Set([
  'travel_rate_per_km','max_travel_km','max_receipts','max_file_size_mb','max_total_upload_mb',
  'allowed_mime_types','ocr_enabled','ocr_retry_enabled','cc_self_enabled','receipt_email_to',
  'email_delivery_mode','email_test_recipient','retention_days'
  ,'submission_rate_limit_requests','submission_rate_limit_window_seconds'
  ,'pdf_watermark_enabled','pdf_watermark_opacity'
]);
export class SettingValidationError extends Error{}

export async function listSettings(client:any){
  const {data,error}=await client.from('app_settings').select('key,value,description,is_public,updated_at').order('key');
  if(error)throw error;
  return data||[];
}

export async function updateSetting(client:any,userId:string,key:string,value:unknown,role?:string){
  requireSettingsAdmin(role);
  if(key==='travel_rate_per_km' && (typeof value!=='number'||!Number.isFinite(value)||value<0.001||value>1000))throw new SettingValidationError('Milersättning måste vara mellan 0,01 och 10 000 kr per mil.');
  const emailError=emailSettingError(key,value,role);
  if(emailError)throw new SettingValidationError(emailError);
  if(!EDITABLE_SETTING_KEYS.has(key))throw new SettingValidationError('Inställningen kan inte ändras här.');
  const {data,error}=await client.from('app_settings').update({value,updated_at:new Date().toISOString(),updated_by:userId}).eq('key',key).select('key,value,description,is_public,updated_at').single();
  if(error)throw error;
  return data;
}

export async function getTravelRate(client:any){
  const {data,error}=await client.from('app_settings').select('value').eq('key','travel_rate_per_km').single();
  if(error)throw error;
  return {rate_per_km:data.value};
}
