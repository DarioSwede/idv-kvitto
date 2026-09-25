import {ADMIN_ROLES} from './roles.js';

export class StaffManagementError extends Error {}

const requireSuperuser = role => {
  if (role !== 'superuser') throw new Response(JSON.stringify({error:'SU-behörighet krävs.'}), {status:403});
};

const requireTarget = body => {
  const userId=typeof body?.user_id==='string' ? body.user_id.trim() : '';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))throw new StaffManagementError('Ogiltigt användarkonto.');
  return userId;
};

async function authIdentity(client,userId){
  const {data,error}=await client.auth.admin.getUserById(userId);
  if(error||!data?.user)throw new StaffManagementError('Användarkontot kunde inte hämtas.');
  return data.user;
}

export async function listStaff(client,{role,currentUserId}){
  requireSuperuser(role);
  const {data,error}=await client.from('admin_users').select('user_id,role,created_at').order('created_at',{ascending:true});
  if(error)throw new StaffManagementError('Användarlistan kunde inte hämtas.');
  const users=await Promise.all((data||[]).map(async membership=>{
    const identity=await authIdentity(client,membership.user_id);
    return {user_id:membership.user_id,email:identity.email||'E-post saknas',role:membership.role,created_at:membership.created_at,is_current:membership.user_id===currentUserId};
  }));
  return users.sort((a,b)=>a.email.localeCompare(b.email,'sv'));
}

export async function updateStaffRole(client,{role,currentUserId,body}){
  requireSuperuser(role);
  const userId=requireTarget(body);
  if(userId===currentUserId)throw new StaffManagementError('Du kan inte ändra din egen behörighet.');
  if(!ADMIN_ROLES.has(body?.role))throw new StaffManagementError('Ogiltig behörighet.');
  const {data:membership,error:lookupError}=await client.from('admin_users').select('role').eq('user_id',userId).maybeSingle();
  if(lookupError||!membership)throw new StaffManagementError('Användaren har ingen behörighet att ändra.');
  const identity=await authIdentity(client,userId);
  if(membership.role===body.role)return {user_id:userId,email:identity.email||'E-post saknas',role:membership.role,unchanged:true};
  const {error}=await client.from('admin_users').update({role:body.role}).eq('user_id',userId);
  if(error)throw new StaffManagementError('Behörigheten kunde inte ändras.');
  return {user_id:userId,email:identity.email||'E-post saknas',role:body.role};
}

export async function removeStaff(client,{role,currentUserId,body}){
  requireSuperuser(role);
  const userId=requireTarget(body);
  if(userId===currentUserId)throw new StaffManagementError('Du kan inte ta bort din egen behörighet.');
  const identity=await authIdentity(client,userId);
  const {data,error}=await client.from('admin_users').delete().eq('user_id',userId).select('user_id').maybeSingle();
  if(error)throw new StaffManagementError('Behörigheten kunde inte tas bort.');
  if(!data)throw new StaffManagementError('Användaren har redan saknat behörighet.');
  return {user_id:userId,email:identity.email||'E-post saknas',removed:true};
}
