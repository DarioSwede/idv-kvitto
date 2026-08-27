const TESSERACT_URL='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
let workerPromise;

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

export function findTotalAmount(text){
  const lines=String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const keywords=[
    {pattern:/\b(att\s+betala|totalt?\s*(belopp)?|summa|slutsumma)\b/i,score:8},
    {pattern:/\b(kort(k[oö]p)?|betalat|belopp)\b/i,score:5},
    {pattern:/\b(total|amount)\b/i,score:4}
  ];
  const amountPattern=/(?:\d{1,3}(?:[ .]\d{3})+|\d+)(?:[,.]\d{2})?(?=\s*(?:kr|sek|:-)?\b|\s*$)/gi;
  const candidates=[];
  lines.forEach((line,lineIndex)=>{
    let keywordScore=0;
    keywords.forEach(({pattern,score})=>{if(pattern.test(line))keywordScore=Math.max(keywordScore,score)});
    for(const match of line.matchAll(amountPattern)){
      const amount=normalizeAmount(match[0]);
      if(amount===null)continue;
      const hasCurrency=/(?:kr|sek|:-)/i.test(line.slice(match.index));
      const hasDecimals=/[,.]\d{2}\b/.test(match[0]);
      if(!keywordScore&&!hasCurrency&&!hasDecimals)continue;
      candidates.push({amount,score:keywordScore+(hasCurrency?2:0)+(hasDecimals?1:0)+lineIndex/Math.max(lines.length,1)});
    }
  });
  candidates.sort((a,b)=>b.score-a.score||b.amount-a.amount);
  return candidates[0]?.amount??null;
}

export function findReceiptName(text){
  const blocked=/\b(kvitto|receipt|org\.?nr|moms|datum|date|total|summa|att betala|belopp|kort|terminal|butik|kund)\b/i;
  const lines=String(text||'').split(/\r?\n/).map(line=>line.replace(/[^\p{L}\p{N}&'. -]/gu,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
  const candidates=lines.slice(0,10).filter(line=>{
    const letters=(line.match(/\p{L}/gu)||[]).length;
    const digits=(line.match(/\d/g)||[]).length;
    return letters>=3&&digits<=letters&&!blocked.test(line)&&line.length<=60;
  });
  candidates.sort((a,b)=>{
    const score=line=>((line===line.toUpperCase())?4:0)+Math.min((line.match(/\p{L}/gu)||[]).length,20)/20;
    return score(b)-score(a);
  });
  return candidates[0]||null;
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
    workerPromise=loadTesseract().then(({createWorker})=>createWorker('swe',1,{logger})).catch(error=>{workerPromise=null;throw error});
  }
  return workerPromise;
}

async function processReceipt(detail){
  const {canvas,getAmount,getName,setSuggestion,setNameSuggestion,setOcrState}=detail;
  if(!canvas||typeof getAmount!=='function'||typeof setSuggestion!=='function')return;
  if(getAmount()&&getName?.()){
    setOcrState?.('manual');
    return;
  }
  setOcrState?.('working','OCR läser namn och belopp lokalt …');
  try{
    const worker=await getWorker(message=>{
      if(message.status==='recognizing text'&&Number.isFinite(message.progress)){
        setOcrState?.('working',`OCR läser kvittot … ${Math.round(message.progress*100)} %`);
      }
    });
    const {data}=await worker.recognize(canvas);
    const amount=findTotalAmount(data.text);
    const name=findReceiptName(data.text);
    const amountApplied=amount!==null&&!getAmount();
    const nameApplied=!!name&&!getName?.();
    if(amountApplied){
      setSuggestion(amount.toFixed(2));
    }
    if(nameApplied)setNameSuggestion?.(name);
    const found=[];
    if(nameApplied)found.push('namn');
    if(amountApplied)found.push('belopp');
    setOcrState?.(found.length?'suggested':'none',found.length?'OCR-förslag – kontrollera namn och belopp':'OCR hittade inga säkra förslag – fyll i själv');
  }catch(error){
    console.warn('OCR misslyckades utan att blockera formuläret:',error);
    setOcrState?.('error','OCR kunde inte läsa kvittot – fyll i själv');
  }
}

export function initReceiptOcr(){
  let queue=Promise.resolve();
  document.addEventListener('receipt-ready-for-ocr',event=>{
    event.detail.handled=true;
    queue=queue.then(()=>processReceipt(event.detail)).catch(()=>{}).then(()=>event.detail.complete?.());
  });
}
