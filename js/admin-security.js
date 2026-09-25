// DOM-only presentation; every operation is authorized again by admin-api.
import {renderAuditEntries} from './admin-audit-view.js';

const ROLES=[['viewer','Läsbehörighet'],['cashier','Kassör'],['tester','Drift/test'],['admin','Administratör'],['superuser','Superuser (SU)']];

function staffRow(user,{request,reload,status}){
  const row=document.createElement('div');row.className='staff-row';row.dataset.userId=user.user_id;
  const identity=document.createElement('div');identity.className='staff-identity';
  const email=document.createElement('strong');email.textContent=user.email;
  const meta=document.createElement('span');meta.textContent=user.is_current?'Ditt konto':'Tillagd användare';
  identity.append(email,meta);
  const select=document.createElement('select');select.setAttribute('aria-label',`Behörighet för ${user.email}`);
  for(const [value,label] of ROLES){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
  select.value=user.role;select.disabled=user.is_current;
  const save=document.createElement('button');save.type='button';save.className='button secondary';save.textContent='Spara behörighet';save.disabled=user.is_current;
  save.addEventListener('click',async()=>{
    save.disabled=true;status.textContent=`Sparar behörighet för ${user.email}…`;
    try{await request('staff',{method:'PATCH',body:JSON.stringify({user_id:user.user_id,role:select.value})});status.textContent=`Behörigheten för ${user.email} har ändrats.`;await reload();}
    catch(error){status.textContent=error.message;save.disabled=false;}
  });
  const remove=document.createElement('button');remove.type='button';remove.className='button danger';remove.textContent='Ta bort åtkomst';remove.disabled=user.is_current;
  remove.addEventListener('click',async()=>{
    if(!confirm(`Ta bort ${user.email} från kvittoadministrationen? Inloggningskontot finns kvar.`))return;
    remove.disabled=true;status.textContent=`Tar bort åtkomsten för ${user.email}…`;
    try{await request('staff',{method:'DELETE',body:JSON.stringify({user_id:user.user_id})});status.textContent=`Åtkomsten för ${user.email} har tagits bort.`;await reload();}
    catch(error){status.textContent=error.message;remove.disabled=false;}
  });
  const actions=document.createElement('div');actions.className='staff-actions';actions.append(select,save,remove);
  row.append(identity,actions);return row;
}

export function setupAdminSecurity({role,request}) {
  const panel=document.querySelector('#adminSecurityPanel');
  panel.hidden=role!=='superuser';
  if(role!=='superuser')return;
  const status=document.querySelector('#inviteStatus');
  const staffStatus=document.querySelector('#staffStatus');
  const staffList=document.querySelector('#staffList');
  const loadStaff=async()=>{
    document.querySelector('#refreshStaff').disabled=true;staffStatus.textContent='Hämtar användare…';
    try{const {users}=await request('staff');staffList.replaceChildren(...users.map(user=>staffRow(user,{request,reload:loadStaff,status:staffStatus})));staffStatus.textContent=users.length?`${users.length} användare har åtkomst.`:'Inga användare har åtkomst.';}
    catch(error){staffList.replaceChildren();staffStatus.textContent=error.message;}
    finally{document.querySelector('#refreshStaff').disabled=false;}
  };
  document.querySelector('#refreshStaff').addEventListener('click',loadStaff);
  loadStaff();
  document.querySelector('#inviteStaff').addEventListener('click',async event=>{
    const email=document.querySelector('#inviteEmail');
    if(!email.value||!email.reportValidity())return;
    event.currentTarget.disabled=true;
    status.textContent='Skickar inbjudan…';
    try{
      const result=await request('invite',{method:'POST',body:JSON.stringify({email:email.value.trim(),role:document.querySelector('#inviteRole').value})});
      if(result.invited)status.textContent='Inbjudan skickad. Mottagaren väljer lösenord via länken i mejlet.';
      else if(result.already_member)status.textContent='Användaren har redan den valda behörigheten.';
      else if(result.existing)status.textContent='Användaren fanns redan och den valda behörigheten har lagts till.';
      else status.textContent='Inbjudan kunde inte skickas.';
      await loadStaff();
    }catch(error){status.textContent=error.message;}
    finally{document.querySelector('#inviteStaff').disabled=false;}
  });
  document.querySelector('#loadAudit').addEventListener('click',async event=>{
    event.currentTarget.disabled=true;
    const output=document.querySelector('#auditEntries');
    output.textContent='Hämtar säkerhetslogg…';
    try{
      const {entries}=await request('audit');
      output.replaceChildren(entries.length?renderAuditEntries(entries):document.createTextNode('Inga händelser de senaste 90 dagarna.'));
    }catch(error){output.textContent=error.message;}
    finally{document.querySelector('#loadAudit').disabled=false;}
  });
}
