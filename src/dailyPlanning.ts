import type { Entry, EventItem, Goal, Project, Task } from './types';
import { nextMoveScore, legacyPriority } from './aiService.ts';

export type DailyPriority = 'Must Do' | 'Should Do' | 'Could Do';
export type PlanItem = { taskId: string; date: string; time: string; reason: string; sourceUpdatedAt?:string };
export type TimelineEntry = { kind:'event'|'task'|'work'; id:string; title:string; start:string; end:string; calendar?:string; item:EventItem|Task|Entry; conflict:boolean };
export function prioritiesForDay(tasks: Task[], goals: Goal[], date: string, projects:Project[] = []) {
  const active = tasks.filter(t => !t.done && (t.showToday !== false || Boolean((t.dueDate||t.date)&&(t.dueDate||t.date)<=date) || (t.scheduledDate||(t.showCalendar?t.date:''))===date) && !(t.dependencies || []).some(id => tasks.some(d => d.id === id && !d.done)));
  const rows = active.map(task => {
    const due = task.dueDate || task.date;
    const scheduled = task.scheduledDate || (task.showCalendar ? task.date : '');
    const baseScore = nextMoveScore(task, goals, new Date(date + 'T12:00:00')).score;
    const linkedProject=projects.find(p=>p.id===task.projectId||(!task.projectId&&task.project?.trim().toLowerCase()===p.name.trim().toLowerCase()));
    const activeProject=Boolean(linkedProject&&linkedProject.status==='active');
    const nextMilestoneDate=linkedProject?.milestones.filter(m=>m.status!=='completed'&&m.targetDate).map(m=>m.targetDate!).sort()[0];
    const projectDeadline=linkedProject?.targetDate&&nextMilestoneDate?([linkedProject.targetDate,nextMilestoneDate].sort()[0]):linkedProject?.targetDate||nextMilestoneDate;
    const projectBonus=activeProject?(5-linkedProject!.priority)*2+(projectDeadline&&projectDeadline<=date?5:projectDeadline&&projectDeadline<=new Date(new Date(date+'T12:00:00').getTime()+3*86400000).toISOString().slice(0,10)?2:0):0;
    const score=baseScore+projectBonus;
    const linkedGoal=goals.find(goal=>goal.id===task.goalId||goal.name===task.goal);
    const activeGoal=Boolean(linkedGoal&&(!linkedGoal.status||linkedGoal.status==='active'));
    const category: DailyPriority = due && due <= date || scheduled === date || (task.priorityLevel || legacyPriority(task.priority)) === 1 ? 'Must Do' : activeGoal || activeProject || score >= 43 || (task.priorityLevel || legacyPriority(task.priority)) === 2 ? 'Should Do' : 'Could Do';
    const why = due && due < date ? `Overdue since ${due}.` : due === date ? 'Due today.' : scheduled === date ? 'Already scheduled for today.' : activeGoal ? `Supports ${linkedGoal!.name}.` : activeProject ? `Moves ${linkedProject!.name} forward.` : `Priority and importance score ${Math.round(score)}.`;
    return { task, category, score, why };
  }).sort((a,b) => b.score - a.score);
  return rows;
}
export function workloadForDay(tasks: Task[], events: EventItem[], date: string, settings?: {workStart?:string;workEnd?:string;workDays?:string[];dailyCapacityMinutes?:number}) {
  const planned = tasks.filter(t => !t.done && (t.scheduledDate || (t.showCalendar ? t.date : '')) === date);
  const scheduledEvents = events.filter(e => e.date === date && e.status !== 'canceled');
  const taskMinutes = planned.reduce((n,t) => n + (t.duration || 0), 0);
  const eventMinutes = scheduledEvents.reduce((n,e) => n + (e.allDay?1440:(e.duration || (e.start && e.end ? Math.max(0,(Number(e.end.slice(0,2))*60+Number(e.end.slice(3,5)))-(Number(e.start.slice(0,2))*60+Number(e.start.slice(3,5)))) : 0))), 0);
  const known=taskMinutes+eventMinutes;
  const dayName=new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'});
  const hoursKnown=Boolean(settings?.workStart&&settings?.workEnd&&(!settings.workDays?.length||settings.workDays.includes(dayName)));
  const windowMinutes=hoursKnown?Math.max(0,(Number(settings!.workEnd!.slice(0,2))*60+Number(settings!.workEnd!.slice(3,5)))-(Number(settings!.workStart!.slice(0,2))*60+Number(settings!.workStart!.slice(3,5)))):undefined;
  const availableMinutes=windowMinutes===undefined?undefined:Math.max(0,Math.min(windowMinutes-eventMinutes,settings?.dailyCapacityMinutes||Infinity));
  const remainingMinutes=availableMinutes===undefined?undefined:Math.max(0,availableMinutes-taskMinutes);
  const ratio=availableMinutes?known/availableMinutes:0;
  const status=availableMinutes===undefined?'Unknown':availableMinutes===0?(known?'Overloaded':'Light'):ratio<.5?'Light':ratio<=.75?'Balanced':ratio<=1?'Busy':'Overloaded';
  return { taskMinutes, eventMinutes, totalMinutes: known, availableMinutes, remainingMinutes, status } as const;
}
export function timelineForDay(tasks:Task[],events:EventItem[],date:string,settings?:{workStart?:string;workEnd?:string;workDays?:string[]},workEntries:Entry[]=[]) {
  const toMinutes=(time:string)=>/^\d{2}:\d{2}$/.test(time)?Number(time.slice(0,2))*60+Number(time.slice(3,5)):undefined;
  const localDate=(value:string)=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const localTime=(value:string)=>{const d=new Date(value);return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
  const entries:TimelineEntry[]=[];
  for(const event of events.filter(e=>e.date===date&&e.status!=='canceled')){
    const start=event.allDay?'00:00':event.start||'';
    const end=event.allDay?'23:59':event.end||'';
    entries.push({kind:'event',id:event.id,title:event.title,start,end,calendar:event.calendar,item:event,conflict:false});
  }
  for(const task of tasks.filter(t=>!t.done&&(t.scheduledDate||(t.showCalendar?t.date:''))===date&&t.time)){
    entries.push({kind:'task',id:task.id,title:task.title,start:task.time,end:task.duration?`${String(Math.floor((toMinutes(task.time)!+task.duration)/60)%24).padStart(2,'0')}:${String((toMinutes(task.time)!+task.duration)%60).padStart(2,'0')}`:'',calendar:task.calendar,item:task,conflict:false});
  }
  for(const entry of workEntries.filter(e=>localDate(e.start)===date))entries.push({kind:'work',id:entry.id,title:entry.project||entry.notes||'Focus session',start:localTime(entry.start),end:localTime(entry.end),calendar:entry.color,item:entry,conflict:false});
  for(const entry of entries){
    if(entry.kind==='work')continue;
    const start=toMinutes(entry.start),end=entry.kind==='event'&&((entry.item as EventItem).allDay)?1440:toMinutes(entry.end);
    if(start===undefined||end===undefined)continue;
    entry.conflict=entries.some(other=>{
      if(other.id===entry.id&&other.kind===entry.kind)return false;
      const otherStart=toMinutes(other.start),otherEnd=other.kind==='event'&&((other.item as EventItem).allDay)?1440:toMinutes(other.end);
      return otherStart!==undefined&&otherEnd!==undefined&&start<otherEnd&&end>otherStart;
    });
  }
  entries.sort((a,b)=>(toMinutes(a.start)??0)-(toMinutes(b.start)??0));
  const weekday=new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'});
  const known=Boolean(settings?.workStart&&settings?.workEnd&&(!settings.workDays?.length||settings.workDays.includes(weekday)));
  const gaps:{start:string;end:string;minutes:number}[]=[];
  if(known){
    let cursor=toMinutes(settings!.workStart!)!;const dayEnd=toMinutes(settings!.workEnd!)!;
    const busy=entries.map(e=>{const start=toMinutes(e.start)??0;const end=e.kind==='event'&&(e.item as EventItem).allDay?1440:toMinutes(e.end)??start;return[start,end] as [number,number]}).sort((a,b)=>a[0]-b[0]);
    for(const [start,end] of busy){if(start>cursor)gaps.push({start:`${String(Math.floor(cursor/60)).padStart(2,'0')}:${String(cursor%60).padStart(2,'0')}`,end:`${String(Math.floor(start/60)).padStart(2,'0')}:${String(start%60).padStart(2,'0')}`,minutes:start-cursor});cursor=Math.max(cursor,end)}
    if(dayEnd>cursor)gaps.push({start:`${String(Math.floor(cursor/60)).padStart(2,'0')}:${String(cursor%60).padStart(2,'0')}`,end:`${String(Math.floor(dayEnd/60)).padStart(2,'0')}:${String(dayEnd%60).padStart(2,'0')}`,minutes:dayEnd-cursor});
  }
  return {entries,gaps,availabilityKnown:known};
}
export function proposeDayPlan(tasks: Task[], goals: Goal[], events: EventItem[], date: string, settings?: {workStart?:string;workEnd?:string;breakMinutes?:number;planningStyle?:'Flexible'|'Structured'|'Balanced'|'Minimal';preferredWorkload?:'light'|'balanced'|'full';dailyCapacityMinutes?:number;workDays?:string[];dailyChoices?:Record<string,string>;projects?:Project[]}) {
  const dayName=new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'});
  const workingDay=!settings?.workDays?.length||settings.workDays.includes(dayName);
  const maxMinutes=settings?.dailyCapacityMinutes;
  const knownWindow=Boolean(settings?.workStart&&settings?.workEnd&&workingDay);
  const toMinutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3,5));
  let cursor=knownWindow?toMinutes(settings!.workStart!):0;
  const end=knownWindow?toMinutes(settings!.workEnd!):0;
  const intervals=events.filter(e=>e.date===date&&e.status!=='canceled').map(e=>e.allDay?[0,1440] as [number,number]:e.start&&e.end?[toMinutes(e.start),toMinutes(e.end)] as [number,number]:null).filter((x):x is [number,number]=>Boolean(x)).sort((a,b)=>a[0]-b[0]);
  let allocated=0;
  const styleLimit=knownWindow?settings?.planningStyle==='Minimal'?1:settings?.planningStyle==='Balanced'?3:4:settings?.planningStyle==='Minimal'?1:settings?.planningStyle==='Balanced'?3:2;const workloadLimit=settings?.preferredWorkload==='light'?1:styleLimit;const rows=prioritiesForDay(tasks,goals,date,settings?.projects).map(x=>({...x,category:settings?.dailyChoices?.[x.task.id]||x.category})).filter(x=>x.category!=='Could Do'&&x.category!=='dismissed'&&(workingDay||x.category==='Must Do')).slice(0,workloadLimit);
  const plan:PlanItem[]=[];
  for(const {task,why} of rows){
    const duration=task.duration||0;
    if(maxMinutes&&allocated+duration>maxMinutes)continue;
    let time='';
    if(knownWindow&&duration>0){
      let start=cursor;
      for(const [busyStart,busyEnd] of intervals){if(start+duration<=busyStart)break;if(start<busyEnd&&start+duration>busyStart)start=busyEnd;}
      if(start+duration>end)continue;
      time=`${String(Math.floor(start/60)).padStart(2,'0')}:${String(start%60).padStart(2,'0')}`;
      cursor=start+duration+(settings?.planningStyle==='Structured'?Math.max(0,settings.breakMinutes||0):0);
    }
    allocated+=duration;
    plan.push({taskId:task.id,date,time,reason:duration?why:`${why} Duration is not estimated.`,sourceUpdatedAt:task.updatedAt});
  }
  return plan;
}
