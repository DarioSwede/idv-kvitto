import {validEmail} from '../submit-receipt/email-config.js';
export class InvitationError extends Error {}
export const INVITE_REDIRECT = 'https://darioswede.github.io/idv-kvitto/admin-login.html';

export async function inviteStaff(client, {role, body}) {
  if (role !== 'admin') throw new Response(JSON.stringify({error:'Adminbehörighet krävs.'}), {status:403});
  if (!validEmail(body?.email)) throw new InvitationError('Ange en giltig e-postadress.');
  const assignedRole = body.role || 'viewer';
  if (!['viewer','cashier','tester','admin'].includes(assignedRole)) throw new InvitationError('Ogiltig roll.');
  const email = body.email.trim().toLowerCase();
  // Auth owns email verification. Never overwrite an existing membership or use user_metadata for access.
  const {data,error} = await client.auth.admin.inviteUserByEmail(email, {redirectTo:INVITE_REDIRECT});
  if (error || !data?.user?.id) throw new InvitationError('Inbjudan kunde inte skickas. Kontot kan redan finnas; kontrollera användaren i Supabase.');
  const {error:membershipError} = await client.from('admin_users').insert({user_id:data.user.id,role:assignedRole});
  if (membershipError) throw new InvitationError('Inbjudan skickades men behörigheten kunde inte tilldelas. Kontrollera kontot innan du försöker igen.');
  return {invited:true,user_id:data.user.id,role:assignedRole};
}
