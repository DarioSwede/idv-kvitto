export class RateLimitError extends Error{
  constructor(retryAfterSeconds){super('För många inskick. Vänta en stund och försök igen.');this.name='RateLimitError';this.retryAfterSeconds=Math.max(1,Number(retryAfterSeconds)||1)}
}

export function clientAddress(headers){
  const forwarded=headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return headers.get('cf-connecting-ip')?.trim()||headers.get('x-real-ip')?.trim()||forwarded||'unknown';
}

export async function hashLimiterKey(scope,value,pepper=''){
  const bytes=new TextEncoder().encode(`${scope}:${value}:${pepper}`);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return `${scope}:${[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}`;
}

export async function enforceRateLimit(client,{scope,value,windowSeconds,maxRequests,pepper=''}){
  const limiterKey=await hashLimiterKey(scope,value,pepper);
  const {data,error}=await client.rpc('check_receipt_rate_limit',{p_limiter_key:limiterKey,p_window_seconds:windowSeconds,p_max_requests:maxRequests});
  if(error)throw error;
  const result=Array.isArray(data)?data[0]:data;
  if(!result?.allowed)throw new RateLimitError(result?.retry_after_seconds);
}
