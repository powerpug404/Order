import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,hasUsableStoredShape} from '../src/data.ts';

test('production starting state does not present sample user records as real data',()=>{
 assert.deepEqual(emptyState.tasks,[]);
 assert.deepEqual(emptyState.events,[]);
 assert.deepEqual(emptyState.goals,[]);
 assert.deepEqual(emptyState.captures,[]);
 assert.equal(emptyState.settings.name,'');
 assert.equal(emptyState.streak,0);
});

test('saved state shape accepts current and older compatible records',()=>{
 assert.equal(hasUsableStoredShape(structuredClone(emptyState)),true);
 const older=structuredClone(emptyState) as any;delete older.projects;delete older.lifeAreas;
 assert.equal(hasUsableStoredShape(older),true);
});

test('saved state shape rejects malformed collections before migration can overwrite them',()=>{
 assert.equal(hasUsableStoredShape({tasks:'lost',calendars:[]}),false);
 assert.equal(hasUsableStoredShape({calendars:[]}),false);
 assert.equal(hasUsableStoredShape({tasks:[{title:'no id'}],calendars:[]}),false);
 assert.equal(hasUsableStoredShape({tasks:[],calendars:[],projects:{}}),false);
});
