import {canAccessAdminRole} from './roles.js';
const deny = (status, error) => { throw new Response(JSON.stringify({error}), {status,headers:{'Content-Type':'application/json'}}); };
// The Auth server verifies the token; authorization comes from the current DB row.
export async function verifyStaff(req, client) {
  const match = /^Bearer (\S+)$/i.exec(req.headers.get('authorization') || '');
  if (!match) return deny(401,'Inloggning krävs.');
  const {data,error} = await client.auth.getUser(match[1]);
  if (error || !data.user) return deny(401,'Ogiltig eller utgången session.');
  const {data:staff,error:staffError} = await client.from('admin_users').select('role').eq('user_id',data.user.id).maybeSingle();
  if (staffError || !staff || !canAccessAdminRole(staff.role)) return deny(403,'Personalbehörighet krävs.');
  return {client,user:data.user,role:staff.role};
}
