import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminHandler} from '../supabase/functions/admin-api/handler.ts';
const uid='12345678-1234-1234-1234-123456789abc';
function fixture(role='superuser',{storageFails=false,rateLimited=false}={}) {
  const writes=[];
  const settings=[{key:'travel_rate_per_km',value:2.5},{key:'retention_days',value:365},{key:'email_delivery_mode',value:'disabled'}];
  const old={id:uid,archived_at:'2020-01-01T00:00:00Z',final_pdf_path:'final.pdf',receipt_files:[{storage_path:'receipt.jpg'}]};
  const rows=[old,{id:'recent',archived_at:new Date().toISOString()},{id:'active',archived_at:null}];
  const client={rpc:async()=>({data:{allowed:!rateLimited,retry_after_seconds:125},error:null}),storage:{from:()=>({remove:async paths=>{writes.push(['storage',paths]);return {error:storageFails?new Error('failed'):null};}})},from:table=>{
    let action='select',patch,key,cutoff,one=false,nonnull=false;
    const result=()=>{
      if(action!=='select') {
        writes.push([table,action,patch]);
        if(table==='app_settings') {const row=settings.find(row=>row.key===key);Object.assign(row,patch);return {data:row};}
        return {data:{id:uid,status:patch?.status}};
      }
      if(table==='app_settings')return {data:one?settings.find(row=>row.key===key):settings};
      if(table==='receipt_submissions')return {data:one?old:rows.filter(row=>(!nonnull||row.archived_at)&&(!cutoff||row.archived_at<cutoff))};
      return {data:[]};
    };
    const chain={select:()=>chain,order:()=>chain,limit:()=>chain,gte:()=>chain,is:()=>chain,
      not:()=>{nonnull=true;return chain;},lt:(_key,value)=>{cutoff=value;return chain;},
      eq:(_key,value)=>{key=value;return chain;},single:()=>{one=true;return Promise.resolve(result());},maybeSingle:()=>{one=true;return Promise.resolve(result());},
      insert:value=>{action='insert';patch=value;return chain;},update:value=>{action='update';patch=value;return chain;},delete:()=>{action='delete';return chain;},
      then:(resolve,reject)=>Promise.resolve(result()).then(resolve,reject)};
    return chain;
  }};
  const handler=createAdminHandler({serviceClient:()=>client,publicAuthClient:()=>({}),getEnv:()=>undefined,requireStaff:async req=>{
    if(!req.headers.get('authorization'))throw new Response('{}',{status:401});
    return {client,user:{id:uid},role};
  }});
  const request=(route,method='GET',body)=>handler(new Request(`https://example.test/admin-api/${route}`,{method,headers:{authorization:'Bearer fake','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}));
  return {request,writes,handler};
}
test('routine /me polling verifies identity without writing audit entries',async()=>{
  const {request,writes}=fixture();
  for(let index=0;index<110;index++)assert.equal((await request('me')).status,200);
  assert.deepEqual(writes,[]);
});
test('anonymous requests cannot read settings, receipts or travel rate',async()=>{
  const {handler,writes}=fixture();
  for(const route of ['settings','submissions','travel-rate','me'])assert.equal((await handler(new Request(`https://example.test/admin-api/${route}`))).status,401);
  assert.deepEqual(writes,[]);
});
for(const role of ['admin','cashier']) test(`${role} can handle receipts but cannot read or change settings`,async()=>{
  const {request,writes}=fixture(role);
  assert.equal((await request('travel-rate')).status,403);
  assert.equal((await request('travel-rate','PATCH',{rate_per_km:3})).status,403);
  assert.equal((await request('settings')).status,403);
  for(const key of ['email_delivery_mode','retention_days','travel_rate_per_km'])assert.equal((await request('settings','PATCH',{key,value:30})).status,403);
  assert.equal((await request('travel-rate','PATCH',{rate_per_km:3,key:'receipt_email_to'})).status,403);
  for(const route of ['audit','overview','email-status','invite','test-mail'])assert.equal((await request(route,['audit','overview','email-status'].includes(route)?'GET':'POST',['audit','overview','email-status'].includes(route)?null:{})).status,403);
  assert.equal((await request('submission','PATCH',{id:uid,status:'done'})).status,200);
  assert.equal((await request('archive','PATCH',{id:uid,archived:true})).status,200);
  assert.equal(writes.filter(([table])=>table==='app_settings').length,0);
});
for(const role of ['viewer','tester'])test(`${role} cannot mutate receipts or travel rate`,async()=>{
  const {request,writes}=fixture(role);
  for(const [route,method,body] of [['travel-rate','GET'],['travel-rate','PATCH',{rate_per_km:3}],['submission','PATCH',{id:uid,status:'done'}],['archive','PATCH',{id:uid,archived:true}],['settings','GET']])assert.equal((await request(route,method,body)).status,403);
  assert.equal(writes.some(([table])=>['app_settings','receipt_submissions'].includes(table)),false);
});
test('SU can read and update full settings, invalid mileage is rejected server-side',async()=>{
  const {request,writes}=fixture();
  assert.equal((await request('settings')).status,200);
  assert.equal((await request('settings','PATCH',{key:'retention_days',value:90})).status,200);
  assert.equal((await request('settings','PATCH',{key:'travel_rate_per_km',value:3})).status,200);
  for(const value of [0,-1,'3',null,1001])assert.equal((await request('travel-rate','PATCH',{rate_per_km:value})).status,400);
  assert.equal(writes.filter(([table])=>table==='app_settings').length,2);
});
test('listing receipts purges expired archives and both source files and PDF',async()=>{
  const {request,writes}=fixture();
  assert.equal((await request('submissions')).status,200);
  assert.deepEqual(writes,[['storage',['final.pdf','receipt.jpg']],['receipt_files','delete',undefined],['receipt_submissions','delete',undefined]]);
});
test('failed file removal retains database rows for retry',async()=>{
  const {request,writes}=fixture('superuser',{storageFails:true});
  assert.equal((await request('submissions')).status,500);
  assert.deepEqual(writes,[['storage',['final.pdf','receipt.jpg']]]);
});
test('invite throttling uses an invitation-specific message and a useful wait time',async()=>{
  const {request}=fixture('superuser',{rateLimited:true});
  const response=await request('invite','POST',{email:'new@example.org',role:'viewer'});
  assert.equal(response.status,429);
  assert.deepEqual(await response.json(),{error:'För många inbjudningsförsök. Försök igen om cirka 3 minuter.'});
});
