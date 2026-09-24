import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const templateUrl=new URL('../supabase/templates/invite.html',import.meta.url);

test('invitation template is Swedish, accessible and keeps the secure confirmation link',async()=>{
  const html=await readFile(templateUrl,'utf8');
  assert.match(html,/<html lang="sv" dir="ltr">/);
  assert.match(html,/<title>Du är inbjuden till Kvittoadministrationen<\/title>/);
  assert.match(html,/href="\{\{ \.ConfirmationURL \}\}"/);
  assert.match(html,/Aktivera konto och välj lösenord/);
  assert.match(html,/role="presentation"/);
  assert.match(html,/>Idrottsveteranerna<\/p>/);
  assert.match(html,/<meta name="color-scheme" content="light">/);
  assert.match(html,/<meta name="supported-color-schemes" content="light">/);
  assert.match(html,/<body bgcolor="#f5f4ed"/);
  assert.match(html,/width="600" bgcolor="#ffffff"/);
  assert.doesNotMatch(html,/content="light dark"/);
  assert.doesNotMatch(html,/<img\b|https?:\/\//i);
  assert.doesNotMatch(html,/\.Data|\.Email|unsubscribe|opt out/i);
});
