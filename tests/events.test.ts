import test from 'node:test';
import assert from 'node:assert/strict';
import {eventOccurs,eventOn,saveEventRecord} from '../src/eventStore.ts';
import type {EventItem} from '../src/types.ts';
const base:EventItem={id:'series-1',title:'Team sync',date:'2026-11-23',start:'09:00',end:'10:00',calendar:'work',recurrence:{frequency:'daily',count:3}};
test('manual and AI event save path stores dated and undated records once',()=>{let events:EventItem[]=[];events=saveEventRecord(events,{...base,recurrence:undefined});events=saveEventRecord(events,{id:'undated',title:'Someday appointment',date:'',start:'',end:'',calendar:'work'});events=saveEventRecord(events,{...base,title:'Updated sync',recurrence:undefined});assert.equal(events.length,2);assert.equal(events.find(e=>e.id===base.id)?.title,'Updated sync');assert.equal(eventOn(events.find(e=>e.id==='undated')!,'2026-11-23'),null)});
test('dated events occur only on their calendar day and at the saved time',()=>{assert.equal(eventOn(base,'2026-11-23')?.start,'09:00');assert.equal(eventOn(base,'2026-11-22'),null)});
test('recurrence count and exclusions limit displayed occurrences',()=>{assert.equal(eventOccurs(base,'2026-11-23'),true);assert.equal(eventOccurs(base,'2026-11-24'),true);assert.equal(eventOccurs(base,'2026-11-25'),true);assert.equal(eventOccurs(base,'2026-11-26'),false);assert.equal(eventOccurs({...base,excludedDates:['2026-11-24']},'2026-11-24'),false)});
test('editing a generated occurrence leaves the rest of the series intact',()=>{const edited={...eventOn(base,'2026-11-24')!,title:'Moved sync',start:'11:00'};const events=saveEventRecord([base],edited);assert.equal(events[0].title,'Team sync');assert.equal(eventOn(events[0],'2026-11-24')?.title,'Moved sync');assert.equal(eventOn(events[0],'2026-11-25')?.title,'Team sync')});

