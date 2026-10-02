import test from 'node:test';
import assert from 'node:assert/strict';
import {travelVehicle,vehicleAmount,vehicleSummary} from '../js/travel-rates.js';
import {buildSubmissionFormData} from '../js/submission-flow.js';

for(const [vehicle,expected] of [['private_car',85],['company_car',40.8],['company_electric',32.3],['motorcycle',40.8]]){
  test(`${vehicle}: serverns beräkning för 34 km`,()=>{
    assert.equal(vehicleAmount(34,vehicle),expected);
    assert.match(vehicleSummary(vehicle),/kr\/mil/);
  });
}
test('saknat eller okänt fordon och felaktiga kilometer avvisas',()=>{
  for(const vehicle of ['', 'car', '__proto__', 'constructor']){
    assert.equal(travelVehicle(vehicle),null);
    assert.equal(vehicleAmount(34,vehicle),null);
  }
  for(const km of [0,-1,'abc',1.234,10001,Infinity])assert.equal(vehicleAmount(km,'private_car'),null);
  assert.equal(vehicleAmount(1.25,'private_car'),3.13);
  assert.equal(vehicleAmount(10,'private_car',3),30);
  assert.equal(vehicleAmount(10,'company_electric',3),9.5);
});
test('fordonsvalet följer med resor, men inte rena kvittoinskick',async()=>{
  const input={name:'Testperson',email:'test@example.se',bank:{},travel:{enabled:true,approved:true,vehicleType:'company_electric',km:10,amount:9.5}};
  assert.equal((await buildSubmissionFormData({...input,submissionMode:'travel'})).get('travel_vehicle'),'company_electric');
  assert.equal((await buildSubmissionFormData({...input,submissionMode:'receipts'})).get('travel_vehicle'),'');
});
