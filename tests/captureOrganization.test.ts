import test from 'node:test';
import assert from 'node:assert/strict';
import {associateCaptureSuggestions} from '../src/captureOrganization.ts';

test('matches suggestions to exact capture ids and preserves source text', () => {
  const captures = [{id:'c1',text:'Buy groceries and call insurance'}];
  const rows = associateCaptureSuggestions([
    {captureId:'c1',type:'task',title:'Buy groceries'},
    {captureId:'c1',type:'task',title:'Call insurance'},
  ], captures);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => row.originalText), [captures[0].text, captures[0].text]);
});

test('uses original text to associate an action when the model omits an id', () => {
  const captures = [{id:'c1',text:'Call insurance tomorrow'}, {id:'c2',text:'Plan vacation'}];
  const rows = associateCaptureSuggestions([{type:'task',title:'Call insurance',originalText:captures[0].text}], captures);
  assert.equal(rows[0]?.captureId, 'c1');
});

test('rejects ambiguous, malformed, unsupported, and empty suggestions', () => {
  const captures = [{id:'c1',text:'First'}, {id:'c2',text:'Second'}];
  const rows = associateCaptureSuggestions([
    {type:'task',title:'Unassociated'},
    {captureId:'c1',type:'delete',title:'Delete capture'},
    {captureId:'c1',type:'task',title:'  '},
    null,
  ], captures);
  assert.deepEqual(rows, []);
  assert.deepEqual(associateCaptureSuggestions({actions:[]}, captures), []);
});

test('associates an id-less result when only one capture was selected', () => {
  const rows = associateCaptureSuggestions([{type:'event',title:'Dentist appointment'}], [{id:'c1',text:'Schedule dentist appointment'}]);
  assert.equal(rows[0]?.captureId, 'c1');
});
