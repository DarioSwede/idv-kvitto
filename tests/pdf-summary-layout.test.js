import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const source=await readFile(new URL('../supabase/functions/submit-receipt/index.ts',import.meta.url),'utf8');

test('PDF-sammanställningen visar fullständigt ärende-ID och en läsbar referens',()=>{
  assert.match(source,/submissionReference\(senderName, submittedAt, submission\.id\)/);
  assert.match(source,/const drawTrace =/);
  assert.match(source,/\[submission\.id, top - 32, 7, muted\]/);
  assert.match(source,/stamp = \(page: any\) => \{ drawWatermark\(page\); drawTrace\(page\);/);
  assert.doesNotMatch(source,/shortSubmissionId/);
});

test('PDF-sammanställningen visar fullständiga betalningsuppgifter',()=>{
  assert.match(source,/Clearingnummer \$\{clearingNumber\} · Kontonummer \$\{accountNumber\}/);
  assert.doesNotMatch(source,/Konto \$\{maskAccountNumber\(accountNumber\)\}/);
});

test('PDF-bakgrundslogotypen kan stängas av och justeras',()=>{
  assert.match(source,/pdfWatermarkEnabled: true/);
  assert.match(source,/pdfWatermarkOpacity: 0\.04/);
  assert.match(source,/if \(!logo \|\| !settings\.pdfWatermarkEnabled\) return/);
  assert.match(source,/opacity: settings\.pdfWatermarkOpacity/);
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
