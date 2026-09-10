export function createReceiptMaskEditor({documentRef=document,getPhotos=()=>[],getIndex=()=>0,setIndex=()=>{},show=()=>{},openReceipt=()=>{}}={}){
  const byId=id=>documentRef.getElementById(id);
  const canvas=byId('canvas');
  const context=canvas?.getContext('2d');
  let drawing=false;
  let start=null;
  let current=null;

  function activeReceipt(){return getPhotos()[getIndex()]}
  function announceMaskCount(count){documentRef.dispatchEvent(new CustomEvent('receipt-mask-change',{detail:{count}}))}

  function showPdfReview(){
    byId('maskTitle').textContent='Kontrollera PDF-filerna';
    byId('maskSubtitle').textContent='Öppna varje PDF och kontrollera att rätt dokument har lagts till.';
    byId('maskInstructions').innerHTML='<strong>PDF-filer kan inte täckas över här.</strong><br>Om något känsligt syns behöver du ta bort filen och redigera den innan du laddar upp den igen.';
    byId('maskCanvasWrap').hidden=true;
    byId('maskToolbar').hidden=true;
    const review=byId('pdfMaskReview');
    review.hidden=false;
    review.replaceChildren();
    getPhotos().filter(receipt=>receipt.pdf).forEach((receipt,index)=>{
      const button=documentRef.createElement('button');
      button.className='pdf-open';
      button.textContent='📄 Förhandsgranska '+(receipt.name||('PDF '+(index+1)));
      button.onclick=()=>openReceipt(receipt);
      review.append(button);
    });
    byId('next').textContent='PDF-filerna är kontrollerade – gå vidare';
  }

  function showImageMask(){
    byId('maskTitle').textContent='Kontrollera kvittot';
    byId('maskSubtitle').textContent='Se att hela kvittot syns och att bilden är tillräckligt läsbar.';
    byId('maskInstructions').innerHTML='<strong>Kontrollera kvittot.</strong><br>Vill du dölja något? Slå på maskering och dra över uppgiften.';
    byId('maskCanvasWrap').hidden=false;
    byId('maskToolbar').hidden=true;
    byId('pdfMaskReview').hidden=true;
    byId('next').textContent='Kvittot ser bra ut – gå vidare';
  }

  function draw(){
    const receipt=activeReceipt();
    if(!receipt?.canvas||!context)return;
    context.drawImage(receipt.canvas,0,0);
    context.fillStyle='#000';
    (receipt.masks||[]).forEach(mask=>context.fillRect(mask.x,mask.y,mask.w,mask.h));
    if(current){context.fillStyle='#000a';context.fillRect(current.x,current.y,current.w,current.h)}
  }

  function load(){
    const receipt=activeReceipt();
    if(!receipt?.canvas||!canvas)return;
    canvas.width=receipt.canvas.width;
    canvas.height=receipt.canvas.height;
    byId('next').disabled=false;
    byId('next').textContent='Kvittot ser bra ut – gå vidare';
    draw();
  }

  function position(event){
    const rect=canvas.getBoundingClientRect();
    const pointer=event.touches?.[0]||event;
    return {x:(pointer.clientX-rect.left)*canvas.width/rect.width,y:(pointer.clientY-rect.top)*canvas.height/rect.height};
  }
  function down(event){event.preventDefault();drawing=true;start=position(event);current={x:start.x,y:start.y,w:0,h:0}}
  function move(event){
    if(!drawing)return;
    event.preventDefault();
    const point=position(event);
    current={x:Math.min(start.x,point.x),y:Math.min(start.y,point.y),w:Math.abs(point.x-start.x),h:Math.abs(point.y-start.y)};
    draw();
  }
  function up(){
    if(!drawing)return;
    drawing=false;
    const receipt=activeReceipt();
    if(receipt&&current?.w>4&&current?.h>4){
      receipt.masks=receipt.masks||[];
      receipt.masks.push(current);
      announceMaskCount(receipt.masks.length);
    }
    current=null;
    draw();
  }
  function undo(){const receipt=activeReceipt();if(!receipt)return;receipt.masks?.pop();announceMaskCount(receipt.masks?.length||0);draw()}
  function clear(){const receipt=activeReceipt();if(!receipt)return;receipt.masks=[];announceMaskCount(0);draw()}
  function next(){
    const index=getIndex();
    if(index<0)return show('form');
    const photos=getPhotos();
    const receipt=photos[index];
    const receiptContext=receipt.canvas.getContext('2d');
    receiptContext.fillStyle='#000';
    (receipt.masks||[]).forEach(mask=>receiptContext.fillRect(mask.x,mask.y,mask.w,mask.h));
    receipt.done=true;
    const following=photos.findIndex((item,itemIndex)=>itemIndex>index&&!item.pdf&&!item.done);
    if(following>=0){setIndex(following);load()}else show('form');
  }

  if(canvas){
    canvas.onmousedown=down;canvas.onmousemove=move;canvas.ontouchstart=down;canvas.ontouchmove=move;canvas.ontouchend=up;
    window.addEventListener('mouseup',up);
  }
  if(byId('undo'))byId('undo').onclick=undo;
  if(byId('clear'))byId('clear').onclick=clear;
  if(byId('next'))byId('next').onclick=next;
  return {showPdfReview,showImageMask,load,draw};
}
