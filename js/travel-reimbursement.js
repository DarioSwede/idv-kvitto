import {travelVehicle,vehicleAmount,vehicleSummary} from './travel-rates.js';
export let TRAVEL_RATE_PER_KM=2.5;
export let TRAVEL_RATE_PER_MIL=25;
export let MAX_TRAVEL_KM=10000;

export function configureTravelReimbursement(settings={}){
  const rate=Number(settings.travel_rate_per_km),max=Number(settings.max_travel_km);
  if(Number.isFinite(rate)&&rate>0){TRAVEL_RATE_PER_KM=rate;TRAVEL_RATE_PER_MIL=rate*10}
  if(Number.isFinite(max)&&max>0)MAX_TRAVEL_KM=max;
  document.getElementById('travelKm')?.dispatchEvent(new Event('travel-rate-update',{bubbles:true}));
}

export function calculateTravelAmount(km,vehicleType='private_car'){
  return vehicleAmount(km,vehicleType,TRAVEL_RATE_PER_KM,MAX_TRAVEL_KM);
}

export function formatTravelCalculation(km,vehicleType='private_car'){
  const amount=calculateTravelAmount(km,vehicleType);
  if(amount===null)return '';
  const rate=travelVehicle(vehicleType,TRAVEL_RATE_PER_KM).ratePerKm*10;
  return `${Number(km).toLocaleString('sv-SE',{maximumFractionDigits:2})} km ÷ 10 × ${rate.toLocaleString('sv-SE')} kr = ${amount.toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})} kr`;
}

export function initTravelReimbursement(){
  const enabled=document.getElementById('travelEnabled');
  const fields=document.getElementById('travelFields');
  const vehicle=document.getElementById('travelVehicle');
  const km=document.getElementById('travelKm');
  const calculation=document.getElementById('travelCalculation');
  const approve=document.getElementById('travelApprove');
  const error=document.getElementById('travelError');
  if(!enabled||!fields||!km||!vehicle||!calculation||!approve)return;

  function announce(){
    document.dispatchEvent(new CustomEvent('travel-state-change',{detail:{approved:approve.checked,amountValid:calculateTravelAmount(km.value,vehicle.value)!==null}}));
  }
  function rateHelp(){const selected=travelVehicle(vehicle.value,TRAVEL_RATE_PER_KM);return selected?`Milersättning: ${(selected.ratePerKm*10).toLocaleString('sv-SE',{maximumFractionDigits:2})} kr per mil.`:'Välj fordon för att beräkna milersättningen.'}
  function resetApproval(){approve.checked=false;calculation.disabled=true;calculation.setAttribute('aria-pressed','false');calculation.classList.remove('needs-approval')}
  function sync(){
    fields.hidden=!enabled.checked;
    vehicle.required=enabled.checked;
    vehicle.disabled=!enabled.checked;
    for(const option of vehicle.options){if(option.value)option.textContent=vehicleSummary(option.value,TRAVEL_RATE_PER_KM)}
    const privateRate=document.getElementById('privateCarRate');
    if(privateRate)privateRate.textContent=TRAVEL_RATE_PER_MIL.toLocaleString('sv-SE');
    enabled.setAttribute('aria-expanded',String(enabled.checked));
    if(!enabled.checked){km.value='';calculation.textContent=rateHelp();error.textContent='';resetApproval();announce();return}
    if(!travelVehicle(vehicle.value,TRAVEL_RATE_PER_KM)){calculation.textContent=rateHelp();error.textContent='';resetApproval();announce();return}
    const raw=km.value.trim(),amount=calculateTravelAmount(raw,vehicle.value);
    if(!raw){calculation.textContent=rateHelp();error.textContent='';resetApproval();announce();return}
    if(amount===null){calculation.textContent=rateHelp();error.textContent=`Ange ett positivt antal kilometer, högst ${MAX_TRAVEL_KM.toLocaleString('sv-SE')}.`;resetApproval();announce();return}
    error.textContent='';
    const formattedCalculation=formatTravelCalculation(raw,vehicle.value);
    calculation.textContent=approve.checked?`✓ Godkänd: ${formattedCalculation}`:`➜ Klicka här för att godkänna: ${formattedCalculation}`;
    calculation.disabled=false;
    calculation.setAttribute('aria-pressed',String(approve.checked));
    calculation.classList.toggle('needs-approval',!approve.checked);
    announce();
  }
  function getData(){
    if(!enabled.checked)return {enabled:false,valid:true,approved:false,km:null,description:'',amount:0,calculation:''};
    const amount=calculateTravelAmount(km.value,vehicle.value);
    const valid=amount!==null&&approve.checked;
    return {enabled:true,vehicleType:vehicle.value,vehicleLabel:vehicleSummary(vehicle.value,TRAVEL_RATE_PER_KM),valid,approved:approve.checked,km:amount===null?null:Number(km.value),description:'',amount:amount??0,calculation:formatTravelCalculation(km.value,vehicle.value)};
  }
  enabled.addEventListener('change',sync);
  km.addEventListener('input',()=>{resetApproval();sync()});
  vehicle.addEventListener('change',()=>{resetApproval();sync()});
  km.addEventListener('travel-rate-update',()=>{resetApproval();sync()});
  calculation.addEventListener('click',()=>{approve.checked=true;sync()});
  window.__idvTravel={getData};
  sync();
}
