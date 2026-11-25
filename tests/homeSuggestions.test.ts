import test from 'node:test';
import assert from 'node:assert/strict';
import {contextualHomeActions} from '../src/homeSuggestions.ts';
import type {Task} from '../src/types.ts';
const task:Task={id:'t1',title:'Prepare the proposal',date:'',dueDate:'',scheduledDate:'',time:'',duration:30,priority:2,goal:'',calendar:'default',done:false,status:'todo',postponed:0};

test('repeatedly postponed work gets supportive, specific actions',()=>{
  const actions=contextualHomeActions({...task,postponed:3},'Balanced','2026-11-25');
  assert.equal(actions.length,2);
  assert.match(actions[0].prompt,/Prepare the proposal/);
  assert.match(actions[1].prompt,/Rebalance my day/);
});

test('overdue focus suggests a day rebalance',()=>{
  const actions=contextualHomeActions({...task,dueDate:'2026-11-24'},'Balanced','2026-11-25');
  assert.equal(actions[0].label,'Rebalance my day');
});

test('overloaded workload offers a lighter plan without assuming work hours',()=>{
  const actions=contextualHomeActions(task,'Overloaded','2026-11-25');
  assert.equal(actions[0].label,'Simplify my day');
});

test('clear focus offers two relevant prompts and no-task state stays calm',()=>{
  assert.equal(contextualHomeActions(undefined,'Light','2026-11-25').length,2);
  assert.equal(contextualHomeActions(task,'Balanced','2026-11-25').length,1);
});
