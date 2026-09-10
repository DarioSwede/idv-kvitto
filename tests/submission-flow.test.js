import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSubmissionFormData} from '../js/submission-flow.js';

test('uses the visible travel purpose as backend travel description',async()=>{
  const form=await buildSubmissionFormData({
    submissionMode:'travel',name:'Resenär',email:'resa@example.se',eventTag:'Tur och retur till samlingen',
    bank:{clearingNumber:'5000',accountNumber:'1234567'},
    travel:{enabled:true,approved:true,km:20,amount:50,description:''},photos:[]
  });
  assert.equal(form.get('travel_description'),'Tur och retur till samlingen');
  assert.equal(form.get('submission_mode'),'travel');
  assert.equal(form.has('receipts'),false);
});
