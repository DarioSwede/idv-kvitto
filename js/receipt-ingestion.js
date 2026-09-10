export function createReceiptIngestion({
  documentRef=document,
  getPhotos=()=>[],
  addReceipt=()=>{},
  removeReceipt=()=>{},
  setProcessing=()=>{},
  render=()=>{},
  showError=()=>{},
  fileBaseName=name=>name,
  cleanReceiptImage=image=>image,
  compressPdf=async file=>file,
  FileReaderClass=globalThis.FileReader,
  ImageClass=globalThis.Image
}={}){
  const allowedImageTypes=new Set(['image/jpeg','image/png','image/webp','image/avif','image/heic','image/heif']);
  const maxReceipts=10,maxTotalBytes=25*1024*1024;
  function notifyOcr(receipt){
    const EventClass=documentRef.defaultView?.CustomEvent||globalThis.CustomEvent;
    receipt.ocrState='queued';
    receipt.ocrMessage='OCR väntar i kö …';
    documentRef.dispatchEvent(new EventClass('receipt-ready-for-ocr',{detail:{
      canvas:receipt.canvas,
      getAmount:()=>receipt.amountSource==='manual'||receipt.amount,
      setSuggestion:value=>{if(receipt.amountSource!=='manual'&&!receipt.amount){receipt.ocrSuggestion=value;render()}},
      setOcrState:(state,message)=>{receipt.ocrState=state;receipt.ocrMessage=message;render()}
    }}));
  }

  async function addPdf(file){
    const receipt={pdf:true,file,done:true,name:fileBaseName(file.name),autoNamePending:false,compressing:file.size>8*1024*1024};
    addReceipt(receipt);
    if(!receipt.compressing){render();return}
    setProcessing(1);
    render();
    showError('Komprimerar '+file.name+' …','info');
    try{
      receipt.file=await compressPdf(file);
      if(receipt.file.size>10*1024*1024)throw Error('PDF-filen är fortfarande större än 10 MB efter komprimering.');
      showError(file.name+' komprimerades till '+(receipt.file.size/1024/1024).toFixed(1)+' MB.','info');
    }catch(error){
      removeReceipt(receipt);
      showError(error.message||('Det gick inte att komprimera '+file.name+'.'),'error');
    }finally{
      setProcessing(-1);
      receipt.compressing=false;
      render();
    }
  }

  function addImage(file){
    const reader=new FileReaderClass();
    reader.onload=event=>{
      const image=new ImageClass();
      image.onload=()=>{
        const receipt={canvas:cleanReceiptImage(image),file,masks:[],done:false,name:fileBaseName(file.name),autoNamePending:false};
        addReceipt(receipt);
        render();
        notifyOcr(receipt);
      };
      image.onerror=()=>showError('Bilden '+file.name+' kunde inte läsas. Spara den som JPG eller PNG och försök igen.','error');
      image.src=event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function addFiles(fileList){
    const files=[...fileList];
    if(getPhotos().length+files.length>maxReceipts){showError('Du kan lägga till högst 10 kvitton åt gången.','error');return}
    const existingBytes=getPhotos().reduce((sum,receipt)=>sum+(receipt.file?.size||0),0);
    if(existingBytes+files.reduce((sum,file)=>sum+file.size,0)>maxTotalBytes){showError('Filerna får tillsammans vara högst 25 MB.','error');return}
    files.forEach(file=>{
      if(file.type==='application/pdf'){addPdf(file);return}
      if(!allowedImageTypes.has(file.type)){showError('Filtypen för '+file.name+' stöds inte.','error');return}
      addImage(file);
    });
  }

  return {addFiles};
}
