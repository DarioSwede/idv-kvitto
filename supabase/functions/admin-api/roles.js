export const ADMIN_ROLES = new Set(['admin', 'cashier', 'tester', 'viewer']);

export function canAccessAdminRole(role) {
  return typeof role === 'string' && ADMIN_ROLES.has(role);
}
