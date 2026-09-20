export const ADMIN_ROLES = new Set(['admin', 'cashier', 'tester', 'viewer']);

export function canAccessAdminRole(role) {
  return typeof role === 'string' && ADMIN_ROLES.has(role);
}

export function requireSettingsAdmin(role) {
  if (role !== 'admin') throw new Response(JSON.stringify({error:'Adminbehörighet krävs för inställningar.'}), {status:403,headers:{'Content-Type':'application/json'}});
}
