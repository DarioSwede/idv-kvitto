import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { verifyStaff } from './staff.js';

export function serviceClient(){
  const url=Deno.env.get('SUPABASE_URL');
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)throw new Error('Supabase service-konfiguration saknas.');
  return createClient(url,key,{auth:{persistSession:false}});
}

export async function requireStaff(req:Request){
  return verifyStaff(req,serviceClient());
}

export function publicAuthClient(){
  const url=Deno.env.get('SUPABASE_URL');
  const key=Deno.env.get('SUPABASE_ANON_KEY');
  if(!url||!key)throw new Error('Publik Auth-konfiguration saknas.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
