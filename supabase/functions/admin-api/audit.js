export const AUDIT_RETENTION_DAYS = 90;
const EVENTS = new Set(['login','access','test-mail','settings','submission','archive','invite','logout','audit']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Never copy bodies, query strings, credentials or arbitrary metadata into the log.
export function auditEntry(req, {event, userId = null, success, requestId, targetId = null}) {
  if (!EVENTS.has(event) || (success !== null && typeof success !== 'boolean')) throw new Error('Invalid audit event');
  return {
    event_type:event, user_id:UUID.test(userId || '') ? userId : null, success,
    request_id:requestId, target_id:UUID.test(targetId || '') ? targetId : null,
    method:req.method, path:`/admin-api/${event === 'access' ? 'me' : event}`,
    user_agent:(req.headers.get('user-agent') || '').replace(/[\x00-\x1f\x7f]/g,'').slice(0,300),
    // No verified proxy-header contract exists in this deployment yet.
    ip_address:null, country:null, auth_method:'supabase_auth',
  };
}

export async function writeAudit(client, req, details) {
  const {error} = await client.from('receipt_admin_audit').insert(auditEntry(req,details));
  if (error) throw new Error('Säkerhetsloggen kunde inte skrivas.');
}

export async function listAudit(client, role) {
  if (role !== 'superuser') throw new Response(JSON.stringify({error:'SU-behörighet krävs.'}), {status:403});
  const cutoff = new Date(Date.now()-AUDIT_RETENTION_DAYS*86400000).toISOString();
  const {data,error} = await client.from('receipt_admin_audit')
    .select('id,created_at,user_id,event_type,success,request_id,target_id,method,path,user_agent,ip_address,country,auth_method')
    .gte('created_at',cutoff).order('created_at',{ascending:false}).limit(100);
  if (error) throw new Error('Säkerhetsloggen kunde inte hämtas.');
  return data || [];
}
