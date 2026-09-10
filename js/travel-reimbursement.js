export let TRAVEL_RATE_PER_KM=2.5;
export let TRAVEL_RATE_PER_MIL=25;
export let MAX_TRAVEL_KM=10000;

export function configureTravelReimbursement(settings={}){
  const rate=Number(settings.travel_rate_per_km),max=Number(settings.max_travel_km);
  if(Number.isFinite(rate)&&rate>0){TRAVEL_RATE_PER_KM=rate;TRAVEL_RATE_PER_MIL=rate*10}
  if(Number.isFinite(max)&&max>0)MAX_TRAVEL_KM=max;
  document.getElementById('travelKm')?.dispatchEvent(new Event('travel-rate-update',{bubbles:true}));
}

export function calculateTravelAmount(km){
  const value=Number(km);
  if(!Number.isFinite(value)||value<0.01||value>MAX_TRAVEL_KM||Math.abs(value*100-Math.round(value*100))>1e-9)return null;
  return Math.round(value*TRAVEL_RATE_PER_KM*100)/100;
}

export function formatTravelCalculation(km){
  const amount=calculateTravelAmount(km);
  if(amount===null)return '';
  return `${Number(km).toLocaleString('sv-SE',{maximumFractionDigits:2})} km ÷ 10 × ${TRAVEL_RATE_PER_MIL} kr = ${amount.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr`;
}

export function initTravelReimbursement(){
  const enabled=document.getElementById('travelEnabled');
  const fields=document.getElementById('travelFields');
  const km=document.getElementById('travelKm');
  const calculation=document.getElementById('travelCalculation');
  const approve=document.getElementById('travelApprove');
  const error=document.getElementById('travelError');
  if(!enabled||!fields||!km||!calculation||!approve)return;

  function announce(){
    document.dispatchEvent(new CustomEvent('travel-state-change',{detail:{approved:approve.checked,amountValid:calculateTravelAmount(km.value)!==null}}));
  }
  function rateHelp(){return `Ersättning: ${TRAVEL_RATE_PER_MIL.toLocaleString('sv-SE',{maximumFractionDigits:2})} kr per mil.`}
  function resetApproval(){approve.checked=false;calculation.disabled=true;calculation.setAttribute('aria-pressed','false')}
  function sync(){
    fields.hidden=!enabled.checked;
    enabled.setAttribute('aria-expanded',String(enabled.checked));
    if(!enabled.checked){km.value='';calculation.textContent=rateHelp();error.textContent='';resetApproval();announce();return}
    const raw=km.value.trim(),amount=calculateTravelAmount(raw);
    if(!raw){calculation.textContent=rateHelp();error.textContent='';resetApproval();announce();return}
    if(amount===null){calculation.textContent=rateHelp();error.textContent=`Ange ett positivt antal kilometer, högst ${MAX_TRAVEL_KM.toLocaleString('sv-SE')}.`;resetApproval();announce();return}
    error.textContent='';calculation.textContent=formatTravelCalculation(raw);calculation.disabled=false;
    calculation.setAttribute('aria-pressed',String(approve.checked));
    announce();
  }
  function getData(){
    if(!enabled.checked)return {enabled:false,valid:true,approved:false,km:null,description:'',amount:0,calculation:''};
    const amount=calculateTravelAmount(km.value);
    const valid=amount!==null&&approve.checked;
    return {enabled:true,valid,approved:approve.checked,km:amount===null?null:Number(km.value),description:'',amount:amount??0,calculation:formatTravelCalculation(km.value)};
  }
  enabled.addEventListener('change',sync);
  km.addEventListener('input',()=>{resetApproval();sync()});
  km.addEventListener('travel-rate-update',sync);
  calculation.addEventListener('click',()=>{approve.checked=true;sync()});
  window.__idvTravel={getData};
  sync();
}
