export const TRAVEL_RATE_PER_KM=2.4;
export const MAX_TRAVEL_KM=10000;

export function calculateTravelAmount(km){
  const value=Number(km);
  if(!Number.isFinite(value)||value<0.01||value>MAX_TRAVEL_KM||Math.abs(value*100-Math.round(value*100))>1e-9)return null;
  return Math.round(value*TRAVEL_RATE_PER_KM*100)/100;
}

export function formatTravelCalculation(km){
  const amount=calculateTravelAmount(km);
  if(amount===null)return '';
  return `${Number(km).toLocaleString('sv-SE',{maximumFractionDigits:2})} km ÷ 10 × 24 kr = ${amount.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr`;
}

export function initTravelReimbursement(){
  const enabled=document.getElementById('travelEnabled');
  const fields=document.getElementById('travelFields');
  const km=document.getElementById('travelKm');
  const description=document.getElementById('travelDescription');
  const calculation=document.getElementById('travelCalculation');
  const approve=document.getElementById('travelApprove');
  const approval=document.getElementById('travelApproval');
  const error=document.getElementById('travelError');
  if(!enabled||!fields||!km||!description||!calculation||!approve||!approval)return;

  function resetApproval(){approve.checked=false;approval.hidden=true}
  function sync(){
    fields.hidden=!enabled.checked;
    enabled.setAttribute('aria-expanded',String(enabled.checked));
    if(!enabled.checked){km.value='';description.value='';calculation.textContent='';error.textContent='';resetApproval();return}
    const raw=km.value.trim(),amount=calculateTravelAmount(raw);
    if(!raw){calculation.textContent='Ange antal kilometer för att se ersättningen.';error.textContent='';resetApproval();return}
    if(amount===null){calculation.textContent='';error.textContent=`Ange ett positivt antal kilometer, högst ${MAX_TRAVEL_KM.toLocaleString('sv-SE')}.`;resetApproval();return}
    error.textContent='';calculation.textContent=formatTravelCalculation(raw);approval.hidden=false;
    document.getElementById('travelSuggestedAmount').textContent=amount.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kr';
  }
  function getData(){
    if(!enabled.checked)return {enabled:false,valid:true,approved:false,km:null,description:'',amount:0,calculation:''};
    const amount=calculateTravelAmount(km.value);
    const valid=amount!==null&&description.value.trim().length>0&&description.value.trim().length<=500&&approve.checked;
    return {enabled:true,valid,approved:approve.checked,km:amount===null?null:Number(km.value),description:description.value.trim(),amount:amount??0,calculation:formatTravelCalculation(km.value)};
  }
  enabled.addEventListener('change',sync);
  km.addEventListener('input',()=>{resetApproval();sync()});
  description.addEventListener('input',()=>{if(description.value.length>500)description.value=description.value.slice(0,500)});
  window.__idvTravel={getData};
  sync();
}
