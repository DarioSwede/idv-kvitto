export function initDonePage(){
  const done=document.getElementById('done');
  function syncDone(){
    document.body.classList.toggle('done-mode',!!done&&done.classList.contains('active'));
  }
  if(done){
    new MutationObserver(syncDone).observe(done,{attributes:true,attributeFilter:['class']});
    syncDone();
  }
  const restartDone=document.getElementById('restartDone');
  if(restartDone)restartDone.addEventListener('click',()=>location.reload());
}
