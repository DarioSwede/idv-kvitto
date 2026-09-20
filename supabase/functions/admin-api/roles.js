export const ADMIN_ROLES = new Set(['superuser', 'admin', 'cashier', 'tester', 'viewer']);
export const canAccessAdminRole = role => typeof role === 'string' && ADMIN_ROLES.has(role);
export const canManageReceipts = role => ['superuser','admin','cashier'].includes(role);
export function requireSettingsAdmin(role) {
  if (role !== 'superuser') throw new Response(JSON.stringify({error:'SU-behörighet krävs för inställningar.'}), {status:403,headers:{'Content-Type':'application/json'}});
}
export function requireReceiptManager(role) {
  if (!canManageReceipts(role)) throw new Response(JSON.stringify({error:'Behörighet som SU, admin eller kassör krävs.'}), {status:403});
}
