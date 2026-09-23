import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPresentation,compactAuditEntries} from '../js/admin-audit-view.js';

test('successful login is readable in Swedish and green',()=>{
  const view=auditPresentation({created_at:'2026-09-23T20:10:06Z',event_type:'login',success:true,severity:'low',actor_name:'Test Admin',actor_email:'admin@example.org'});
  assert.equal(view.label,'Inloggning');
  assert.equal(view.actor,'Test Admin · admin@example.org');
  assert.equal(view.status,'OK');
  assert.equal(view.severity,'low');
  assert.match(view.when,/2026/);
});

test('rate-limited login is presented as critical brute-force protection',()=>{
  const view=auditPresentation({created_at:'2026-09-23T20:10:06Z',event_type:'login',success:false,severity:'critical',actor_email:'attack@example.org',detail_code:'rate_limited'});
  assert.equal(view.status,'Kritiskt');
  assert.equal(view.outcome,'Misslyckades');
  assert.match(view.detail,/många misslyckade försök/);
});

test('permission and receipt events expose only useful human-readable context',()=>{
  const permission=auditPresentation({created_at:'2026-09-23T20:10:06Z',event_type:'permission-change',success:true,severity:'medium',actor_email:'su@example.org',target_email:'new@example.org',target_role:'cashier',detail_code:'role_assigned'});
  assert.equal(permission.label,'Behörighet tilldelad');
  assert.equal(permission.target,'new@example.org · Kassör');
  const receipt=auditPresentation({created_at:'2026-09-23T20:10:06Z',event_type:'receipt-submitted',success:true,severity:'low',actor_name:'Demo Person',actor_email:'demo@example.org',detail_code:'receipt_received'});
  assert.equal(receipt.label,'Nytt underlag inskickat');
  assert.equal(receipt.actor,'Demo Person · demo@example.org');
});

test('legacy started rows are hidden when the same request has a final result',()=>{
  const rows=compactAuditEntries([{request_id:'same',success:null},{request_id:'same',success:true},{request_id:'other',success:null}]);
  assert.deepEqual(rows.map(row=>row.success),[true,null]);
});
