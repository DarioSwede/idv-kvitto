import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {requireAdmin} from './auth.ts';
import {listSettings,updateSetting} from './settings.ts';
import {listSubmissions,getSubmission,updateSubmissionStatus,createPdfLink} from './submissions.ts';

const cors={
  'Access-Control-Allow-Origin':'https://darioswede.github.io',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, PATCH, OPTIONS',
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
    const {client,user}=await requireAdmin(req);
    const url=new URL(req.url);
    const parts=url.pathname.split('/').filter(Boolean);
    const resource=parts.at(-2)==='admin-api'?parts.at(-1):parts.at(-1);

    if(req.method==='GET'&&resource==='settings')return reply({settings:await listSettings(client)});
    if(req.method==='PATCH'&&resource==='settings'){
      const body=await req.json();
      if(!body?.key) return reply({error:'Nyckel saknas.'},400);
      return reply({setting:await updateSetting(client,user.id,String(body.key),body.value)});
    }
    if(req.method==='GET'&&resource==='submissions')return reply({submissions:await listSubmissions(client,url.searchParams.get('status'))});
    if(req.method==='GET'&&resource==='submission'){
      const id=url.searchParams.get('id');
      if(!id)return reply({error:'Id saknas.'},400);
      return reply({submission:await getSubmission(client,id)});
    }
    if(req.method==='PATCH'&&resource==='submission'){
      const body=await req.json();
      if(!body?.id||!body?.status)return reply({error:'Id och status krävs.'},400);
      return reply({submission:await updateSubmissionStatus(client,user.id,String(body.id),String(body.status),body.note)});
    }
    if(req.method==='GET'&&resource==='pdf'){
      const id=url.searchParams.get('id');
      if(!id)return reply({error:'Id saknas.'},400);
      return reply({url:await createPdfLink(client,id)});
    }
    return reply({error:'Okänd admin-route.'},404);
  }catch(error){
    if(error instanceof Response)return withCors(error);
    console.error('admin-api failed',error);
    return reply({error:'Adminbegäran kunde inte genomföras.'},500);
  }
});
