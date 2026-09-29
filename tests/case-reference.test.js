import test from 'node:test';
import assert from 'node:assert/strict';
import {caseReference} from '../js/case-reference.js';
test('permanent case references survive sorting and support more than 9999 cases',()=>{
  const cases=[{id:'a',caseNumber:'2026-0042'},{id:'b',caseNumber:'2027-10001'}];
  assert.deepEqual(cases.map(caseReference),['2026-0042','2027-10001']);
  assert.deepEqual(cases.reverse().map(caseReference),['2027-10001','2026-0042']);
});
test('older backends fall back to a shortened UUID without inventing a case number',()=>{
  assert.equal(caseReference({id:'12345678-1234-1234-1234-123456789abc'}),'12345678...9abc');
  assert.equal(caseReference({id:'test',caseNumber:'<invalid>'}),'test');
});
