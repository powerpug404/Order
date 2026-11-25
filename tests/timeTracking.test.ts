import test from 'node:test';
import assert from 'node:assert/strict';
import {elapsedSeconds,finalizeTimerEntry} from '../src/timeTracking.ts';

test('elapsed Clock time is recomputed from the saved start instant after a long pause',()=>{
 const start='2026-11-25T15:00:00.000Z';
 assert.equal(elapsedSeconds(start,Date.parse(start)+6_000_000),6000);
 assert.equal(elapsedSeconds(start,Date.parse(start)-1000),0);
 assert.equal(elapsedSeconds('invalid',Date.parse(start)),0);
});

test('Clock elapsed time measures absolute seconds across spring DST, not wall-clock labels',()=>{
 // In America/Chicago, 01:30 CST to 03:30 CDT on this date is one elapsed hour.
 const start=Date.parse('2026-03-08T07:30:00.000Z');
 const end=Date.parse('2026-03-08T08:30:00.000Z');
 assert.equal(elapsedSeconds(new Date(start).toISOString(),end),3600);
});

test('stopping a task timer preserves task and project associations',()=>{
 const entry=finalizeTimerEntry({categoryId:'focus',project:'Website',projectId:'project-1',taskId:'task-1',start:'2026-11-25T15:00:00.000Z'},[{id:'focus',name:'Focus',color:'#71856A'}],'2026-11-25T15:45:00.000Z','entry-1');
 assert.equal(entry.taskId,'task-1');assert.equal(entry.projectId,'project-1');assert.equal(entry.project,'Focus');assert.equal(entry.categoryId,'focus');assert.equal(entry.end,'2026-11-25T15:45:00.000Z');
});

test('older timer records without associations still finalize safely',()=>{
 const entry=finalizeTimerEntry({categoryId:'removed',project:'Old category',start:'2026-11-25T15:00:00.000Z'},[],'2026-11-25T15:01:00.000Z','entry-2');
 assert.equal(entry.project,'Old category');assert.equal(entry.categoryId,'removed');assert.equal(entry.taskId,undefined);
});
