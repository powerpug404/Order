import type {Task} from './types.ts';
export type RescheduleReason='ran_out_of_time'|'more_important'|'took_longer'|'waiting'|'hard_to_start'|'low_energy'|'not_important'|'other';
export type RescheduleAction='tomorrow'|'unschedule'|'more_time'|'break_down'|'lighter'|'lower_priority'|'edit';
export type RescheduleSuggestion={label:string;action:RescheduleAction};
const suggestions:Record<RescheduleReason,RescheduleSuggestion[]>={
 ran_out_of_time:[{label:'Find another time',action:'tomorrow'},{label:'Give this more time',action:'more_time'},{label:'Leave it unscheduled',action:'unschedule'}],
 more_important:[{label:'Rebalance my day',action:'tomorrow'},{label:'Find another time',action:'tomorrow'},{label:'Keep it unscheduled',action:'unschedule'}],
 took_longer:[{label:'Update the estimate',action:'more_time'},{label:'Break it into steps',action:'break_down'},{label:'Choose another time',action:'tomorrow'}],
 waiting:[{label:'Leave it unscheduled',action:'unschedule'},{label:'Set a follow-up time',action:'edit'},{label:'Keep the current plan',action:'edit'}],
 hard_to_start:[{label:'Break it into steps',action:'break_down'},{label:'Make it smaller',action:'more_time'},{label:'Choose an easier task',action:'lighter'}],
 low_energy:[{label:'Show me a lighter task',action:'lighter'},{label:'Move this to tomorrow',action:'tomorrow'},{label:'Leave it unscheduled',action:'unschedule'}],
 not_important:[{label:'Lower the priority',action:'lower_priority'},{label:'Review this task',action:'edit'},{label:'Keep it for later',action:'unschedule'}],
 other:[{label:'Choose another time',action:'tomorrow'},{label:'Edit task details',action:'edit'},{label:'Leave it unscheduled',action:'unschedule'}]
};
export function rescheduleSuggestions(reason:RescheduleReason):RescheduleSuggestion[]{return suggestions[reason].map(x=>({...x}))}

/** Prepares a later planned date while keeping the task deadline intact. */
export function prepareTaskReschedule(task:Task,targetDate:string):Task{return{...task,date:task.dueDate||task.date||'',dueDate:task.dueDate||task.date||'',scheduledDate:targetDate,time:'',showCalendar:Boolean(targetDate),postponed:(task.postponed||0)+1}}
