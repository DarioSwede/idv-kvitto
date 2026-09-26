import test from 'node:test';
import assert from 'node:assert/strict';
import {getAdminOverview} from '../supabase/functions/admin-api/overview.js';

const uid='12345678-1234-1234-1234-123456789abc';
const chain=data=>{const value={data,error:null};const query={select:()=>query,eq:()=>query,order:()=>query,limit:()=>Promise.resolve(value)};return query;};

test('admin overview returns latest login email and only five compact submissions',async()=>{
  let authLookups=0;
  const submissions=Array.from({length:5},(_,index)=>({id:`case-${index}`,created_at:`2026-09-2${5-index}T10:00:00Z`,sender_email:`person${index}@example.org`,status:'new',is_test:index===0,bank_account:'never-return'}));
  const client={
    auth:{admin:{getUserById:async()=>{authLookups++;return {data:{user:{email:'admin@example.org'}},error:null};}}},
    from:table=>chain(table==='receipt_admin_audit'?[{created_at:'2026-09-25T12:00:00Z',user_id:uid,actor_email:null}]:submissions)
  };
  const result=await getAdminOverview(client);
  assert.deepEqual(result.latest_login,{created_at:'2026-09-25T12:00:00Z',email:'admin@example.org'});
  assert.equal(result.recent_submissions.length,5);
  assert.equal(JSON.stringify(result).includes('bank_account'),false);
  assert.equal(authLookups,1);
});

test('stored login email avoids an extra auth lookup',async()=>{
  const client={auth:{admin:{getUserById:async()=>{throw new Error('unexpected lookup');}}},from:table=>chain(table==='receipt_admin_audit'?[{created_at:'2026-09-25T12:00:00Z',user_id:uid,actor_email:'stored@example.org'}]:[])};
  assert.equal((await getAdminOverview(client)).latest_login.email,'stored@example.org');
});
