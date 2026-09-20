import {verifiedSession,SUPABASE_URL} from '../js/admin-auth.js';
import {requireSettingsAdmin} from '../supabase/functions/admin-api/roles.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditEntry,listAudit} from '../supabase/functions/admin-api/audit.js';
import {inviteStaff,INVITE_REDIRECT} from '../supabase/functions/admin-api/invitations.js';
import {loginStaff} from '../supabase/functions/admin-api/login.js';
import {invitationSession} from '../js/admin-invitation.js';
const uid='12345678-1234-1234-1234-123456789abc';
const requestId='12345678-1234-1234-1234-123456789abd';

test('audit uses bounded allowlisted fields, never body/credentials or untrusted IP',()=>{
  const req=new Request('https://example.org/admin-api/settings?token=secret',{method:'PATCH',headers:{authorization:'Bearer secret','x-forwarded-for':'1.2.3.4','cf-ipcountry':'SE','user-agent':'a'.repeat(500)},body:JSON.stringify({password:'secret',ip_address:'1.2.3.4'})});
  const entry=auditEntry(req,{event:'settings',userId:uid,success:true,requestId});
  assert.equal(entry.user_agent.length,300);assert.equal(entry.ip_address,null);assert.equal(entry.country,null);
  assert.equal(entry.user_id,uid);assert.equal(entry.request_id,requestId);
  assert.equal(JSON.stringify(entry).includes('secret'),false);
});
test('non-SU cannot fetch audit or invite even with forged body role',async()=>{
  for(const role of ['admin','viewer','cashier','tester',undefined]){
    await assert.rejects(listAudit({},role),e=>e.status===403);
    await assert.rejects(inviteStaff({},{role,body:{email:'test@example.org',role:'admin'}}),e=>e.status===403);
  }
});
test('invitation defaults to viewer, fixes callback and never overwrites membership',async()=>{
  let granted;
  const client={auth:{admin:{inviteUserByEmail:async(email,options)=>{
    assert.equal(email,'test@example.org');assert.equal(options.redirectTo,INVITE_REDIRECT);
    return {data:{user:{id:uid}}};
  }}},from:table=>{assert.equal(table,'admin_users');return {insert:async row=>{granted=row;return {};}};}};
  const result=await inviteStaff(client,{role:'superuser',body:{email:'TEST@example.org',redirectTo:'https://evil.example'}});
  assert.equal(result.invited,true);assert.deepEqual(granted,{user_id:uid,role:'viewer'});
});
test('invitation blocks invalid input and reports partial delivery without granting access',async()=>{
  for(const body of [{email:'invalid'},{email:'a@example.org',role:'owner'}])await assert.rejects(inviteStaff({},{role:'superuser',body}));
  const client={auth:{admin:{inviteUserByEmail:async()=>({data:{user:{id:uid}}})}},from:()=>({insert:async()=>({error:new Error('db unavailable')})})};
  await assert.rejects(inviteStaff(client,{role:'superuser',body:{email:'a@example.org'}}),/behörigheten kunde inte tilldelas/);
});
test('invitation callback removes tokens immediately and rejects non-invite sessions',()=>{
  let clean;
  const history={replaceState:(_a,_b,url)=>{clean=url;}};
  const location={pathname:'/admin-login.html',search:'',hash:'#type=invite&access_token=secret&refresh_token=refresh&expires_in=3600'};
  assert.equal(invitationSession(location,history).access_token,'secret');assert.equal(clean,'/admin-login.html');
  assert.throws(()=>invitationSession({...location,hash:'#type=recovery&access_token=secret'},history),/ogiltig/);
});
function loginDeps({badPassword=false,role='viewer',auditFails=false}={}){
  const events=[];const revoked=[];
  const client={rpc:async()=>({data:{allowed:true}}),auth:{getUser:async()=>({data:{user:{id:uid}}}),admin:{signOut:async token=>{revoked.push(token);return {};}}},from:table=>{
    if(table==='receipt_admin_audit')return {insert:async entry=>{events.push(entry);return {error:auditFails?new Error('failed'):null};}};
    return {select:()=>({eq:()=>({maybeSingle:async()=>({data:role?{role}:null})})})};
  }};
  const authClient={auth:{signInWithPassword:async()=>badPassword?{error:new Error('bad password')}:{data:{session:{access_token:'fake',refresh_token:'refresh'}}}}};
  return {client,authClient,pepper:'test',requestId,events,revoked};
}
const loginRequest=()=>new Request('https://example.org/admin-api/login',{method:'POST',body:JSON.stringify({email:'test@example.org',password:'never-log-me'})});
test('login only returns session after current membership and successful audit',async()=>{
  const deps=loginDeps();const session=await loginStaff(loginRequest(),deps);
  assert.equal(session.access_token,'fake');assert.equal(deps.events.at(-1).success,true);assert.equal(deps.events[0].event_type,'login');
  assert.equal(JSON.stringify(deps.events).includes('never-log-me'),false);
});
test('wrong password and removed membership fail closed and audit failure',async()=>{
  for(const config of [{badPassword:true},{role:null}]){
    const deps=loginDeps(config);await assert.rejects(loginStaff(loginRequest(),deps),e=>e.status===401);
    assert.equal(deps.events.at(-1).success,false);
    if(config.role===null)assert.deepEqual(deps.revoked,['fake']);
  }
});
test('unavailable audit never releases authenticated session',async()=>{
  const deps=loginDeps({auditFails:true});await assert.rejects(loginStaff(loginRequest(),deps));assert.deepEqual(deps.revoked,[]);
});

test('settings authorization rejects every non-SU role on the server',()=>{
  for(const role of ['admin','viewer','cashier','tester','owner',null,undefined])assert.throws(()=>requireSettingsAdmin(role),error=>error.status===403);
  assert.doesNotThrow(()=>requireSettingsAdmin('superuser'));
});

test('refreshed sessions retain expiry so a later refresh remains possible',async(t)=>{
  const data=new Map([
    ['idv-admin-connection',JSON.stringify({url:SUPABASE_URL,anonKey:'sb_publishable_test'})],
    ['idv-admin-session',JSON.stringify({access_token:'expired',refresh_token:'refresh',expires_at:1})]
  ]);
  const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  for(const key of ['localStorage','sessionStorage']){
    const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{value:storage,configurable:true});
    t.after(()=>{if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
  }
  let refreshes=0;
  const fetcher=async(url,options)=>{
    if(url.includes('grant_type=refresh_token')){refreshes++;return Response.json({access_token:'new-token',refresh_token:'new-refresh',expires_in:3600});}
    assert.equal(options.headers.Authorization,'Bearer new-token');return Response.json({role:'admin'});
  };
  const result=await verifiedSession(fetcher);
  assert.ok(result.session.expires_at>Math.floor(Date.now()/1000)+3500);
  assert.equal(refreshes,1);
  await verifiedSession(fetcher);assert.equal(refreshes,1);
  data.set('idv-admin-session',JSON.stringify({...result.session,expires_at:1}));
  await verifiedSession(fetcher);assert.equal(refreshes,2);
});
