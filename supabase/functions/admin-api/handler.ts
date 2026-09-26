import {deliverTestMail, MailValidationError} from './test-mail.js';
import {enforceRateLimit, RateLimitError} from '../submit-receipt/rate-limit.js';
import {emailStatus} from './email-status.js';
import {requireSettingsAdmin,requireReceiptManager} from './roles.js';
import {loginStaff} from './login.js';
import {writeAudit,listAudit} from './audit.js';
import {inviteStaff,InvitationError} from './invitations.js';
import {listStaff,updateStaffRole,removeStaff,StaffManagementError} from './staff-management.js';
import {getAdminOverview} from './overview.js';
import {getTravelRate,listSettings,updateSetting,SettingValidationError} from './settings.ts';
import {purgeExpiredSubmissions,listSubmissions,getSubmission,updateSubmissionStatus,archiveSubmission,createPdfLink,SubmissionValidationError} from './submissions.ts';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store'
};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const inviteRateLimitMessage=(retryAfterSeconds:number)=>{
  const minutes=Math.max(1,Math.ceil(retryAfterSeconds/60));
  return `För många inbjudningsförsök. Försök igen om cirka ${minutes} minut${minutes===1?'':'er'}.`;
};
async function withCors(response:Response){
  const headers=new Headers(response.headers);
  Object.entries(cors).forEach(([key,value])=>headers.set(key,value));
  return new Response(await response.text(),{status:response.status,statusText:response.statusText,headers});
}

