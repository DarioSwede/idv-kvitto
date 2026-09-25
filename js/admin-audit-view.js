const LABELS={
  login:'Inloggning', access:'Behörighetskontroll', 'test-mail':'Testmail', settings:'Inställning ändrad',
  submission:'Ärende öppnat', archive:'Ärende arkiverat', invite:'Inbjudan skickad',
  'permission-change':'Behörighet tilldelad', logout:'Utloggning', audit:'Säkerhetsloggen öppnad',
  'receipt-submitted':'Nytt underlag inskickat'
};
const DETAILS={
  invalid_credentials:'Felaktiga inloggningsuppgifter eller saknad behörighet',
  rate_limited:'Blockerat efter många misslyckade försök', manual_logout:'Manuell utloggning',
  idle_timeout:'Automatisk utloggning efter inaktivitet', session_expired:'Sessionen upphörde',
  invitation_sent:'Inbjudan skickad', role_assigned:'Ny behörighet tilldelad', role_changed:'Behörighet ändrad',
  role_removed:'Behörighet borttagen', receipt_received:'Underlaget togs emot'
};
const STATUS={low:'OK',medium:'Observera',high:'Varning',critical:'Kritiskt'};
const ROLES={superuser:'Superuser (SU)',admin:'Administratör',cashier:'Kassör',tester:'Drift/test',viewer:'Läsbehörighet'};

export function auditPresentation(entry,locale='sv-SE'){
  const when=new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'medium',timeZone:'Europe/Stockholm'}).format(new Date(entry.created_at));
  const subject=[entry.subject_name,entry.subject_email].filter(Boolean).join(' · ');
  const actor=[entry.actor_name,entry.actor_email].filter(Boolean).join(' · ') || (subject ? '' : 'E-postadress saknas');
  const target=[entry.target_email,entry.target_role ? ROLES[entry.target_role]||entry.target_role : null].filter(Boolean).join(' · ');
  const outcome=entry.success===null?'Påbörjad':entry.success?'Lyckades':'Misslyckades';
  const severity=['low','medium','high','critical'].includes(entry.severity)?entry.severity:(entry.event_type==='login'&&entry.success===false?'high':'low');
  return {when,actor,subject,target,outcome,severity,status:STATUS[severity],label:LABELS[entry.event_type]||entry.event_type,detail:DETAILS[entry.detail_code]||''};
}

export function compactAuditEntries(entries){
  const completed=new Set(entries.filter(entry=>entry.request_id&&entry.success!==null).map(entry=>entry.request_id));
  return entries.filter(entry=>!(entry.success===null&&entry.request_id&&completed.has(entry.request_id)));
}

export function renderAuditEntries(entries,documentRef=document){
  const list=documentRef.createElement('div');list.className='audit-list';
  for(const entry of compactAuditEntries(entries)){
    const view=auditPresentation(entry);
    const item=documentRef.createElement('article');item.className=`audit-entry audit-${view.severity}`;
    const head=documentRef.createElement('div');head.className='audit-entry-head';
    const title=documentRef.createElement('strong');title.textContent=view.label;
    const badge=documentRef.createElement('span');badge.className='audit-severity';badge.textContent=view.status;
    head.append(title,badge);
    const meta=documentRef.createElement('div');meta.className='audit-meta';meta.textContent=`${view.when} · ${view.outcome}`;
    item.append(head,meta);
    if(view.actor){const actor=documentRef.createElement('div');actor.className='audit-actor';actor.textContent=`Vem: ${view.actor}`;item.append(actor);}
    if(view.subject){const subject=documentRef.createElement('div');subject.className='audit-subject';subject.textContent=`Uppgivet av (ej verifierat): ${view.subject}`;item.append(subject);}
    if(view.target){const target=documentRef.createElement('div');target.className='audit-target';target.textContent=`Gäller: ${view.target}`;item.append(target);}
    if(view.detail){const detail=documentRef.createElement('div');detail.className='audit-detail';detail.textContent=view.detail;item.append(detail);}
    list.append(item);
  }
  return list;
}
