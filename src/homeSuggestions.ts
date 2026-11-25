import {type Task} from './types.ts';

export type HomeAction={label:string;prompt:string};
export function contextualHomeActions(task:Task|undefined,workloadStatus:string,today:string):HomeAction[]{
  if(!task)return [
    {label:'What should I focus on?',prompt:'Given my tasks, goals, and calendar, what should I focus on next?'},
    {label:'Plan around my commitments',prompt:'Help me plan today around my existing commitments.'},
  ];
  if(task.postponed>=2)return [
    {label:'Make this easier to start',prompt:`Help me make “${task.title}” smaller and easier to start.`},
    {label:'Rebalance my day',prompt:`Rebalance my day around the task “${task.title}”. Show me a realistic proposal.`},
  ];
  const due=task.dueDate||task.date||'';
  if(due&&due<today)return [
    {label:'Rebalance my day',prompt:'Rebalance my day around what is still unfinished. Show a realistic proposal.'},
    {label:'Help me get started',prompt:`Give me a small first step for “${task.title}”.`},
  ];
  if(workloadStatus==='Overloaded')return [
    {label:'Simplify my day',prompt:'My workload looks too full. Suggest a lighter plan for today.'},
    {label:'Show my top priorities',prompt:'Show my top 3 priorities today.'},
  ];
  return [{label:'Help me get started',prompt:`Give me a small first step for “${task.title}”.`}];
}
