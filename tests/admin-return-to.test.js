import test from 'node:test';
import assert from 'node:assert/strict';
import {safeReturnTo} from '../js/admin-auth.js';
const base='https://example.org/idv/admin-login.html';
test('settings return links retain only exact allowlisted view fragments',()=>{
  for(const view of ['overview','users','settings','email','audit']){
    for(const path of ['admin-settings.html','admin.html?view=settings'])assert.equal(safeReturnTo(`${path}#${view}`,base),`https://example.org/idv/admin-settings.html#${view}`);
  }
  for(const hash of ['unknown','access_token=secret','audit&access_token=secret','%61udit','constructor','AUDIT'])assert.equal(safeReturnTo(`admin-settings.html?token=secret#${hash}`,base),'https://example.org/idv/admin-settings.html');
  assert.equal(safeReturnTo('https://evil.example/admin-settings.html#audit',base),'https://example.org/idv/admin.html');
});
