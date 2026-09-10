export async function submitReceipt({endpoint,key,formData,fetchImpl=fetch,parseResponse,buildResult}={}){
  if(!endpoint||!key)throw Error('Anslutningen för inskick saknas. Ladda om sidan.');
  const response=await fetchImpl(endpoint,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key},body:formData});
  const responseText=await response.text();
  const payload=parseResponse(responseText);
  if(!response.ok)throw Error(payload.error||('Inskicket misslyckades ('+response.status+'). Försök igen.'));
  return buildResult(payload);
}
