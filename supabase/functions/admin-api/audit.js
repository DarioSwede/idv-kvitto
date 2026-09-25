export const AUDIT_RETENTION_DAYS = 90;
const EVENTS = new Set(['login','access','test-mail','settings','submission','archive','invite','logout','audit','receipt-submitted','permission-change']);
const ROLES = new Set(['superuser','admin','cashier','tester','viewer']);
const SEVERITIES = new Set(['low','medium','high','critical']);
const DETAILS = new Set(['invalid_credentials','rate_limited','manual_logout','idle_timeout','session_expired','invitation_sent','role_assigned','role_changed','role_removed','receipt_received']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (value,max) => typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g,'').trim().slice(0,max) || null : null;
const email = value => { const normalized=clean(value,320)?.toLowerCase(); return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null; };

// Never copy bodies, query strings, credentials or arbitrary metadata into the log.
export function auditEntry(req, {event, userId = null, success, requestId, targetId = null, actorEmail = null, actorName = null, actorRole = null, subjectEmail = null, subjectName = null, targetEmail = null, targetRole = null, detailCode = null, severity = 'low'}) {
  if (!EVENTS.has(event) || (success !== null && typeof success !== 'boolean')) throw new Error('Invalid audit event');
  if (!UUID.test(requestId || '') || !SEVERITIES.has(severity)) throw new Error('Invalid audit context');
  return {
    event_type:event, user_id:UUID.test(userId || '') ? userId : null, success,
    request_id:requestId, target_id:UUID.test(targetId || '') ? targetId : null,
    actor_email:email(actorEmail), actor_name:clean(actorName,200), actor_role:ROLES.has(actorRole) ? actorRole : null,
    subject_email:email(subjectEmail), subject_name:clean(subjectName,200),
    target_email:email(targetEmail), target_role:ROLES.has(targetRole) ? targetRole : null,
    detail_code:DETAILS.has(detailCode) ? detailCode : null, severity,
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
    .select('id,created_at,user_id,event_type,success,request_id,target_id,actor_email,actor_name,actor_role,subject_email,subject_name,target_email,target_role,detail_code,severity,method,path,user_agent,ip_address,country,auth_method')
    .gte('created_at',cutoff).order('created_at',{ascending:false}).limit(100);
  if (error) throw new Error('Säkerhetsloggen kunde inte hämtas.');
  const entries=data || [];
  const ids=[...new Set(entries.flatMap(row=>[
    row.user_id,
    ['permission-change','invite'].includes(row.event_type) ? row.target_id : null,
  ]).filter(Boolean))];
  const identities=new Map();
  await Promise.all(ids.map(async id=>{
    try {
      const {data:userData}=await client.auth.admin.getUserById(id);
      if(userData?.user)identities.set(id,{email:userData.user.email||null});
    } catch {
      // A deleted or temporarily unavailable identity must not hide the rest of the log.
    }
  }));
  for(const entry of entries){
    const actor=identities.get(entry.user_id),target=identities.get(entry.target_id);
    entry.actor_email ||= actor?.email || null;
    entry.target_email ||= target?.email || null;
    if(entry.event_type==='login' && entry.success===false && entry.severity!=='critical'){
      // Older rows predate the severity column and received the low default in the migration.
      entry.severity='high';
      entry.detail_code ||= 'invalid_credentials';
      const when=Date.parse(entry.created_at),key=entry.actor_email;
      const related=entries.filter(other=>other.event_type==='login'&&other.success===false&&other.actor_email===key&&Math.abs(Date.parse(other.created_at)-when)<=600000);
      if(key&&related.length>=5){entry.severity='critical';entry.detail_code='rate_limited';}
    }
  }
  return entries;
}
