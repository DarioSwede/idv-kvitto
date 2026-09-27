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
    const status=identity.banned_until && new Date(identity.banned_until)>new Date()?'blocked'
      :identity.last_sign_in_at?'active':identity.email_confirmed_at?'confirmed':'invited';
    return {
      user_id:membership.user_id,email:identity.email||'E-post saknas',role:membership.role,
      created_at:membership.created_at,is_current:membership.user_id===currentUserId,
      status,last_sign_in_at:identity.last_sign_in_at||null
    };
  }));
  return users.sort((a,b)=>a.email.localeCompare(b.email,'sv'));
}

export async function updateStaffRole(client,{role,currentUserId,body}){
  requireSuperuser(role);
  const userId=requireTarget(body);
  if(userId===currentUserId)throw new StaffManagementError('Du kan inte ändra din egen behörighet.');
  if(!ADMIN_ROLES.has(body?.role))throw new StaffManagementError('Ogiltig behörighet.');
  const identity=await authIdentity(client,userId);
  await changeMembership(client,currentUserId,userId,body.role);
  return {user_id:userId,email:identity.email||'E-post saknas',role:body.role};
}

export async function removeStaff(client,{role,currentUserId,body}){
  requireSuperuser(role);
  const userId=requireTarget(body);
  if(userId===currentUserId)throw new StaffManagementError('Du kan inte ta bort din egen behörighet.');
  const identity=await authIdentity(client,userId);
  await changeMembership(client,currentUserId,userId,null);
  return {user_id:userId,email:identity.email||'E-post saknas',removed:true};
}

async function changeMembership(client,actorId,targetId,assignedRole){
  // Recheck the actor inside the same DB transaction as the write. A previous
  // requireStaff result may be stale after another SU revokes this actor.
  const {error}=await client.rpc('change_receipt_staff',{actor_id:actorId,target_id:targetId,assigned_role:assignedRole});
  if(error?.code==='42501')throw new Response(JSON.stringify({error:'SU-behörighet krävs.'}),{status:403});
  if(error?.code==='22023')throw new StaffManagementError('Ändringen nekades. Det egna kontot och sista SU skyddas; uppdatera användarlistan.');
  if(error)throw new StaffManagementError('Behörigheten kunde inte ändras.');
}
