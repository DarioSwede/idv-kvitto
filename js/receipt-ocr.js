const TESSERACT_URL='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
let workerPromise;

const OCR_TIMEOUT_MS=45000;

function timeoutAfter(ms){
  let timeout;
  const promise=new Promise((_,reject)=>{
    timeout=setTimeout(()=>reject(new Error('OCR tog för lång tid.')),ms);
  });
  return {promise,cancel:()=>clearTimeout(timeout)};
}

function normalizeAmount(value){
  const cleaned=value.replace(/\s/g,'').replace(/[^\d,.-]/g,'');
  if(!cleaned)return null;
  const lastComma=cleaned.lastIndexOf(',');
  const lastDot=cleaned.lastIndexOf('.');
  const decimalAt=Math.max(lastComma,lastDot);
  let normalized;
  if(decimalAt>=0&&cleaned.length-decimalAt-1===2){
    normalized=cleaned.slice(0,decimalAt).replace(/[.,]/g,'')+'.'+cleaned.slice(decimalAt+1);
  }else{
    normalized=cleaned.replace(/[.,]/g,'');
  }
  const amount=Number(normalized);
  return Number.isFinite(amount)&&amount>0&&amount<10000000?amount:null;
}

function extractTotalCandidate(text){
  const lines=String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const strongTotal=/\b(att\s+betala|totalt?\s*(belopp)?|summa|slutsumma)\b/i;
  const mediumTotal=/\b(betalat|belopp|amount|total)\b/i;
  const weakPayment=/\b(kort(k[oö]p)?|kontant|swish)\b/i;
  const negative=/\b(varav\s+moms|moms|vat|tax|momssats|avrund|[oö]resutj[aä]mning|rabatt|v[aä]xel)\b/i;
  const amountPattern=/(?:\d{1,3}(?:[ .]\d{3})+|\d+)(?:[,.]\d{2})?(?=\s*(?:kr|sek|:-)?\b|\s*$)/gi;
  const candidates=[];

  lines.forEach((line,lineIndex)=>{
    const previous=lines[lineIndex-1]||'';
    const next=lines[lineIndex+1]||'';
    let keywordScore=0;
    if(strongTotal.test(line))keywordScore=14;
    else if(mediumTotal.test(line))keywordScore=8;
    else if(weakPayment.test(line))keywordScore=4;
    else if(strongTotal.test(previous)||strongTotal.test(next))keywordScore=7;

    const negativeScore=negative.test(line)?-7:0;
    const percentPenalty=/%/.test(line)?-8:0;

    for(const match of line.matchAll(amountPattern)){
      const amount=normalizeAmount(match[0]);
      if(amount===null)continue;
      const tail=line.slice(match.index||0);
      const hasCurrency=/(?:kr|sek|:-)/i.test(tail);
      const hasDecimals=/[,.]\d{2}\b/.test(match[0]);
      if(!keywordScore&&!hasCurrency&&!hasDecimals)continue;
      const rightmostBoost=((match.index||0)/Math.max(line.length,1))*3;
      const score=keywordScore+negativeScore+percentPenalty+(hasCurrency?2:0)+(hasDecimals?2:0)+rightmostBoost+lineIndex/Math.max(lines.length,1);
      candidates.push({amount,score,line,lineIndex,keywordScore,hasDecimals});
    }
  });

  candidates.sort((a,b)=>b.score-a.score||b.amount-a.amount);
  const best=candidates[0]||null;
  if(!best)return {amount:null,suspicious:false,candidates};

  const plausibleOthers=candidates.filter(candidate=>candidate!==best&&candidate.hasDecimals&&candidate.score>-3);
  const largestOther=plausibleOthers.reduce((max,candidate)=>Math.max(max,candidate.amount),0);
  const suspicious=best.keywordScore>=7&&best.amount<10&&largestOther>=best.amount*4;
  return {amount:best.amount,suspicious,candidates};
}

export function findTotalAmount(text){
  return extractTotalCandidate(text).amount;
}

