import test from 'node:test';
import assert from 'node:assert/strict';
import {finalizeTimerEntry} from '../src/timeTracking.ts';

test('stopping a task timer preserves task and project associations',()=>{
 const entry=finalizeTimerEntry({categoryId:'focus',project:'Website',projectId:'project-1',taskId:'task-1',start:'2026-11-25T15:00:00.000Z'},[{id:'focus',name:'Focus',color:'#71856A'}],'2026-11-25T15:45:00.000Z','entry-1');
 assert.equal(entry.taskId,'task-1');assert.equal(entry.projectId,'project-1');assert.equal(entry.project,'Focus');assert.equal(entry.categoryId,'focus');assert.equal(entry.end,'2026-11-25T15:45:00.000Z');
});

test('older timer records without associations still finalize safely',()=>{
 const entry=finalizeTimerEntry({categoryId:'removed',project:'Old category',start:'2026-11-25T15:00:00.000Z'},[],'2026-11-25T15:01:00.000Z','entry-2');
 assert.equal(entry.project,'Old category');assert.equal(entry.categoryId,'removed');assert.equal(entry.taskId,undefined);
});
