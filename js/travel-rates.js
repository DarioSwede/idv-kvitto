/** Shared by the form and server: never accept a client-supplied rate. */
export function travelVehicle(type, privateRatePerKm=2.5){
  const vehicles={
    private_car:{label:'Privat bil (egen bil, inklusive el- och hybridbil)',ratePerKm:privateRatePerKm},
    company_car:{label:'Förmånsbil (bensin, diesel, etanol eller hybrid)',ratePerKm:1.2},
    company_electric:{label:'Förmånsbil (helt eldriven)',ratePerKm:0.95},
    motorcycle:{label:'Motorcykel eller mopedbil',ratePerKm:1.2}
  };
  return Object.hasOwn(vehicles,type)?vehicles[type]:null;
}
export function vehicleAmount(km,type,privateRatePerKm=2.5,maxKm=10000){
  const vehicle=travelVehicle(type,privateRatePerKm),value=Number(km);
  if(!vehicle||!Number.isFinite(value)||value<0.01||value>maxKm||Math.abs(value*100-Math.round(value*100))>1e-9)return null;
  return Math.round(value*vehicle.ratePerKm*100)/100;
}
export function vehicleSummary(type,privateRatePerKm=2.5){
  const vehicle=travelVehicle(type,privateRatePerKm);
  return vehicle?`${vehicle.label} · ${(vehicle.ratePerKm*10).toLocaleString('sv-SE',{maximumFractionDigits:2})} kr/mil`:'';
}
