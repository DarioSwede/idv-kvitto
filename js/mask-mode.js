export function initMaskMode(){
  const canvas=document.getElementById('canvas');
  const toggle=document.getElementById('maskModeToggle');
  const mask=document.getElementById('mask');
  const status=document.getElementById('maskModeStatus');
  const addedStatus=document.getElementById('maskAddedStatus');
  let marking=false;

  function setMaskMode(on){
    marking=!!on;
    if(toggle)toggle.checked=marking;
    if(mask){
      mask.classList.toggle('mask-on',marking);
      mask.classList.toggle('mask-off',!marking);
    }
    if(canvas)canvas.style.touchAction=marking?'none':'pan-y pinch-zoom';
    if(status){status.textContent=marking?'● Maskering på – dra över det du vill dölja.':'Maskering av – du kan scrolla fritt.';status.dataset.state=marking?'on':'off'}
  }

  if(toggle){
    toggle.addEventListener('change',()=>setMaskMode(toggle.checked));
    setMaskMode(false);
  }

  if(canvas){
    ['touchstart','touchmove','touchend','mousedown','mousemove','mouseup','pointerdown','pointermove','pointerup'].forEach(type=>{
      canvas.addEventListener(type,e=>{if(!marking)e.stopImmediatePropagation()},true);
    });
  }

  document.addEventListener('receipt-mask-change',event=>{
    const count=Number(event.detail?.count)||0;
    if(addedStatus){addedStatus.hidden=count===0;addedStatus.textContent=count===1?'✓ Maskering tillagd':`✓ ${count} maskeringar tillagda`}
  });
}
