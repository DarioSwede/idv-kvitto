import {initUploadUi} from './upload-ui.js?v=20260828-3';
import {initMaskMode} from './mask-mode.js?v=20260828-1';
import {initDonePage} from './done-page.js';
import {initReceiptOcr} from './receipt-ocr.js?v=20260827-8';

initUploadUi();
initMaskMode();
initDonePage();
initReceiptOcr();
initStep2Manager();

function initStep2Manager(){
  const state=window.__idvReceiptState;
  if(!state)return;

  const upload=document.getElementById('upload');
  const mask=document.getElementById('mask');
  const thumbs=document.getElementById('thumbs');
  const maskList=document.getElementById('maskReceiptList');
  const continueBtn=document.getElementById('continue');
  const nextBtn=document.getElementById('next');
  const lightbox=document.getElementById('lightbox');
  const closeBtn=document.getElementById('lightboxClose');
  const image=document.getElementById('lightboxImage');
  const pdf=document.getElementById('lightboxPdf');
  const canvasWrap=document.getElementById('maskCanvasWrap');
  const toolbar=document.getElementById('maskToolbar');
  const editorStorage=document.getElementById('maskEditorStorage');
  const canvasHost=document.getElementById('inspectorCanvasHost');
  const toolbarHost=document.getElementById('inspectorToolbarHost');
  const inspectorTools=document.getElementById('inspectorTools');
  const toggle=document.getElementById('maskModeToggle');
  const step2Tab=document.querySelector('.seg[data-step="1"]');

  let inspectingImage=false;

  function setMasking(on){
    if(!toggle)return;
    toggle.checked=!!on;
    toggle.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function moveThumbsToStep2(){
    if(thumbs&&maskList&&thumbs.parentElement!==maskList)maskList.appendChild(thumbs);
  }

  function showManager(){
    state.show('mask');
    moveThumbsToStep2();
    if(canvasWrap&&editorStorage&&canvasWrap.parentElement!==editorStorage)editorStorage.appendChild(canvasWrap);
    if(toolbar&&editorStorage&&toolbar.parentElement!==editorStorage)editorStorage.appendChild(toolbar);
    if(inspectorTools)inspectorTools.hidden=true;
    closeInspector(false);
    wireThumbnails();
    if(nextBtn){
      nextBtn.textContent='Klar – gå vidare';
      nextBtn.disabled=state.photos.length===0;
    }
    window.scrollTo(0,0);
  }

  function applyMasks(){
    state.photos.forEach(p=>{
      if(!p.canvas||!Array.isArray(p.masks)||!p.masks.length)return;
      const ctx=p.canvas.getContext('2d');
      ctx.fillStyle='#000';
      p.masks.forEach(m=>ctx.fillRect(m.x,m.y,m.w,m.h));
      p.masks=[];
      p.done=true;
    });
  }

  function closeInspector(focusBack=true){
    if(inspectingImage){
      setMasking(false);
      if(canvasWrap&&editorStorage)editorStorage.appendChild(canvasWrap);
      if(toolbar&&editorStorage)editorStorage.appendChild(toolbar);
    }
    inspectingImage=false;
    if(inspectorTools)inspectorTools.hidden=true;
    if(lightbox)lightbox.classList.remove('active','image-inspector');
    if(image){image.style.display='none';image.removeAttribute('src')}
    if(pdf){pdf.style.display='none';pdf.innerHTML=''}
    wireThumbnails();
    if(focusBack){
      const active=document.querySelector('#maskReceiptList .thumb[data-inspected="true"]');
      if(active)active.focus();
    }
  }

  function inspectImage(index,thumb){
    const p=state.photos[index];
    if(!p||!p.canvas)return;
    document.querySelectorAll('#maskReceiptList .thumb').forEach(el=>el.removeAttribute('data-inspected'));
    if(thumb)thumb.dataset.inspected='true';
    state.idx=index;
    state.load();
    if(nextBtn)nextBtn.textContent='Klar – gå vidare';
    inspectingImage=true;
    if(image)image.style.display='none';
    if(pdf){pdf.style.display='none';pdf.innerHTML=''}
    if(canvasWrap&&canvasHost){
      canvasWrap.hidden=false;
      canvasHost.appendChild(canvasWrap);
    }
    if(toolbar&&toolbarHost){
      toolbar.hidden=false;
      toolbarHost.appendChild(toolbar);
    }
    if(inspectorTools)inspectorTools.hidden=false;
    setMasking(false);
    if(lightbox)lightbox.classList.add('active','image-inspector');
  }

  function inspectPdf(p,thumb){
    document.querySelectorAll('#maskReceiptList .thumb').forEach(el=>el.removeAttribute('data-inspected'));
    if(thumb)thumb.dataset.inspected='true';
    inspectingImage=false;
    if(inspectorTools)inspectorTools.hidden=true;
    state.openReceipt(p);
  }

  function wireThumbnails(){
    if(!thumbs)return;
    [...thumbs.querySelectorAll('.receipt-item')].forEach((item,index)=>{
      const p=state.photos[index];
      const thumb=item.querySelector('.thumb');
      if(!p||!thumb)return;
      thumb.setAttribute('aria-label','Öppna och inspektera '+(p.name||('kvitto '+(index+1))));
      thumb.onclick=()=>p.pdf?inspectPdf(p,thumb):inspectImage(index,thumb);
      thumb.onkeydown=e=>{
        if(e.key==='Enter'||e.key===' '){
          e.preventDefault();
          p.pdf?inspectPdf(p,thumb):inspectImage(index,thumb);
        }
      };
      let badge=item.querySelector('.mask-badge');
      const hasMask=Array.isArray(p.masks)&&p.masks.length>0;
      if(hasMask&&!badge){
        badge=document.createElement('div');
        badge.className='mask-badge';
        badge.textContent='Maskering tillagd';
        item.appendChild(badge);
      }else if(!hasMask&&badge){
        badge.remove();
      }
    });
  }

  if(continueBtn)continueBtn.onclick=showManager;
  if(step2Tab)step2Tab.onclick=()=>{
    if(step2Tab.disabled)return;
    showManager();
  };
  if(nextBtn)nextBtn.onclick=()=>{
    if(!state.photos.length)return state.show('upload');
    applyMasks();
    state.render();
    state.show('form');
  };

  if(closeBtn)closeBtn.onclick=()=>closeInspector();
  if(lightbox)lightbox.onclick=e=>{if(e.target===lightbox)closeInspector()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&lightbox?.classList.contains('active'))closeInspector(false)});

  if(thumbs){
    new MutationObserver(()=>{
      if(mask?.classList.contains('active')){
        wireThumbnails();
        if(nextBtn)nextBtn.disabled=state.photos.length===0;
      }
    }).observe(thumbs,{childList:true,subtree:false});
  }

  if(upload)upload.classList.add('upload-thumbs-hidden');
}
