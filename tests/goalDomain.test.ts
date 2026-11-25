import test from 'node:test';
import assert from 'node:assert/strict';
import type {Goal,Task} from '../src/types.ts';
import {goalProgress,isStalledGoal,milestoneProgress,milestoneTasks,nextGoalTask,normalizeGoal,tasksForGoal} from '../src/goalDomain.ts';

const goal=(overrides:Partial<Goal>={}):Goal=>({id:'g1',name:'Finish the project',category:'Work',description:'',priority:5,target:'',progress:12,milestones:[],...overrides});
const task=(overrides:Partial<Task>={}):Task=>({id:'t1',title:'Draft outline',date:'',dueDate:'',scheduledDate:'',time:'',duration:30,priority:5,priorityLevel:3,goal:'Finish the project',goalId:'g1',calendar:'c',done:false,postponed:0,showToday:false,showCalendar:false,...overrides});

test('legacy goal records are extended without losing user data',()=>{
 const old=goal({milestones:['Research'],progress:36});const migrated=normalizeGoal(old);
 assert.equal(migrated.name,old.name);assert.deepEqual(migrated.milestones,['Research']);assert.equal(migrated.progress,36);assert.equal(migrated.status,'active');assert.equal(migrated.originalInput,old.name);assert.ok(migrated.createdAt);assert.ok(migrated.updatedAt);
});

test('task-linked goal and milestone progress recalculates from completed work',()=>{
 const stage={id:'m1',title:'Prepare',status:'not_started' as const,order:0};const current=goal({milestoneDetails:[stage]});const tasks=[task({id:'a',title:'Find requirements',milestone:'Prepare',milestoneId:'m1',done:true}),task({id:'b',title:'Draft outline',milestone:'Prepare',milestoneId:'m1'})];
 assert.equal(tasksForGoal(current,tasks).length,2);assert.equal(milestoneTasks(current,stage,tasks).length,2);assert.equal(milestoneProgress(current,stage,tasks),50);assert.equal(goalProgress(current,tasks),50);assert.equal(goalProgress(current,tasks.slice(0,1)),100);
});

test('goal next task follows milestone order and then deadline',()=>{
 const current=goal({milestoneDetails:[{id:'m1',title:'Start',order:0},{id:'m2',title:'Finish',order:1}]});const tasks=[task({id:'later',milestoneId:'m2',milestone:'Finish',dueDate:'2026-11-24'}),task({id:'first',milestoneId:'m1',milestone:'Start',dueDate:'2026-11-25'}),task({id:'done',milestoneId:'m1',milestone:'Start',done:true,dueDate:'2026-11-20'})];
 assert.equal(nextGoalTask(current,tasks)?.id,'first');
});

test('manual progress remains available before tasks or a structured breakdown exist',()=>{
 assert.equal(goalProgress(goal({progress:42}),[]),42);assert.equal(goalProgress(goal({progress:42,milestoneDetails:[{id:'m',title:'Step',status:'not_started'}]}),[]),0);
});

test('stalled detection excludes paused and completed goals',()=>{
 const old='2026-10-01T00:00:00.000Z';const current=goal({createdAt:old,updatedAt:old});const open=task({createdAt:old,updatedAt:old});const now=new Date('2026-11-23T00:00:00.000Z').getTime();
 assert.equal(isStalledGoal(current,[open],now),true);assert.equal(isStalledGoal({...current,status:'paused'},[open],now),false);assert.equal(isStalledGoal({...current,status:'completed'},[open],now),false);
});
