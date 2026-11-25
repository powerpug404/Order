import type {Goal,GoalMilestone,Task} from './types';

export function tasksForGoal(goal:Goal,tasks:Task[]):Task[]{
 return tasks.filter(task=>task.goalId===goal.id||(!task.goalId&&task.goal===goal.name));
}

export function milestoneTasks(goal:Goal,milestone:GoalMilestone,tasks:Task[]):Task[]{
 return tasksForGoal(goal,tasks).filter(task=>task.milestoneId===milestone.id||(!task.milestoneId&&task.milestone===milestone.title));
}

export function milestoneProgress(goal:Goal,milestone:GoalMilestone,tasks:Task[]):number{
 const related=milestoneTasks(goal,milestone,tasks);
 if(!related.length)return milestone.status==='completed'?100:0;
 return Math.round(related.filter(task=>task.done).length/related.length*100);
}

export function goalProgress(goal:Goal,tasks:Task[]):number{
 const related=tasksForGoal(goal,tasks);
 if(related.length)return Math.round(related.filter(task=>task.done).length/related.length*100);
 const milestones=goal.milestoneDetails||[];
 if(milestones.length)return Math.round(milestones.reduce((sum,item)=>sum+milestoneProgress(goal,item,tasks),0)/milestones.length);
 return Math.max(0,Math.min(100,Number(goal.progress)||0));
}

export function nextGoalTask(goal:Goal,tasks:Task[]):Task|undefined{
 const related=tasksForGoal(goal,tasks).filter(task=>!task.done);
 const order=new Map((goal.milestoneDetails||[]).map((item,index)=>[item.id,index]));
 return related.sort((a,b)=>{
  const am=order.get(a.milestoneId||'')??Number.MAX_SAFE_INTEGER,bm=order.get(b.milestoneId||'')??Number.MAX_SAFE_INTEGER;
  return am-bm||(a.dueDate||a.date||'9999').localeCompare(b.dueDate||b.date||'9999')||(a.priorityLevel||3)-(b.priorityLevel||3)||(a.createdAt||'').localeCompare(b.createdAt||'');
 })[0];
}

export function normalizeGoal(raw:Goal):Goal{
 const now=new Date().toISOString();
 return {...raw,originalInput:raw.originalInput||raw.name,milestones:Array.isArray(raw.milestones)?raw.milestones.filter((x):x is string=>typeof x==='string'):[],milestoneDetails:Array.isArray(raw.milestoneDetails)?raw.milestoneDetails.filter((x):x is GoalMilestone=>Boolean(x&&typeof x.id==='string'&&typeof x.title==='string')).map((x,index)=>({...x,status:x.status||'not_started',order:index})):[],status:raw.status||'active',createdAt:raw.createdAt||now,updatedAt:raw.updatedAt||now};
}

export function isStalledGoal(goal:Goal,tasks:Task[],now=Date.now()):boolean{
 if(goal.status==='paused'||goal.status==='completed'||goal.status==='archived'||goal.status==='upcoming')return false;
 const related=tasksForGoal(goal,tasks);
 if(!related.some(task=>!task.done))return false;
 const activity=[goal.updatedAt,...related.map(task=>task.updatedAt),...related.map(task=>task.completedAt)].filter(Boolean).map(value=>new Date(value as string).getTime()).filter(Number.isFinite);
 const last=activity.length?Math.max(...activity):new Date(goal.createdAt||now).getTime();
 return now-last>14*24*60*60*1000;
}
