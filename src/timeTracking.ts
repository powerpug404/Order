import type {Entry,State,TimerCategory} from './types';

/** Elapsed time is derived from the persisted instant, never interval tick counts. */
export function elapsedSeconds(start: string, now = Date.now()): number {
 const started = Date.parse(start);
 return Number.isFinite(started) ? Math.max(0, Math.floor((now - started) / 1000)) : 0;
}

export function finalizeTimerEntry(active:NonNullable<State['activeTimer']>,categories:TimerCategory[],end:string,id:string):Entry{
 const category=categories.find(c=>c.id===active.categoryId);
 return{id,project:category?.name||active.project,start:active.start,end,notes:'',goal:'',categoryId:category?.id||active.categoryId,color:category?.color,taskId:active.taskId,projectId:active.projectId};
}
