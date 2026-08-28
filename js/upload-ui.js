export function initUploadUi(){
  const thumbs=document.getElementById('thumbs');
  const badge=document.getElementById('fileCountBadge');

  function sync(){
    const n=thumbs?thumbs.children.length:0;
    if(!badge)return;
    badge.textContent=String(n);
    badge.hidden=n===0;
    badge.style.display=n===0?'none':'inline-flex';
    badge.setAttribute('aria-label',n===1?'1 fil tillagd':n+' filer tillagda');
  }

  if(thumbs){
    new MutationObserver(sync).observe(thumbs,{childList:true});
    sync();
  }
}
