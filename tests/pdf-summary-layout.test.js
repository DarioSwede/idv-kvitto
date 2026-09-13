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
  assert.match(source,/const dashedLine =/);
  assert.match(source,/summaryPage\.drawLine\(\{/);
  assert.match(source,/offset \+= 9/);
  assert.match(source,/Math\.min\(offset \+ 5, length\)/);
  assert.doesNotMatch(source,/borderDashArray/);
  assert.match(source,/dashedBox\(38, 656, 519, 70\)/);
  assert.match(source,/dashedBox\(38, 550, 519, 88\)/);
});
