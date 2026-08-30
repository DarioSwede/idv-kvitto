export function isValidEmailAddress(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
}

export function hasValidContactDetails(name,email){
  return String(name).trim().length>0&&isValidEmailAddress(email);
}

export function initContactValidation(){
  const name=document.getElementById('name');
  const email=document.getElementById('email');
  const next=document.getElementById('previewBtn');
  const error=document.getElementById('formError');
  if(!name||!email||!next)return;

  function canContinue(){
    return hasValidContactDetails(name.value,email.value);
  }

  function sync(showErrors=false){
    const validName=String(name.value).trim().length>0;
    const validEmail=isValidEmailAddress(email.value);
    const hasEmail=String(email.value).trim().length>0;
    next.disabled=!(validName&&validEmail);
    next.title=next.disabled?'Fyll i namn och en giltig e-postadress för att gå vidare':'';
    name.setAttribute('aria-invalid',String(!validName&&String(name.value).length>0));
    email.setAttribute('aria-invalid',String(hasEmail&&!validEmail));
    if(!error)return;
    if(hasEmail&&!validEmail&&(showErrors||document.activeElement===email))error.innerHTML='<div class="error">E-postadressen ser inte korrekt ut.</div>';
    else if(validEmail&&!validName&&showErrors)error.innerHTML='<div class="error">Fyll i ditt namn.</div>';
    else error.innerHTML='';
  }

  window.__idvCanLeaveContact=canContinue;
  name.addEventListener('input',()=>sync(false));
  email.addEventListener('input',()=>sync(false));
  name.addEventListener('blur',()=>sync(true));
  email.addEventListener('blur',()=>sync(true));
  sync(false);
}
