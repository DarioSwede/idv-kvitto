import {deliverTestMail, MailValidationError} from './test-mail.js';
import {enforceRateLimit, RateLimitError} from '../submit-receipt/rate-limit.js';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {emailStatus} from './email-status.js';
import {requireStaff,serviceClient,publicAuthClient} from './auth.ts';
import {requireSettingsAdmin} from './roles.js';
import {loginStaff} from './login.js';
import {writeAudit,listAudit} from './audit.js';
import {inviteStaff,InvitationError} from './invitations.js';
import {listSettings,updateSetting,SettingValidationError} from './settings.ts';
import {listSubmissions,getSubmission,updateSubmissionStatus,archiveSubmission,createPdfLink,SubmissionValidationError} from './submissions.ts';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, POST, PATCH, DELETE, OPTIONS',
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store'
};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
async function withCors(response:Response){
  const headers=new Headers(response.headers);
  Object.entries(cors).forEach(([key,value])=>headers.set(key,value));
  return new Response(await response.text(),{status:response.status,statusText:response.statusText,headers});
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  const requestId=crypto.randomUUID();
  let auditUserId:string|null=null;
  const url=new URL(req.url);
  const route=url.pathname.split('/').filter(Boolean).at(-1);
  const event=route==='me'?'access':route;
  const auditable=['access','test-mail','settings','submission','archive','invite','logout','audit'].includes(event||'');
  let auditClient:ReturnType<typeof serviceClient>|undefined;
  const record=async(success:boolean|null,targetId:string|null=null)=>{
    if(auditable && auditClient)await writeAudit(auditClient,req,{event,userId:auditUserId,success,requestId,targetId});
  };
  try{
    auditClient=serviceClient();
    if(req.method==='POST'&&route==='login'){
      const session=await loginStaff(req,{client:auditClient,authClient:publicAuthClient(),pepper:Deno.env.get('RATE_LIMIT_PEPPER')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,requestId});
      return reply(session);
    }
    const {client,user,role}=await requireStaff(req);
    auditUserId=user.id;
    const parts=url.pathname.split('/').filter(Boolean);
    const resource=parts.at(-2)==='admin-api'?parts.at(-1):parts.at(-1);

    if(req.method==='GET'&&resource==='me'){await record(true);return reply({user_id:user.id,role});}
    if(req.method==='GET'&&resource==='audit'){
      const entries=await listAudit(client,role);await record(true);return reply({entries});
    }
    if(req.method==='POST'&&resource==='invite'){
      if(role!=='admin')throw new Response(JSON.stringify({error:'Adminbehörighet krävs.'}),{status:403});
      await enforceRateLimit(client,{scope:'email',value:`admin-invite:${user.id}`,windowSeconds:3600,maxRequests:5,pepper:Deno.env.get('RATE_LIMIT_PEPPER')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!});
      const settings=await listSettings(client);
      if(!['test','production'].includes(settings.find((row:any)=>row.key==='email_delivery_mode')?.value))throw new InvitationError('E-post är avstängd. Aktivera e-post innan du skickar en inbjudan.');
      await record(null);
      const result=await inviteStaff(client,{role,body:await req.json()});
      await record(true,result.user_id);return reply(result);
    }
    if(req.method==='POST'&&resource==='logout'){
      const token=req.headers.get('authorization')!.replace(/^Bearer /i,'');
      await record(null);
      const {error}=await client.auth.admin.signOut(token,'local');
      if(error)throw new Error('Utloggningen kunde inte genomföras.');
      await record(true);return reply({signed_out:true});
    }
    if(req.method==='POST'&&resource==='test-mail'){
      if(role!=='admin')throw new Response(JSON.stringify({error:'Adminbehörighet krävs.'}),{status:403});
      await enforceRateLimit(client,{scope:'email',value:`admin-test:${user.id}`,windowSeconds:600,maxRequests:5,pepper:Deno.env.get('RATE_LIMIT_PEPPER')||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!});
      await record(null);
      const result=await deliverTestMail({role,body:await req.json(),rows:await listSettings(client),config:{apiKey:Deno.env.get('RESEND_API_KEY'),from:Deno.env.get('RECEIPT_EMAIL_FROM')}});
      await record(Boolean(result.sent));
      return reply(result,result.sent?200:502);
    }
    if(req.method==='GET'&&resource==='email-status'){
      return reply(emailStatus(await listSettings(client), {apiKey:Deno.env.get('RESEND_API_KEY'),from:Deno.env.get('RECEIPT_EMAIL_FROM')}));
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
      return reply({submissions:await listSubmissions(client,url.searchParams.get('status'))});
    }
    if(req.method==='GET'&&resource==='submission'){
      const id=url.searchParams.get('id');
      if(!id)return reply({error:'Id saknas.'},400);
      return reply({submission:await getSubmission(client,id)});
    }
    if(req.method==='PATCH'&&resource==='submission'){
      if(role!=='admin')throw new Response(JSON.stringify({error:'Adminbehörighet krävs för att ändra ett inskick.'}),{status:403});
      const body=await req.json();
      if(!body?.id||!body?.status)return reply({error:'Id och status krävs.'},400);
      await record(null,String(body.id));
      const submission=await updateSubmissionStatus(client,user.id,String(body.id),String(body.status),body.note);
      await record(true,String(body.id));return reply({submission});
    }
    if(req.method==='PATCH'&&resource==='archive'){
      if(role!=='admin')throw new Response(JSON.stringify({error:'Adminbehörighet krävs för att arkivera ett inskick.'}),{status:403});
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
    try{if(auditClient && auditUserId)await record(false);}catch{console.error('admin-api audit write failed',requestId);}
    if(error instanceof Response)return withCors(error);
    if(error instanceof RateLimitError)return reply({error:error.message},429);
    if(error instanceof InvitationError||error instanceof MailValidationError||error instanceof SettingValidationError||error instanceof SubmissionValidationError)return reply({error:error.message},400);
    console.error('admin-api failed',requestId);
    return reply({error:'Adminbegäran kunde inte genomföras.'},500);
  }
});
