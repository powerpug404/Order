import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackup,restoreBackup,validateBackup} from '../src/dataBackup.ts';
import {seed} from '../src/data.ts';

function memoryStorage(initial:Record<string,string>={}){
  const values=new Map(Object.entries(initial));
  return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)},values};
}

test('backup includes app-owned auxiliary records and restores the full state',()=>{
  const storage=memoryStorage({'order-review-history':'[{"id":"review-1"}]','unrelated':'keep'});
  const state=structuredClone(seed);
  const backup=createBackup(state,storage,new Date('2026-01-02T03:04:05Z'));
  assert.equal(backup.format,'order-local-backup');
  assert.equal(backup.auxiliary['order-review-history'] instanceof Array,true);
  const target=memoryStorage({'order-prototype-v1':'old'});
  const restored=restoreBackup(backup,target);
  assert.deepEqual(restored,state);
  assert.equal(target.getItem('order-review-history'),'[{"id":"review-1"}]');
  assert.equal(JSON.parse(target.getItem('order-prototype-v1')!).schemaVersion,state.schemaVersion);
});

test('backup validation rejects malformed structures and duplicate record IDs',()=>{
  const backup=createBackup(structuredClone(seed),memoryStorage());
  const bad=structuredClone(backup) as any;
  bad.state.tasks.push({...bad.state.tasks[0]});
  assert.throws(()=>validateBackup(bad),/duplicate IDs/);
  assert.throws(()=>validateBackup({format:'not-order'}),/supported ORDER backup/);
});

test('Phase 9 backups restore with empty Phase 10 collections',()=>{
  const state=structuredClone(seed) as any;
  delete state.projects;delete state.lifeAreas;state.schemaVersion=9;
  const previous={format:'order-local-backup',formatVersion:1,dataVersion:9,exportedAt:'2026-11-23T00:00:00.000Z',state,auxiliary:{}};
  const restored=restoreBackup(previous,memoryStorage());
  assert.deepEqual(restored.projects,[]);
  assert.deepEqual(restored.lifeAreas,[]);
  assert.equal(restored.tasks.length,seed.tasks.length);
});

test('backup validation rejects malformed Phase 10 project and area collections',()=>{
  const backup=createBackup(structuredClone(seed),memoryStorage());
  const badProjects=structuredClone(backup) as any;
  badProjects.state.projects=[{id:'p1'}];
  assert.throws(()=>validateBackup(badProjects),/invalid Project record/);
  const badAreas=structuredClone(backup) as any;
  badAreas.state.lifeAreas='not-an-array';
  assert.throws(()=>validateBackup(badAreas),/valid lifeAreas data/);
});

test('failed restore rolls back storage writes',()=>{
  const backup=createBackup(structuredClone(seed),memoryStorage({'order-daily-choices':'{}'}));
  const base=memoryStorage({'order-daily-choices':'{"old":true}','order-prototype-v1':'old-state'});
  let writes=0;
  const failing={getItem:base.getItem,setItem:(key:string,value:string)=>{if(++writes===2)throw new Error('quota');base.setItem(key,value)},removeItem:base.removeItem};
  assert.throws(()=>restoreBackup(backup,failing),/quota/);
  assert.equal(base.getItem('order-daily-choices'),' {"old":true}'.trim());
  assert.equal(base.getItem('order-prototype-v1'),'old-state');
});
