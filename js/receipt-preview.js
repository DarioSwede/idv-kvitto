export function createReceiptPreview({documentRef=document,pdfPreviewUrl=file=>URL.createObjectURL(file)}={}){
  const lightbox=documentRef.getElementById('lightbox');
  const image=documentRef.getElementById('lightboxImage');
  const pdf=documentRef.getElementById('lightboxPdf');

  function open(receipt){
    if(!receipt||receipt.compressing||!lightbox||!image||!pdf)return;
    if(receipt.pdf){
      image.style.display='none';
      pdf.style.display='block';
      pdf.replaceChildren();
      const object=documentRef.createElement('object');
      object.type='application/pdf';
      object.data=pdfPreviewUrl(receipt.file);
      object.setAttribute('aria-label','Förhandsvisning av '+(receipt.name||'PDF-kvitto'));
      const fallback=documentRef.createElement('p');
      fallback.textContent='PDF-filen kan inte visas i webbläsaren.';
      object.append(fallback);
      pdf.append(object);
    }else{
      pdf.style.display='none';
      pdf.replaceChildren();
      image.style.display='block';
      image.src=receipt.canvas?receipt.canvas.toDataURL('image/jpeg',.92):URL.createObjectURL(receipt.file);
      image.alt=receipt.name||'Kvitto';
    }
    lightbox.classList.add('active');
  }

  function close(){
    if(!lightbox||!image||!pdf)return;
    lightbox.classList.remove('active');
    image.removeAttribute('src');
    pdf.replaceChildren();
  }

  return {open,close};
}
