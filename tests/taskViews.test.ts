import test from 'node:test';
import assert from 'node:assert/strict';
import {taskMatchesView,type TaskView} from '../src/taskViews.ts';
import type {Task} from '../src/types.ts';

const base:Task={id:'task-1',title:'Write report',date:'',dueDate:'',scheduledDate:'',time:'',duration:30,priority:2,goal:'',calendar:'default',done:false,status:'todo',postponed:0};
const matches=(task:Partial<Task>,view:TaskView,today='2026-11-25')=>taskMatchesView({...base,...task},today,view);

test('task views distinguish inbox, to do, in progress, and completed',()=>{
  assert.equal(matches({status:'inbox'},'inbox'),true);
  assert.equal(matches({status:'inbox'},'todo'),false);
  assert.equal(matches({status:'in_progress'},'in_progress'),true);
  assert.equal(matches({done:true,status:'completed'},'completed'),true);
  assert.equal(matches({done:true,status:'completed'},'todo'),false);
});

test('overdue and upcoming task views use due dates without modifying them',()=>{
  assert.equal(matches({dueDate:'2026-11-24'},'overdue'),true);
  assert.equal(matches({dueDate:'2026-11-24',done:true,status:'completed'},'overdue'),false);
  assert.equal(matches({dueDate:'2026-11-30'},'upcoming'),true);
  assert.equal(matches({dueDate:'2026-12-10'},'upcoming'),false);
});

test('unscheduled uses scheduled date and preserves a separate due date',()=>{
  assert.equal(matches({dueDate:'2026-11-26'},'unscheduled'),true);
  assert.equal(matches({dueDate:'2026-11-26',scheduledDate:'2026-11-26'},'unscheduled'),false);
  assert.equal(matches({date:'2026-11-26',showCalendar:true},'unscheduled'),false);
});

test('all task view includes completed and unscheduled records',()=>{
  assert.equal(matches({done:true,status:'completed'},'all'),true);
  assert.equal(matches({},'all'),true);
});
