export function initWelcomePage(){
  const welcome=document.getElementById('welcome');
  const start=document.getElementById('startApplication');
  if(!welcome||!start)return;
  start.addEventListener('click',()=>{
    welcome.hidden=true;
    document.body.classList.remove('welcome-mode');
    document.getElementById('name')?.focus();
    window.scrollTo({top:0,behavior:'smooth'});
  });
}
