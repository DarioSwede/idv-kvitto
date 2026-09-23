export const ADMIN_IDLE_TIMEOUT_MS=30*60*1000;

export function setupAdminSessionTimeout({onTimeout,timeoutMs=ADMIN_IDLE_TIMEOUT_MS,windowRef=window,documentRef=document}){
  let timer;
  const arm=()=>{windowRef.clearTimeout(timer);timer=windowRef.setTimeout(()=>onTimeout('idle_timeout'),timeoutMs);};
  const activity=()=>{if(!documentRef.hidden)arm();};
  for(const type of ['pointerdown','keydown','touchstart'])windowRef.addEventListener(type,activity,{passive:true});
  documentRef.addEventListener('visibilitychange',activity);
  arm();
  return ()=>{windowRef.clearTimeout(timer);for(const type of ['pointerdown','keydown','touchstart'])windowRef.removeEventListener(type,activity);documentRef.removeEventListener('visibilitychange',activity);};
}
