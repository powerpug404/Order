import test from 'node:test';
import assert from 'node:assert/strict';
import {explicitEventTitle,normalizeEventProposalTitles} from '../src/aiService.ts';

test('extracts an explicitly named event from a command',()=>{
  assert.equal(explicitEventTitle('Create an event named ORDER calendar verification for Thursday at 2 PM'),'ORDER calendar verification');
  assert.equal(explicitEventTitle('Add an appointment called "Dentist" on Friday'),'Dentist');
});

test('fills a missing AI event title from the explicit request without changing other actions',()=>{
  const actions=[{type:'event',date:'2026-11-26',start:'14:00',end:'14:30'},{type:'task',title:'Other'}];
  const result=normalizeEventProposalTitles('Create event named Dentist on Thursday',actions);
  assert.equal(result[0].title,'Dentist');
  assert.equal(result[1],actions[1]);
});

test('uses an AI event title when present and leaves uncertain names empty for clarification',()=>{
  assert.equal(normalizeEventProposalTitles('Move my appointment Thursday',[{type:'event',title:'Clinic'}])[0].title,'Clinic');
  assert.equal(normalizeEventProposalTitles('Add an event Thursday',[{type:'event'}])[0].title,undefined);
});
