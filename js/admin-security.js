// DOM-only presentation; every operation is authorized again by admin-api.
export function setupAdminSecurity({role,request}) {
  const panel=document.querySelector('#adminSecurityPanel');
  panel.hidden=role!=='admin';
  if(role!=='admin')return;
  const status=document.querySelector('#inviteStatus');
  document.querySelector('#inviteStaff').addEventListener('click',async event=>{
    const email=document.querySelector('#inviteEmail');
    if(!email.value||!email.reportValidity())return;
    event.currentTarget.disabled=true;
    status.textContent='Skickar inbjudan…';
    try{
      const result=await request('invite',{method:'POST',body:JSON.stringify({email:email.value.trim(),role:document.querySelector('#inviteRole').value})});
      status.textContent=result.invited?'Inbjudan skickad. Mottagaren väljer lösenord via länken i mejlet.':'Inbjudan kunde inte skickas.';
    }catch(error){status.textContent=error.message;}
    finally{document.querySelector('#inviteStaff').disabled=false;}
  });
  document.querySelector('#loadAudit').addEventListener('click',async event=>{
    event.currentTarget.disabled=true;
    const output=document.querySelector('#auditEntries');
    output.textContent='Hämtar säkerhetslogg…';
    try{
      const {entries}=await request('audit');
      const list=document.createElement('ul');
      for(const entry of entries){
        const item=document.createElement('li');
        item.textContent=`${entry.created_at} · ${entry.event_type} · ${entry.success===null?'Påbörjad':entry.success?'Lyckades':'Misslyckades'} · ${entry.user_id||'Ej identifierad'} · ${entry.request_id}`;
        list.append(item);
      }
      output.replaceChildren(entries.length?list:document.createTextNode('Inga händelser de senaste 90 dagarna.'));
    }catch(error){output.textContent=error.message;}
    finally{document.querySelector('#loadAudit').disabled=false;}
  });
}
