import type {Entry,State,TimerCategory} from './types';

export function finalizeTimerEntry(active:NonNullable<State['activeTimer']>,categories:TimerCategory[],end:string,id:string):Entry{
 const category=categories.find(c=>c.id===active.categoryId);
 return{id,project:category?.name||active.project,start:active.start,end,notes:'',goal:'',categoryId:category?.id||active.categoryId,color:category?.color,taskId:active.taskId,projectId:active.projectId};
}