function enhanceCanvas(source,mode='contrast'){
  const maxWidth=1900;
  const desiredScale=Math.max(1.5,Math.min(2.6,maxWidth/Math.max(source.width,1)));
  const width=Math.max(1,Math.round(source.width*desiredScale));
  const height=Math.max(1,Math.round(source.height*desiredScale));
  const canvas=document.createElement('canvas');
  canvas.width=width;
  canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(source,0,0,width,height);

  const image=ctx.getImageData(0,0,width,height);
  const data=image.data;
  for(let i=0;i<data.length;i+=4){
    const gray=Math.round(data[i]*0.299+data[i+1]*0.587+data[i+2]*0.114);
    let value;
    if(mode==='threshold'){
      value=gray<185?0:255;
    }else{
      value=Math.max(0,Math.min(255,(gray-128)*1.75+128));
      if(value>235)value=255;
      else if(value<35)value=0;
    }
    data[i]=data[i+1]=data[i+2]=value;
  }
  ctx.putImageData(image,0,0);
  return canvas;
}

function loadTesseract(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector(`script[src="${TESSERACT_URL}"]`);
    const script=existing||document.createElement('script');
    script.addEventListener('load',()=>window.Tesseract?resolve(window.Tesseract):reject(new Error('OCR kunde inte startas.')),{once:true});
    script.addEventListener('error',()=>reject(new Error('OCR-biblioteket kunde inte laddas.')),{once:true});
    if(!existing){script.src=TESSERACT_URL;script.crossOrigin='anonymous';document.head.append(script)}
  });
}

async function getWorker(logger){
  if(!workerPromise){
    workerPromise=loadTesseract().then(async({createWorker})=>{
      const worker=await createWorker('swe',1,{logger});
      await worker.setParameters({
        user_defined_dpi:'300',
        preserve_interword_spaces:'1'
      });
      return worker;
    }).catch(error=>{workerPromise=null;throw error});
  }
  return workerPromise;
}

async function recognize(worker,canvas){
  const result=await worker.recognize(canvas);
  return extractTotalCandidate(result?.data?.text||'');
}

async function processReceipt(detail){
  const {canvas,getAmount,setSuggestion,setOcrState}=detail;
  if(!canvas||typeof getAmount!=='function'||typeof setSuggestion!=='function')return;
  if(getAmount()){
    setOcrState?.('manual');
    return;
  }
  setOcrState?.('working','OCR förbättrar bilden och läser totalbelopp …');
  let active=true;
  let worker;
  const watchdog=timeoutAfter(OCR_TIMEOUT_MS);
  try{
    const ocrJob=(async()=>{
      worker=await getWorker(message=>{
        if(active&&message.status==='recognizing text'&&Number.isFinite(message.progress)){
          const progress=Math.round(message.progress*100);
          setOcrState?.('working',progress>=100?'OCR kontrollerar totalbeloppet …':`OCR läser kvittot … ${progress} %`);
        }
      });
      if(!active){
        void worker.terminate().catch(()=>{});
        return null;
      }

      const primary=await recognize(worker,enhanceCanvas(canvas,'contrast'));
      if(!primary.suspicious)return primary;

      setOcrState?.('working','OCR dubbelkontrollerar ett osäkert belopp …');
      const retry=await recognize(worker,enhanceCanvas(canvas,'threshold'));
      if(retry.amount!==null&&!retry.suspicious)return retry;
      if(retry.amount!==null&&retry.amount>primary.amount&&retry.candidates[0]?.score>=primary.candidates[0]?.score-2)return retry;
      return primary.suspicious?{...primary,amount:null}:primary;
    })();

    const result=await Promise.race([ocrJob,watchdog.promise]);
    if(!active||!result)return;
    const amount=result.amount;
    const amountApplied=amount!==null&&!getAmount();
    if(amountApplied){
      setSuggestion(amount.toFixed(2));
    }
    setOcrState?.(amountApplied?'suggested':'none',amountApplied?'OCR-förslag – kontrollera beloppet':'OCR hittade inget tillräckligt säkert belopp – fyll i själv');
  }catch(error){
    console.warn('OCR misslyckades utan att blockera formuläret:',error);
    setOcrState?.('error','OCR kunde inte läsa kvittot – fyll i själv');
    if(error.message==='OCR tog för lång tid.'){
      workerPromise=null;
      void worker?.terminate().catch(()=>{});
    }
  }finally{
    active=false;
    watchdog.cancel();
  }
}

export function initReceiptOcr(){
  let queue=Promise.resolve();
  document.addEventListener('receipt-ready-for-ocr',event=>{
    const detail=event.detail||{};
    detail.handled=true;
    const run=async()=>{
      try{
        await processReceipt(detail);
      }finally{
        try{
          await detail.complete?.();
        }catch(error){
          console.warn('OCR-kön kunde inte slutföra kvittot:',error);
        }
      }
    };
    queue=queue.catch(()=>{}).then(run);
  });
}
