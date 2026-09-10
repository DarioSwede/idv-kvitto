import test from 'node:test';
import assert from 'node:assert/strict';

import { canAccessAdminRole, ADMIN_ROLES } from '../supabase/functions/admin-api/roles.js';

test('supports cashier and tester roles', () => {
  assert.equal(canAccessAdminRole('admin'), true);
  assert.equal(canAccessAdminRole('cashier'), true);
  assert.equal(canAccessAdminRole('tester'), true);
  assert.equal(canAccessAdminRole('viewer'), true);
  assert.equal(canAccessAdminRole('guest'), false);
});

test('lists the allowed admin roles', () => {
  assert.deepEqual([...ADMIN_ROLES].sort(), ['admin', 'cashier', 'tester', 'viewer']);
});
