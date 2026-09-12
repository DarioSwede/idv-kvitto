import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const source=await readFile(new URL('../supabase/functions/submit-receipt/index.ts',import.meta.url),'utf8');

test('PDF-sammanställningen visar fullständigt ärende-ID och en läsbar referens',()=>{
  assert.match(source,/submissionReference\(senderName, submittedAt, submission\.id\)/);
  assert.match(source,/drawRight\(submission\.id, 783, 7, muted\)/);
  assert.doesNotMatch(source,/shortSubmissionId/);
});

test('PDF-sammanställningen använder vita streckade informationsrutor',()=>{
  assert.match(source,/color: rgb\(1, 1, 1\), borderColor: brand/);
  assert.match(source,/borderDashArray: \[5, 4\]/);
  assert.match(source,/dashedBox\(38, 656, 519, 70\)/);
  assert.match(source,/dashedBox\(38, 550, 519, 88\)/);
});
