import test from 'node:test';
import assert from 'node:assert/strict';
import {moveCalendar} from '../src/calendarOrder.ts';
const rows=[{id:'a',name:'Personal'},{id:'b',name:'Work'},{id:'c',name:'Family'}];
test('calendar reordering swaps only adjacent entries and preserves their records',()=>{
  const moved=moveCalendar(rows,'b',1);
  assert.deepEqual(moved.map(x=>x.id),['a','c','b']);
  assert.equal(moved[2].name,'Work');
  assert.deepEqual(rows.map(x=>x.id),['a','b','c']);
});
test('calendar reordering leaves unknown and boundary entries unchanged',()=>{
  assert.equal(moveCalendar(rows,'a',-1),rows);
  assert.equal(moveCalendar(rows,'c',1),rows);
  assert.equal(moveCalendar(rows,'missing',1),rows);
});
