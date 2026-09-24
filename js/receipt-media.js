const MAX_IMAGE_SIZE=1600;

export function fileBaseName(name=''){
  return String(name).replace(/\.[^.]+$/,'').slice(0,200)||'Kvitto';
}

// Keep the user-visible/submitted receipt faithful to the source photo.
// OCR has its own derived preprocessing in receipt-ocr.js; destructive
// background removal here can erase pale thermal text and sunlit paper.
export function cleanReceiptImage(image){
  const scale=Math.min(1,MAX_IMAGE_SIZE/Math.max(image.width,image.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*scale));
  canvas.height=Math.max(1,Math.round(image.height*scale));
  const context=canvas.getContext('2d',{alpha:false});
  context.fillStyle='#fff';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.imageSmoothingEnabled=true;
  context.imageSmoothingQuality='high';
  context.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas;
}

export async function compressPdf(file){
  const pdfjs=await import('https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.mjs');
  const pdfLib=await import('https://esm.sh/pdf-lib@1.17.1');
  pdfjs.GlobalWorkerOptions.workerSrc='https://esm.sh/pdfjs-dist@4.10.38/legacy/build/pdf.worker.mjs';
  const source=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
  async function build(scale,quality){
    const output=await pdfLib.PDFDocument.create();
    for(let pageNumber=1;pageNumber<=source.numPages;pageNumber+=1){const page=await source.getPage(pageNumber),view=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);const context=canvas.getContext('2d',{alpha:false});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);await page.render({canvasContext:context,viewport:view}).promise;const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality)),image=await output.embedJpg(await blob.arrayBuffer()),pdfPage=output.addPage([view.width/scale,view.height/scale]);pdfPage.drawImage(image,{x:0,y:0,width:pdfPage.getWidth(),height:pdfPage.getHeight()})}
    return new Uint8Array(await output.save({useObjectStreams:true}));
  }
  let bytes=await build(1.45,.7);
  if(bytes.length>9.5*1024*1024)bytes=await build(1.1,.52);
  return new File([bytes],file.name,{type:'application/pdf',lastModified:file.lastModified});
}

export function pdfPreviewUrl(file){return URL.createObjectURL(file)+'#page=1&zoom=page-width&pagemode=none&toolbar=0&navpanes=0&scrollbar=1&view=FitH'}
