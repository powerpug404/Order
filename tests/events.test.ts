import test from 'node:test';
import assert from 'node:assert/strict';
import {eventOccurs,eventOn,saveEventRecord} from '../src/eventStore.ts';
import {deleteEventRecord} from '../src/eventActions.ts';
import type {EventItem} from '../src/types.ts';
const base:EventItem={id:'series-1',title:'Team sync',date:'2026-11-23',start:'09:00',end:'10:00',calendar:'work',recurrence:{frequency:'daily',count:3}};
test('manual and AI event save path stores dated and undated records once',()=>{let events:EventItem[]=[];events=saveEventRecord(events,{...base,recurrence:undefined});events=saveEventRecord(events,{id:'undated',title:'Someday appointment',date:'',start:'',end:'',calendar:'work'});events=saveEventRecord(events,{...base,title:'Updated sync',recurrence:undefined});assert.equal(events.length,2);assert.equal(events.find(e=>e.id===base.id)?.title,'Updated sync');assert.equal(eventOn(events.find(e=>e.id==='undated')!,'2026-11-23'),null)});
test('dated events occur only on their calendar day and at the saved time',()=>{assert.equal(eventOn(base,'2026-11-23')?.start,'09:00');assert.equal(eventOn(base,'2026-11-22'),null)});
test('recurrence count and exclusions limit displayed occurrences',()=>{assert.equal(eventOccurs(base,'2026-11-23'),true);assert.equal(eventOccurs(base,'2026-11-24'),true);assert.equal(eventOccurs(base,'2026-11-25'),true);assert.equal(eventOccurs(base,'2026-11-26'),false);assert.equal(eventOccurs({...base,excludedDates:['2026-11-24']},'2026-11-24'),false)});
test('editing a generated occurrence leaves the rest of the series intact',()=>{const edited={...eventOn(base,'2026-11-24')!,title:'Moved sync',start:'11:00'};const events=saveEventRecord([base],edited);assert.equal(events[0].title,'Team sync');assert.equal(eventOn(events[0],'2026-11-24')?.title,'Moved sync');assert.equal(eventOn(events[0],'2026-11-25')?.title,'Team sync')});


test('editing a non-recurring event updates its canonical record, not an override',()=>{const event={...base,recurrence:undefined};const view=eventOn(event,'2026-11-23')!;assert.equal(view.seriesId,undefined);assert.equal(view.occurrenceDate,undefined);const changed=saveEventRecord([event],{...view,title:'Renamed'});assert.equal(changed[0].title,'Renamed');assert.equal(changed[0].overrides,undefined)});

test('deleting one recurring occurrence preserves the series and other dates',()=>{const result=deleteEventRecord([base],eventOn(base,'2026-11-24')!,'occurrence');assert.equal(result.length,1);assert.equal(eventOn(result[0],'2026-11-24'),null);assert.ok(eventOn(result[0],'2026-11-25'))});
test('deleting future occurrences truncates the series without touching its past',()=>{const result=deleteEventRecord([base],eventOn(base,'2026-11-24')!,'future');assert.equal(eventOccurs(result[0],'2026-11-23'),true);assert.equal(eventOccurs(result[0],'2026-11-24'),false)});
test('deleting a series removes only its master record',()=>{const other={...base,id:'other',title:'Other'};const result=deleteEventRecord([base,other],base,'series');assert.deepEqual(result.map(e=>e.id),['other'])});
test('deleting a one-time event removes only that event',()=>{const once={...base,recurrence:undefined};assert.deepEqual(deleteEventRecord([once],once,'series'),[])});

test('manual all-day events preserve date and multi-day end date',()=>{const allDay:EventItem={id:'all-day',title:'Holiday',date:'2026-12-25',endDate:'2026-12-26',start:'',end:'',allDay:true,calendar:'home'};const saved=saveEventRecord([],allDay);assert.equal(eventOn(saved[0],'2026-12-25')?.allDay,true);assert.equal(eventOn(saved[0],'2026-12-26')?.title,'Holiday');assert.equal(eventOn(saved[0],'2026-12-27'),null)});
