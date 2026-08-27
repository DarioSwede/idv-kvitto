export function initMaskMode(){
  const canvas=document.getElementById('canvas');
  const toggle=document.getElementById('maskModeToggle');
  const mask=document.getElementById('mask');
  const status=document.getElementById('maskModeStatus');
  let marking=false;

  function setMaskMode(on){
    marking=!!on;
    if(toggle)toggle.checked=marking;
    if(mask){
      mask.classList.toggle('mask-on',marking);
      mask.classList.toggle('mask-off',!marking);
    }
    if(status)status.textContent=marking?'Markering på – dra över det du vill dölja.':'Markering av – du kan scrolla fritt.';
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
}