export function createAdminHandler({serviceClient,publicAuthClient,requireStaff,getEnv}:{
  serviceClient:()=>any; publicAuthClient:()=>any;
  requireStaff:(req:Request)=>Promise<any>; getEnv:(name:string)=>string|undefined;
}) {
return async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const requestId=crypto.randomUUID();
  let auditUserId:string|null=null;
  const url=new URL(req.url);
  const route=url.pathname.split('/').filter(Boolean).at(-1);
  const event=route==='travel-rate'?'settings':['invite','staff'].includes(route||'')?'permission-change':route;
  const auditable=['access','test-mail','settings','submission','archive','permission-change','logout','audit'].includes(event||'');
  let auditClient:ReturnType<typeof serviceClient>|undefined;
  let auditIdentity:any=null;
  const record=async(success:boolean|null,targetId:string|null=null,extra:any={})=>{
    if(auditable && auditClient)await writeAudit(auditClient,req,{event,userId:auditUserId,actorEmail:auditIdentity?.email,actorRole:auditIdentity?.role,success,requestId,targetId,...extra});
  };
  try{
    auditClient=serviceClient();
    if(req.method==='POST'&&route==='login'){
      const session=await loginStaff(req,{client:auditClient,authClient:publicAuthClient(),pepper:getEnv('RATE_LIMIT_PEPPER')||getEnv('SUPABASE_SERVICE_ROLE_KEY')!,requestId});
      return reply(session);
    }
    const {client,user,role}=await requireStaff(req);
    auditUserId=user.id;
    auditIdentity={...user,role};
    const parts=url.pathname.split('/').filter(Boolean);
    const resource=parts.at(-2)==='admin-api'?parts.at(-1):parts.at(-1);

    if(req.method==='GET'&&resource==='me'){return reply({user_id:user.id,role});}
    if(req.method==='GET'&&resource==='overview'){
      requireSettingsAdmin(role);
      return reply(await getAdminOverview(client));
    }
    if(req.method==='GET'&&resource==='audit'){
      const entries=await listAudit(client,role);await record(true);return reply({entries});
    }
    if(req.method==='POST'&&resource==='invite'){
      requireSettingsAdmin(role);
      await enforceRateLimit(client,{scope:'email',value:`admin-invite:${user.id}`,windowSeconds:600,maxRequests:10,pepper:getEnv('RATE_LIMIT_PEPPER')||getEnv('SUPABASE_SERVICE_ROLE_KEY')!});
      const settings=await listSettings(client);
      if(!['test','production'].includes(settings.find((row:any)=>row.key==='email_delivery_mode')?.value))throw new InvitationError('E-post är avstängd. Aktivera e-post innan du skickar en inbjudan.');
      const body=await req.json();
      const result=await inviteStaff(client,{role,body});
      await record(true,result.user_id,{targetEmail:body.email,targetRole:result.role,severity:'medium',detailCode:'role_assigned'});return reply(result);
    }
    if(resource==='staff'){
      requireSettingsAdmin(role);
      if(req.method==='GET')return reply({users:await listStaff(client,{role,currentUserId:user.id})});
      const body=await req.json();
      if(req.method==='PATCH'){
        const result=await updateStaffRole(client,{role,currentUserId:user.id,body});
        await record(true,result.user_id,{targetEmail:result.email,targetRole:result.role,severity:'medium',detailCode:'role_changed'});return reply(result);
      }
      if(req.method==='DELETE'){
        const result=await removeStaff(client,{role,currentUserId:user.id,body});
        await record(true,result.user_id,{targetEmail:result.email,severity:'high',detailCode:'role_removed'});return reply(result);
      }
    }
    if(req.method==='POST'&&resource==='logout'){
      let detailCode='manual_logout';
      try { const body=await req.json(); if(['manual_logout','idle_timeout','session_expired'].includes(body?.reason))detailCode=body.reason; } catch { /* optional body */ }
      const token=req.headers.get('authorization')!.replace(/^Bearer /i,'');
      const {error}=await client.auth.admin.signOut(token,'local');
      if(error)throw new Error('Utloggningen kunde inte genomföras.');
      await record(true,null,{detailCode,severity:detailCode==='manual_logout'?'low':'medium'});return reply({signed_out:true});
    }
    if(req.method==='POST'&&resource==='test-mail'){
      requireSettingsAdmin(role);
      await enforceRateLimit(client,{scope:'email',value:`admin-test:${user.id}`,windowSeconds:600,maxRequests:5,pepper:getEnv('RATE_LIMIT_PEPPER')||getEnv('SUPABASE_SERVICE_ROLE_KEY')!});
      await record(null);
      const result=await deliverTestMail({role,body:await req.json(),rows:await listSettings(client),config:{apiKey:getEnv('RESEND_API_KEY'),from:getEnv('RECEIPT_EMAIL_FROM')}});
      await record(Boolean(result.sent));
      return reply(result,result.sent?200:502);
    }
    if(req.method==='GET'&&resource==='email-status'){
      requireSettingsAdmin(role);
      return reply(emailStatus(await listSettings(client), {apiKey:getEnv('RESEND_API_KEY'),from:getEnv('RECEIPT_EMAIL_FROM')}));
    }
    if(resource==='travel-rate' && ['GET','PATCH'].includes(req.method)){
      requireSettingsAdmin(role);
      if(req.method==='GET')return reply(await getTravelRate(client));
      const body=await req.json();
      if(!body || Object.keys(body).some(key=>key!=='rate_per_km'))throw new SettingValidationError('Endast milersättning får ändras här.');
      await record(null);
      const setting=await updateSetting(client,user.id,'travel_rate_per_km',body.rate_per_km,role);
      await record(true);return reply({rate_per_km:setting.value});
    }
    if(req.method==='GET'&&resource==='settings'){requireSettingsAdmin(role);return reply({settings:await listSettings(client),role});}
    if(req.method==='PATCH'&&resource==='settings'){
      const body=await req.json();
      if(!body?.key) return reply({error:'Nyckel saknas.'},400);
      requireSettingsAdmin(role);
      await record(null);
      const setting=await updateSetting(client,user.id,String(body.key),body.value,role);
      await record(true);return reply({setting});
    }
    if(req.method==='GET'&&resource==='submissions'){
      await purgeExpiredSubmissions(client);
      return reply({submissions:await listSubmissions(client,url.searchParams.get('status'))});
    }
    if(req.method==='GET'&&resource==='submission'){
      const id=url.searchParams.get('id');
      if(!id)return reply({error:'Id saknas.'},400);
      return reply({submission:await getSubmission(client,id)});
    }
    if(req.method==='PATCH'&&resource==='submission'){
      requireReceiptManager(role);
      const body=await req.json();
      if(!body?.id||!body?.status)return reply({error:'Id och status krävs.'},400);
      await record(null,String(body.id));
      const submission=await updateSubmissionStatus(client,user.id,String(body.id),String(body.status),body.note);
      await record(true,String(body.id));return reply({submission});
    }
    if(req.method==='PATCH'&&resource==='archive'){
      requireReceiptManager(role);
      const body=await req.json();
      if(!body?.id||typeof body.archived!=='boolean')return reply({error:'Id och arkivstatus krävs.'},400);
      await record(null,String(body.id));
      const submission=await archiveSubmission(client,user.id,String(body.id),body.archived);
      await record(true,String(body.id));return reply({submission});
    }
    if(req.method==='GET'&&resource==='pdf'){
      const id=url.searchParams.get('id');
      if(!id)return reply({error:'Id saknas.'},400);
      return reply({url:await createPdfLink(client,id)});
    }
    return reply({error:'Okänd admin-route.'},404);
  }catch(error){
    try{if(auditClient && auditUserId)await record(false,null,{severity:event==='permission-change'?'high':'medium'});}catch{console.error('admin-api audit write failed',requestId);}
    if(error instanceof Response)return withCors(error);
    if(error instanceof RateLimitError)return reply({error:route==='invite'?inviteRateLimitMessage(error.retryAfterSeconds):error.message},429);
    if(error instanceof InvitationError||error instanceof StaffManagementError||error instanceof MailValidationError||error instanceof SettingValidationError||error instanceof SubmissionValidationError)return reply({error:error.message},400);
    console.error('admin-api failed',requestId);
    return reply({error:'Adminbegäran kunde inte genomföras.'},500);
  }
};
}
