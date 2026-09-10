import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {requireStaff} from './auth.ts';
import {listSettings,updateSetting,SettingValidationError} from './settings.ts';
import {listSubmissions,getSubmission,updateSubmissionStatus,archiveSubmission,createPdfLink,purgeExpiredSubmissions,SubmissionValidationError} from './submissions.ts';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, PATCH, DELETE, OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
async function withCors(response:Response){
  const headers=new Headers(response.headers);
  Object.entries(cors).forEach(([key,value])=>headers.set(key,value));
  return new Response(await response.text(),{status:response.status,statusText:response.statusText,headers});
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  try{
    const {client,user,role}=await requireStaff(req);
    const url=new URL(req.url);
    const parts=url.pathname.split('/').filter(Boolean);
    const resource=parts.at(-2)==='admin-api'?parts.at(-1):parts.at(-1);

    if(req.method==='GET'&&resource==='settings')return reply({settings:await listSettings(client)});
    if(req.method==='PATCH'&&resource==='settings'){
      const body=await req.json();
      if(!body?.key) return reply({error:'Nyckel saknas.'},400);
      if(role !== 'admin' && role !== 'tester' && role !== 'cashier')return reply({error:'Behörighet krävs för att ändra inställningar.'},403);
      return reply({setting:await updateSetting(client,user.id,String(body.key),body.value,role)});
    }
    if(req.method==='GET'&&resource==='submissions'){
      const retention=await purgeExpiredSubmissions(client);
      return reply({submissions:await listSubmissions(client,url.searchParams.get('status')),retention});
    }
    if(req.method==='GET'&&resource==='submission'){
      const id=url.searchParams.get('id');
      if(!id)return reply({error:'Id saknas.'},400);
      return reply({submission:await getSubmission(client,id)});
    }
    if(req.method==='PATCH'&&resource==='submission'){
      if(role!=='admin')return reply({error:'Adminbehörighet krävs för att ändra ett inskick.'},403);
      const body=await req.json();
      if(!body?.id||!body?.status)return reply({error:'Id och status krävs.'},400);
      return reply({submission:await updateSubmissionStatus(client,user.id,String(body.id),String(body.status),body.note)});
    }
    if(req.method==='PATCH'&&resource==='archive'){
      if(role!=='admin')return reply({error:'Adminbehörighet krävs för att arkivera ett inskick.'},403);
      const body=await req.json();
      if(!body?.id||typeof body.archived!=='boolean')return reply({error:'Id och arkivstatus krävs.'},400);
      return reply({submission:await archiveSubmission(client,user.id,String(body.id),body.archived)});
    }
    if(req.method==='GET'&&resource==='pdf'){
      const id=url.searchParams.get('id');
      if(!id)return reply({error:'Id saknas.'},400);
      return reply({url:await createPdfLink(client,id)});
    }
    return reply({error:'Okänd admin-route.'},404);
  }catch(error){
    if(error instanceof Response)return withCors(error);
    if(error instanceof SettingValidationError||error instanceof SubmissionValidationError)return reply({error:error.message},400);
    console.error('admin-api failed',error);
    return reply({error:'Adminbegäran kunde inte genomföras.'},500);
  }
});
