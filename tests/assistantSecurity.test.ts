import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantLimits,consumeRateLimit,MemoryRateLimiter,validateAssistantRequest} from '../api/assistantSecurity.ts';

test('AI endpoint validation accepts the app request shape and defaults the operation',()=>{
  const result=validateAssistantRequest({message:'Plan tomorrow',context:{tasks:[{id:'t1'}],settings:{planningStyle:'Flexible'}}});
  assert.equal(result.ok,true);
  if(result.ok){assert.equal(result.value.operation,'assistant');assert.equal(result.value.message,'Plan tomorrow')}
});

test('AI endpoint validation rejects unsupported fields, operations, context, and oversized messages',()=>{
  for(const body of [
    {message:'x',model:'expensive-model'},
    {message:'x',operation:'database_query'},
    {message:'x',context:{secrets:'do not send'}},
    {message:'x'.repeat(assistantLimits.maxMessageCharacters+1)},
    {message:'x',context:{tasks:Array.from({length:251},()=>({id:'x'}))}},
  ]) assert.equal(validateAssistantRequest(body).ok,false);
});

test('server rate limiter enforces a window and permits requests after expiry',()=>{
  const limiter=new MemoryRateLimiter(2,1000,10);
  assert.equal(limiter.consume('client-a',100).allowed,true);
  assert.equal(limiter.consume('client-a',200).allowed,true);
  assert.equal(limiter.consume('client-a',300).allowed,false);
  assert.equal(limiter.consume('client-a',1100).allowed,true);
});

test('endpoint fallback rate limiter caps anonymous requests per IP',async()=>{
  const ip=`isolated-test-${Math.random()}`;
  for(let i=0;i<10;i++) assert.equal((await consumeRateLimit(ip,{},50_000)).allowed,true);
  const limited=await consumeRateLimit(ip,{},50_000);
  assert.equal(limited.allowed,false);
  assert.equal(limited.distributed,false);
});
