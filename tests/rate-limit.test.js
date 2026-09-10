import test from 'node:test';
import assert from 'node:assert/strict';
import {clientAddress,enforceRateLimit,hashLimiterKey,RateLimitError} from '../supabase/functions/submit-receipt/rate-limit.js';

test('extracts the first forwarded client address',()=>{
  assert.equal(clientAddress(new Headers({'x-forwarded-for':'203.0.113.9, 10.0.0.1'})),'203.0.113.9');
});

test('hashes limiter values without retaining personal data',async()=>{
  const key=await hashLimiterKey('ip','203.0.113.9','secret');
  assert.match(key,/^ip:[a-f0-9]{64}$/);
  assert.ok(!key.includes('203.0.113.9'));
});

test('throws a retry-aware error when the database rejects a request',async()=>{
  const client={rpc:async()=>({data:[{allowed:false,retry_after_seconds:42}],error:null})};
  await assert.rejects(()=>enforceRateLimit(client,{scope:'ip',value:'x',windowSeconds:600,maxRequests:5}),error=>error instanceof RateLimitError&&error.retryAfterSeconds===42);
});
