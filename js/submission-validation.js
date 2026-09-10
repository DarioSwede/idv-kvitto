import {isValidEmailAddress} from './contact-validation.js';

export function validateSubmissionDetails({name='',email='',eventTag='',bank={},travel={valid:true},photos=[],submissionMode='receipts'}={}){
  const resolvedEventTag=eventTag||globalThis.document?.getElementById('event')?.value||'';
  if(submissionMode!=='travel'){
    if(!photos.length)return{valid:false,message:'Lägg till minst ett kvitto.'};
    if(photos.length>10)return{valid:false,message:'Du kan skicka högst 10 kvitton åt gången.'};
    if(photos.some(photo=>!String(photo.name||'').trim()))return{valid:false,message:'Ange vad varje kvitto gäller.'};
    if(photos.some(photo=>!Number.isFinite(Number(photo.amount))||Number(photo.amount)<=0))return{valid:false,message:'Ange ett belopp större än 0 för varje kvitto.'};
  }
  if(!String(name).trim())return{valid:false,message:'Fyll i ditt namn.'};
  if(!isValidEmailAddress(email))return{valid:false,message:'E-postadressen ser inte korrekt ut.'};
  if(submissionMode!=='receipts'&&!String(resolvedEventTag).trim())return{valid:false,message:'Beskriv kort vad resan avsåg.'};
  if(!bank.valid)return{valid:false,message:bank.message||'Fyll i clearing- och kontonummer.'};
  if(!travel.valid)return{valid:false,message:'Fyll i antalet kilometer och godkänn det föreslagna reseersättningsbeloppet.'};
  return{valid:true,message:''};
}
