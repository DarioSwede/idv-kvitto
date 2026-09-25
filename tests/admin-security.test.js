import {verifiedSession,SUPABASE_URL} from '../js/admin-auth.js';
import {requireSettingsAdmin} from '../supabase/functions/admin-api/roles.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {auditEntry,listAudit} from '../supabase/functions/admin-api/audit.js';
import {inviteStaff,INVITE_REDIRECT} from '../supabase/functions/admin-api/invitations.js';
import {listStaff,updateStaffRole,removeStaff} from '../supabase/functions/admin-api/staff-management.js';
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
test('audit resolves only authentication identities, never receipt target ids',async()=>{
  const receiptId='22345678-1234-1234-1234-123456789abc';
  const lookedUp=[];
  const rows=[
    {created_at:'2026-09-23T12:00:00Z',event_type:'login',success:true,severity:'low',user_id:uid,target_id:null},
    {created_at:'2026-09-23T12:01:00Z',event_type:'receipt-submitted',success:true,severity:'low',user_id:null,target_id:receiptId},
  ];
  const client={
    auth:{admin:{getUserById:async id=>{lookedUp.push(id);return {data:{user:{email:'admin@example.org'}}};}}},
    from:()=>({select:()=>({gte:()=>({order:()=>({limit:async()=>({data:rows})})})})}),
  };
  await listAudit(client,'superuser');
  assert.deepEqual(lookedUp,[uid]);
});
test('invitation defaults to viewer, fixes callback and never overwrites membership',async()=>{
  let granted;
  const client={auth:{admin:{inviteUserByEmail:async(email,options)=>{
    assert.equal(email,'test@example.org');assert.equal(options.redirectTo,INVITE_REDIRECT);
    return {data:{user:{id:uid}}};
  }}},from:table=>{assert.equal(table,'admin_users');return {select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})}),insert:async row=>{granted=row;return {};}};}};
  const result=await inviteStaff(client,{role:'superuser',body:{email:'TEST@example.org',redirectTo:'https://evil.example'}});
  assert.equal(result.invited,true);assert.deepEqual(granted,{user_id:uid,role:'viewer'});
});
test('existing Auth user can receive app access without a second invitation',async()=>{
  let granted;
  const client={auth:{admin:{
    inviteUserByEmail:async()=>({data:{user:null},error:new Error('already registered')}),
    listUsers:async options=>{assert.deepEqual(options,{page:1,perPage:1000});return {data:{users:[{id:uid,email:'Existing@Example.org'}]},error:null};}
  }},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})}),insert:async row=>{granted=row;return {error:null};}})};
  const result=await inviteStaff(client,{role:'superuser',body:{email:'existing@example.org',role:'viewer'}});
  assert.deepEqual(result,{invited:false,existing:true,user_id:uid,role:'viewer'});
  assert.deepEqual(granted,{user_id:uid,role:'viewer'});
});
test('existing membership is never overwritten by the invitation flow',async()=>{
  const client={auth:{admin:{
    inviteUserByEmail:async()=>({data:{user:null},error:new Error('already registered')}),
    listUsers:async()=>({data:{users:[{id:uid,email:'existing@example.org'}]},error:null})
  }},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'admin'},error:null})})})})};
  await assert.rejects(inviteStaff(client,{role:'superuser',body:{email:'existing@example.org',role:'viewer'}}),/redan behörigheten admin/);
});
test('invitation blocks invalid input and reports partial delivery without granting access',async()=>{
  for(const body of [{email:'invalid'},{email:'a@example.org',role:'owner'}])await assert.rejects(inviteStaff({},{role:'superuser',body}));
  const client={auth:{admin:{inviteUserByEmail:async()=>({data:{user:{id:uid}}})}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})}),insert:async()=>({error:new Error('db unavailable')})})};
  await assert.rejects(inviteStaff(client,{role:'superuser',body:{email:'a@example.org'}}),/behörigheten kunde inte tilldelas/);
});
test('SU can list staff with server-resolved email addresses',async()=>{
  const client={
    auth:{admin:{getUserById:async id=>({data:{user:{id,email:id===uid?'z@example.org':'a@example.org'}},error:null})}},
    from:table=>{assert.equal(table,'admin_users');return {select:()=>({order:async()=>({data:[{user_id:uid,role:'superuser',created_at:'2026-09-01'},{user_id:requestId,role:'viewer',created_at:'2026-09-02'}],error:null})})};}
  };
  const users=await listStaff(client,{role:'superuser',currentUserId:uid});
  assert.deepEqual(users.map(user=>[user.email,user.role,user.is_current]),[['a@example.org','viewer',false],['z@example.org','superuser',true]]);
});
test('SU can change and remove another membership but never its own',async()=>{
  const target='22345678-1234-1234-1234-123456789abc';let changed;let removed;
  const client={
    auth:{admin:{getUserById:async()=>({data:{user:{email:'target@example.org'}},error:null})}},
    from:()=>({
      select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'viewer'},error:null})})}),
      update:value=>({eq:async()=>{changed=value;return {error:null};}}),
      delete:()=>({eq:()=>({select:()=>({maybeSingle:async()=>{removed=true;return {data:{user_id:target},error:null};}})})})
    })
  };
  assert.equal((await updateStaffRole(client,{role:'superuser',currentUserId:uid,body:{user_id:target,role:'cashier'}})).role,'cashier');
  assert.deepEqual(changed,{role:'cashier'});
  assert.equal((await removeStaff(client,{role:'superuser',currentUserId:uid,body:{user_id:target}})).removed,true);assert.equal(removed,true);
  await assert.rejects(updateStaffRole(client,{role:'superuser',currentUserId:uid,body:{user_id:uid,role:'viewer'}}),/egen behörighet/);
  await assert.rejects(removeStaff(client,{role:'superuser',currentUserId:uid,body:{user_id:uid}}),/egen behörighet/);
});
test('non-SU cannot list or modify staff',async()=>{
  for(const role of ['admin','viewer',undefined]){
    await assert.rejects(listStaff({},{role,currentUserId:uid}),error=>error.status===403);
    await assert.rejects(updateStaffRole({},{role,currentUserId:uid,body:{user_id:requestId,role:'viewer'}}),error=>error.status===403);
    await assert.rejects(removeStaff({},{role,currentUserId:uid,body:{user_id:requestId}}),error=>error.status===403);
  }
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
test('malformed login attempts are rate limited before audit insertion',async()=>{
  let inserts=0;
  const client={rpc:async()=>({data:{allowed:false,retry_after_seconds:60}}),from:()=>({insert:async()=>{inserts++;return {};}})};
  const req=new Request('https://example.org/admin-api/login',{method:'POST',body:JSON.stringify({email:'invalid',password:''})});
  await assert.rejects(loginStaff(req,{client,authClient:{},pepper:'test',requestId}));
  assert.equal(inserts,0);
});
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
  const deps=loginDeps({auditFails:true});await assert.rejects(loginStaff(loginRequest(),deps));assert.deepEqual(deps.revoked,['fake']);
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
