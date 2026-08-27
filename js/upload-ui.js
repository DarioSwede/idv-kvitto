export function initUploadUi(){
  const file=document.getElementById('file');
  const cameraFile=document.getElementById('cameraFile');
  const camera=document.getElementById('camera');
  const thumbs=document.getElementById('thumbs');
  const status=document.getElementById('fileStatus');
  const count=document.getElementById('fileCount');
  const text=document.getElementById('fileStatusText');

  if(camera&&cameraFile&&file){
    camera.addEventListener('click',()=>cameraFile.click());
    cameraFile.addEventListener('change',()=>{
      if(!cameraFile.files.length)return;
      try{
        const dt=new DataTransfer();
        [...cameraFile.files].forEach(f=>dt.items.add(f));
        file.files=dt.files;
        file.dispatchEvent(new Event('change',{bubbles:true}));
      }catch(e){
        alert('Kunde inte föra över kamerabilden. Välj fil istället.');
      }
      cameraFile.value='';
    });
  }

  function sync(){
    const n=thumbs?thumbs.children.length:0;
    if(count)count.textContent=String(n);
    if(text)text.textContent=n===0?'Inga filer tillagda ännu':n===1?'1 fil tillagd':n+' filer tillagda';
    if(status)status.classList.toggle('has-files',n>0);
  }

  if(thumbs){
    new MutationObserver(sync).observe(thumbs,{childList:true});
    sync();
  }
}
