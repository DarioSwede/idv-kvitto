import {validEmail} from '../submit-receipt/email-config.js';
export class InvitationError extends Error {}
export const INVITE_REDIRECT = 'https://darioswede.github.io/idv-kvitto/admin-login.html';

async function existingAuthUser(client, email) {
  const {data,error}=await client.auth.admin.listUsers({page:1,perPage:1000});
  if(error) throw new InvitationError('Användarkontot kunde inte kontrolleras. Försök igen senare.');
  return data?.users?.find(user=>user.email?.trim().toLowerCase()===email) || null;
}

export async function inviteStaff(client, {role, body}) {
  if (role !== 'superuser') throw new Response(JSON.stringify({error:'SU-behörighet krävs.'}), {status:403});
  if (!validEmail(body?.email)) throw new InvitationError('Ange en giltig e-postadress.');
  const assignedRole = body.role || 'viewer';
  if (!['viewer','cashier','tester','admin','superuser'].includes(assignedRole)) throw new InvitationError('Ogiltig roll.');
  const email = body.email.trim().toLowerCase();
  // Auth owns email verification. Existing Auth users may be granted app access without a second invite.
  const {data,error} = await client.auth.admin.inviteUserByEmail(email, {redirectTo:INVITE_REDIRECT});
  const invitedUser = !error && data?.user?.id ? data.user : null;
  const user = invitedUser || await existingAuthUser(client,email);
  if (!user?.id) throw new InvitationError('Inbjudan kunde inte skickas. Försök igen senare.');
  const membershipQuery=client.from('admin_users').select('role').eq('user_id',user.id).maybeSingle();
  const {data:membership,error:membershipLookupError}=await membershipQuery;
  if(membershipLookupError)throw new InvitationError('Användarens behörighet kunde inte kontrolleras. Försök igen senare.');
  if(membership){
    if(membership.role===assignedRole)return {invited:false,existing:true,already_member:true,user_id:user.id,role:assignedRole};
    throw new InvitationError(`Användaren har redan behörigheten ${membership.role}. Befintlig behörighet ändras inte automatiskt.`);
  }
  const {error:membershipError} = await client.from('admin_users').insert({user_id:user.id,role:assignedRole});
  if (membershipError) throw new InvitationError('Inbjudan skickades men behörigheten kunde inte tilldelas. Kontrollera kontot innan du försöker igen.');
  return {invited:Boolean(invitedUser),existing:!invitedUser,user_id:user.id,role:assignedRole};
}
