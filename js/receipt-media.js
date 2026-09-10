const MAX_IMAGE_SIZE=1600;

export function fileBaseName(name=''){
  return String(name).replace(/\.[^.]+$/,'').slice(0,200)||'Kvitto';
}

export function cleanReceiptImage(image){
  const scale=Math.min(1,MAX_IMAGE_SIZE/Math.max(image.width,image.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(image.width*scale);
  canvas.height=Math.round(image.height*scale);
  const context=canvas.getContext('2d');
  context.drawImage(image,0,0,canvas.width,canvas.height);
  const imageData=context.getImageData(0,0,canvas.width,canvas.height);
  const pixels=imageData.data,width=canvas.width,height=canvas.height;
  const luminance=index=>.2126*pixels[index]+.7152*pixels[index+1]+.0722*pixels[index+2];
  let border=0,borderCount=0,center=0,centerCount=0;
  const step=Math.max(1,Math.floor(Math.min(width,height)/120));
  for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step){const light=luminance((y*width+x)*4);if(x<width*.08||x>width*.92||y<height*.08||y>height*.92){border+=light;borderCount+=1}else if(x>width*.3&&x<width*.7&&y>height*.2&&y<height*.8){center+=light;centerCount+=1}}
  border/=borderCount;center/=centerCount;
  if(center-border<35||center<145)return canvas;
  const limit=Math.min(185,border+45),seen=new Uint8Array(width*height),queue=[];
  let head=0;
  for(let x=0;x<width;x+=1)queue.push(x,(height-1)*width+x);
  for(let y=1;y<height-1;y+=1)queue.push(y*width,y*width+width-1);
  while(head<queue.length){const point=queue[head++];if(seen[point])continue;seen[point]=1;if(luminance(point*4)>limit)continue;const x=point%width,y=Math.floor(point/width);pixels[point*4]=pixels[point*4+1]=pixels[point*4+2]=255;if(x)queue.push(point-1);if(x<width-1)queue.push(point+1);if(y)queue.push(point-width);if(y<height-1)queue.push(point+width)}
  context.putImageData(imageData,0,0);
  let minX=width,minY=height,maxX=0,maxY=0;
  for(let y=0;y<height;y+=2)for(let x=0;x<width;x+=2)if(!seen[y*width+x]){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
  if(maxX<=minX||maxY<=minY)return canvas;
  const margin=Math.round(Math.min(width,height)*.01);
  minX=Math.max(0,minX-margin);minY=Math.max(0,minY-margin);maxX=Math.min(width-1,maxX+margin);maxY=Math.min(height-1,maxY+margin);
  const output=document.createElement('canvas');
  output.width=maxX-minX+1;output.height=maxY-minY+1;
  const outputContext=output.getContext('2d');
  outputContext.fillStyle='#fff';outputContext.fillRect(0,0,output.width,output.height);outputContext.drawImage(canvas,minX,minY,output.width,output.height,0,0,output.width,output.height);
  return output;
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
