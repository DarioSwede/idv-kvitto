import {validEmail} from '../submit-receipt/email-config.js';
import {verifyStaff} from './staff.js';
import {writeAudit} from './audit.js';
import {enforceRateLimit} from '../submit-receipt/rate-limit.js';

// Isolated public Auth client: never authenticate the service-role database client.
export async function loginStaff(req, {client,authClient,pepper,requestId}) {
  const body = await req.json();
  if (!validEmail(body?.email) || typeof body.password !== 'string' || !body.password || body.password.length > 1024) {
    throw new Response(JSON.stringify({error:'Kontrollera e-post och lösenord.'}),{status:400});
  }
  const email = body.email.trim().toLowerCase();
  await enforceRateLimit(client,{scope:'email',value:`admin-login:${email}`,windowSeconds:600,maxRequests:10,pepper});
  await writeAudit(client,req,{event:'login',success:null,requestId});
  let session;
  let userId = null;
  try {
    const {data,error} = await authClient.auth.signInWithPassword({email,password:body.password});
    if (error || !data?.session) throw new Error('Authentication failed');
    session = data.session;
    const authenticated = new Request(req.url,{headers:{authorization:`Bearer ${session.access_token}`}});
    const staff = await verifyStaff(authenticated,client);
    userId = staff.user.id;
    await writeAudit(client,req,{event:'login',userId,success:true,requestId});
    return session;
  } catch {
    if (session) await client.auth.admin.signOut(session.access_token,'local');
    await writeAudit(client,req,{event:'login',userId,success:false,requestId});
    throw new Response(JSON.stringify({error:'Inloggningen misslyckades eller kontot saknar åtkomst.'}),{status:401});
  }
}
