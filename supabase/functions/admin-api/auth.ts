import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { canAccessAdminRole } from './roles.js';

export function serviceClient(){
  const url=Deno.env.get('SUPABASE_URL');
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!key)throw new Error('Supabase service-konfiguration saknas.');
  return createClient(url,key,{auth:{persistSession:false}});
}

export async function requireStaff(req:Request){
  const auth=req.headers.get('authorization')||'';
  const token=auth.replace(/^Bearer\s+/i,'').trim();
  if(!token)throw new Response(JSON.stringify({error:'Inloggning krävs.'}),{status:401,headers:{'Content-Type':'application/json'}});
  const client=serviceClient();
  const {data,error}=await client.auth.getUser(token);
  if(error||!data.user)throw new Response(JSON.stringify({error:'Ogiltig eller utgången session.'}),{status:401,headers:{'Content-Type':'application/json'}});
  const {data:staff,error:staffError}=await client.from('admin_users').select('role').eq('user_id',data.user.id).maybeSingle();
  if(staffError||!staff||!canAccessAdminRole(staff.role))throw new Response(JSON.stringify({error:'Personalbehörighet krävs.'}),{status:403,headers:{'Content-Type':'application/json'}});
  return {client,user:data.user,role:staff.role as 'admin'|'cashier'|'tester'|'viewer'};
}
