import {initUploadUi} from './upload-ui.js?v=20260830-12';
import {initMaskMode} from './mask-mode.js?v=20260830-1';
import {initDonePage} from './done-page.js';
import {initReceiptOcr} from './receipt-ocr.js?v=20260830-2';
import {initContactValidation} from './contact-validation.js?v=20260830-8';
import {initTravelReimbursement} from './travel-reimbursement.js';

initUploadUi();
initMaskMode();
initDonePage();
initReceiptOcr();
initContactValidation();
initTravelReimbursement();
initReceiptManager();
initEmailCopy();

async function initEmailCopy(){
  const checkbox=document.getElementById('cc');
  const help=document.querySelector('.copy-option small');
  const api=window.__idvReceiptApi;
  if(!checkbox||!help||!api)return;
  checkbox.disabled=true;
  help.textContent='Kontrollerar om e-postkopian är tillgänglig …';
  try{
    const response=await fetch(api.endpoint,{headers:{apikey:api.key,Authorization:'Bearer '+api.key}});
    const result=await response.json();
    checkbox.disabled=!result.email_configured;
    checkbox.checked=!!result.email_configured;
    help.textContent=result.email_configured?'Kopian innehåller sammanställningen och den färdiga PDF-filen.':'E-postkopian är inte aktiverad ännu.';
  }catch{
    checkbox.checked=false;
    help.textContent='E-postkopian kan inte användas just nu.';
  }
}

function initReceiptManager(){
  const state=window.__idvReceiptState;
  if(!state)return;

  const upload=document.getElementById('upload');
  const thumbs=document.getElementById('thumbs');
  const continueBtn=document.getElementById('continue');
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
  const previewBtn=document.getElementById('previewBtn');
  const backBtn=document.getElementById('back');
  const reviewNext=document.getElementById('reviewNext');
  const addMoreReceipts=document.getElementById('addMoreReceipts');
  const otherInfo=document.getElementById('other');

  let inspectingImage=false;

  if(addMoreReceipts)addMoreReceipts.onclick=()=>state.show('upload');
  if(otherInfo){
    const resizeOtherInfo=()=>{
      otherInfo.style.height='auto';
      otherInfo.style.height=otherInfo.scrollHeight+'px';
    };
    otherInfo.addEventListener('input',resizeOtherInfo);
    resizeOtherInfo();
  }

  function setMasking(on){
    if(!toggle)return;
    toggle.checked=!!on;
    toggle.dispatchEvent(new Event('change',{bubbles:true}));
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
      const active=document.querySelector('#uploadThumbHome .thumb[data-inspected="true"]');
      if(active)active.focus();
    }
  }

  function inspectImage(index,thumb){
    const p=state.photos[index];
    if(!p||!p.canvas)return;
    document.querySelectorAll('#uploadThumbHome .thumb').forEach(el=>el.removeAttribute('data-inspected'));
    if(thumb)thumb.dataset.inspected='true';
    state.idx=index;
    state.load();
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
    document.dispatchEvent(new CustomEvent('receipt-mask-change',{detail:{count:Array.isArray(p.masks)?p.masks.length:0}}));
    if(lightbox)lightbox.classList.add('active','image-inspector');
  }

  function inspectPdf(p,thumb){
    document.querySelectorAll('#uploadThumbHome .thumb').forEach(el=>el.removeAttribute('data-inspected'));
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
        badge.textContent='✓ Maskering tillagd';
        item.appendChild(badge);
      }else if(!hasMask&&badge){
        badge.remove();
      }
    });
  }

  if(continueBtn)continueBtn.onclick=()=>{
    if(!state.photos.length||!window.__idvCanLeaveReceipts?.())return state.show('upload');
    applyMasks();
    state.render();
    state.show('form');
  };

  if(previewBtn){
    const buildPreview=previewBtn.onclick;
    previewBtn.onclick=()=>{
      if(!window.__idvCanLeaveContact?.())return;
      buildPreview?.();
      const summary=document.getElementById('summary');
      const cc=document.getElementById('cc');
      const email=document.getElementById('email')?.value.trim().toLowerCase();
      if(summary&&cc){
        const row=document.createElement('div');
        row.className='row copy-summary';
        const label=document.createElement('span');
        label.textContent='Kopia till dig';
        const value=document.createElement('b');
        value.textContent=cc.checked?`Ja – ${email}`:'Nej';
        row.append(label,value);
        summary.append(row);
      }
      if(document.getElementById('review')?.classList.contains('active'))reviewNext?.click();
    };
  }
  if(backBtn)backBtn.onclick=()=>state.show('form');

  if(closeBtn)closeBtn.onclick=()=>closeInspector();
  if(lightbox)lightbox.onclick=e=>{if(e.target===lightbox)closeInspector()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&lightbox?.classList.contains('active'))closeInspector(false)});

  if(thumbs){
    new MutationObserver(()=>{
      wireThumbnails();
    }).observe(thumbs,{childList:true,subtree:false});
  }
  wireThumbnails();
}
