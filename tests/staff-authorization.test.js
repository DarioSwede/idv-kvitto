import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyStaff} from '../supabase/functions/admin-api/staff.js';
const req = header => new Request('https://example.org/admin-api/me',{headers:header?{authorization:header}:{}});
function client({role='viewer',authError=null,staffError=null}={}){
  return {auth:{getUser:async token=>{assert.equal(token,'fake');return {data:{user:{id:'verified-user',user_metadata:{role:'admin'}}},error:authError};}},from:table=>{
    assert.equal(table,'admin_users');return {select:()=>({eq:(column,value)=>{assert.equal(column,'user_id');assert.equal(value,'verified-user');return {maybeSingle:async()=>({data:role?{role}:null,error:staffError})};}})};
  }};
}
test('server auth rejects missing and malformed bearer tokens before DB access',async()=>{
  for(const header of [undefined,'Basic fake','fake','Bearer a b']) await assert.rejects(verifyStaff(req(header),{}),error=>error.status===401);
});
test('invalid token and removed membership deny access regardless of user metadata',async()=>{
  await assert.rejects(verifyStaff(req('Bearer fake'),client({authError:Error('expired')})),error=>error.status===401);
  for(const config of [{role:null},{role:'owner'},{staffError:Error('unavailable')}]) await assert.rejects(verifyStaff(req('Bearer fake'),client(config)),error=>error.status===403);
});
test('user editable metadata cannot elevate DB role',async()=>{
  assert.equal((await verifyStaff(req('Bearer fake'),client())).role,'viewer');
});
