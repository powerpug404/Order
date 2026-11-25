import test from 'node:test';
import assert from 'node:assert/strict';
import { prioritiesForDay, proposeDayPlan, timelineForDay, workloadForDay } from '../src/dailyPlanning.ts';
import type { Entry, EventItem, Goal, Task } from '../src/types.ts';

const date='2026-11-23';
const task=(id:string,changes:Partial<Task>={}):Task=>({id,title:id,date:'',dueDate:'',scheduledDate:'',time:'',duration:30,priority:5,priorityLevel:3,goal:'',calendar:'c',done:false,postponed:0,showToday:true,showCalendar:false,...changes});
const goal=(name:string):Goal=>({id:name,name,category:'Personal',description:'',priority:7,target:'',progress:30,milestones:[]});
const event=(changes:Partial<EventItem>={}):EventItem=>({id:'e',title:'Meeting',date,start:'10:00',end:'11:00',calendar:'c',...changes});

test('daily priorities distinguish due, scheduled, goal-linked and optional tasks',()=>{
 const rows=prioritiesForDay([
  task('due',{dueDate:date}),
  task('scheduled',{scheduledDate:date}),
  task('goal',{goal:'Fitness'}),
  task('optional',{priorityLevel:4,importance:1,impact:1,urgency:1,confidence:1})
 ],[goal('Fitness')],date);
 assert.equal(rows.find(x=>x.task.id==='due')?.category,'Must Do');
 assert.equal(rows.find(x=>x.task.id==='scheduled')?.category,'Must Do');
 assert.equal(rows.find(x=>x.task.id==='goal')?.category,'Should Do');
 assert.equal(rows.find(x=>x.task.id==='optional')?.category,'Could Do');
});

test('undated goal work stays off Today until selected, while due work still appears',()=>{
 const date='2026-11-23';const fitness=goal('Fitness');const unplanned=task('goal-step',{goal:'Fitness',showToday:false,showCalendar:false,dueDate:'',date:''});
 assert.equal(prioritiesForDay([unplanned],[fitness],date).length,0);
 assert.equal(prioritiesForDay([{...unplanned,dueDate:date}],[fitness],date)[0]?.category,'Must Do');
});

test('archived goal tasks do not receive active-goal priority',()=>{
 const row=task('old-goal',{goal:'Fitness',priorityLevel:3});const fitness={...goal('Fitness'),status:'archived' as const};
 assert.equal(prioritiesForDay([row],[fitness],'2026-11-23')[0]?.category,'Could Do');
});

test('workload counts only scheduled task time and actual event duration',()=>{
 const result=workloadForDay([task('planned',{scheduledDate:date,duration:45}),task('unscheduled',{duration:60})],[event()],date);
 assert.equal(result.taskMinutes,45);
 assert.equal(result.eventMinutes,60);
 assert.equal(result.totalMinutes,105);
 assert.equal(result.availableMinutes,undefined);
 const withHours=workloadForDay([task('planned',{scheduledDate:date,duration:45})],[event()],date,{workStart:'09:00',workEnd:'17:00',workDays:['Monday']});
 assert.equal(withHours.availableMinutes,420);
 assert.equal(withHours.remainingMinutes,375);
 const blocked=workloadForDay([], [event({allDay:true,start:'',end:''})],date,{workStart:'09:00',workEnd:'17:00',workDays:['Monday']});
 assert.equal(blocked.availableMinutes,0);
 assert.equal(blocked.status,'Overloaded');
});

test('draft leaves times unknown unless work hours are configured',()=>{
 const rows=[task('first',{dueDate:date}),task('second',{dueDate:date,priorityLevel:2})];
 const result=proposeDayPlan(rows,[],[],date,{});
 assert.ok(result.length<=2);
 assert.ok(result.every(x=>x.time===''));
});

test('draft places known duration around calendar commitments and respects capacity',()=>{
 const rows=[task('first',{dueDate:date,duration:60}),task('second',{dueDate:date,duration:60,priorityLevel:2})];
 const result=proposeDayPlan(rows,[],[event()],date,{workStart:'09:00',workEnd:'12:00',breakMinutes:15,dailyCapacityMinutes:90,workDays:['Monday']});
 assert.equal(result.length,1);
 assert.equal(result[0].time,'09:00');
});

test('draft shifts later tasks past events and structured breaks',()=>{
 const rows=[task('first',{dueDate:date,duration:60,priorityLevel:1}),task('second',{dueDate:date,duration:60,priorityLevel:2})];
 const result=proposeDayPlan(rows,[],[event()],date,{workStart:'09:00',workEnd:'13:00',breakMinutes:15,planningStyle:'Structured',dailyCapacityMinutes:150,workDays:['Monday']});
 assert.deepEqual(result.map(x=>x.time),['09:00','11:00']);
});

test('draft respects daily manual category changes and removals',()=>{
 const rows=[task('must',{dueDate:date,priorityLevel:1}),task('should',{goal:'Fitness'})];
 const result=proposeDayPlan(rows,[goal('Fitness')],[],date,{dailyChoices:{must:'dismissed',should:'Could Do'}});
 assert.deepEqual(result,[]);
});

test('timeline flags timed conflicts, exposes reliable gaps, and leaves untimed tasks out',()=>{
 const scheduled=task('scheduled',{scheduledDate:date,time:'10:30',duration:45});
 const untimed=task('untimed',{scheduledDate:date,time:'',duration:30});
 const result=timelineForDay([scheduled,untimed],[event()],date,{workStart:'09:00',workEnd:'13:00',workDays:['Monday']});
 assert.equal(result.entries.length,2);
 assert.equal(result.entries.every(x=>x.conflict),true);
 assert.ok(result.gaps.some(g=>g.start==='09:00'&&g.end==='10:00'&&g.minutes===60));
});

test('timeline includes logged work blocks without treating them as conflicts',()=>{
 const start=new Date(`${date}T09:00:00`).toISOString(),end=new Date(`${date}T09:30:00`).toISOString();
 const entry:Entry={id:'log',project:'Focus block',start,end,notes:'',goal:'Fitness',color:'#71856A'};
 const result=timelineForDay([],[],date,undefined,[entry]);
 assert.equal(result.entries.length,1);
 assert.equal(result.entries[0].kind,'work');
 assert.equal(result.entries[0].title,'Focus block');
 assert.equal(result.entries[0].conflict,false);
});

test('active Project priority informs daily recommendations without outranking urgent standalone work',()=>{
 const candidate=task('project-step',{title:'Install shelves',dueDate:'',date:'',scheduledDate:'',priorityLevel:4,priority:2,projectId:'p1',project:'Library refresh',showToday:true});
 const standalone=task('urgent',{title:'Pay utility bill',dueDate:date,date,scheduledDate:'',priorityLevel:1,priority:10,projectId:undefined,project:'',showToday:true});
 const projects=[{id:'p1',name:'Library refresh',description:'',status:'active' as const,priority:1 as const,goalIds:[],createdAt:'2026-01-01',updatedAt:'2026-01-01',tags:[],milestones:[]}];
 const rows=prioritiesForDay([candidate,standalone],[],date,projects);
 assert.equal(rows.find(x=>x.task.id==='project-step')?.category,'Should Do');
 assert.equal(rows.find(x=>x.task.id==='project-step')?.why,'Moves Library refresh forward.');
 assert.equal(rows.find(x=>x.task.id==='urgent')?.category,'Must Do');
 assert.equal(rows[0].task.id,'urgent');
});
