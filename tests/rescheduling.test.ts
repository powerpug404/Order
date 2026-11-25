import test from 'node:test';
import assert from 'node:assert/strict';
import {rescheduleSuggestions,prepareTaskReschedule} from '../src/rescheduling.ts';

test('rescheduling check-ins offer brief, optional and reason-specific next steps',()=>{
 assert.deepEqual(rescheduleSuggestions('ran_out_of_time').map(x=>x.action),['tomorrow','more_time','unschedule']);
 assert.ok(rescheduleSuggestions('took_longer').some(x=>x.action==='break_down'));
 assert.ok(rescheduleSuggestions('low_energy').some(x=>x.action==='lighter'));
 assert.ok(rescheduleSuggestions('not_important').some(x=>x.action==='lower_priority'));
 for(const reason of ['ran_out_of_time','more_important','took_longer','waiting','hard_to_start','low_energy','not_important','other'] as const)assert.ok(rescheduleSuggestions(reason).length<=3);
});

test('preparing a reschedule changes only the planned date and preserves its deadline',()=>{const original={id:'t1',title:'Write report',date:'2026-11-26',dueDate:'2026-11-26',scheduledDate:'2026-11-25',time:'09:00',duration:30,priority:2,goal:'',calendar:'default',done:false,status:'todo' as const,postponed:1};const draft=prepareTaskReschedule(original,'2026-11-27');assert.equal(draft.scheduledDate,'2026-11-27');assert.equal(draft.dueDate,'2026-11-26');assert.equal(draft.date,'2026-11-26');assert.equal(draft.time,'');assert.equal(draft.postponed,2);assert.equal(original.scheduledDate,'2026-11-25')});
