import {type Task} from './types.ts';

export type TaskView='all'|'inbox'|'todo'|'in_progress'|'completed'|'overdue'|'upcoming'|'unscheduled';

export function taskMatchesView(task:Task,today:string,view:TaskView):boolean{
  const due=task.dueDate||task.date||'';
  const scheduled=task.scheduledDate||(task.showCalendar?task.date:'');
  switch(view){
    case 'inbox':return task.status==='inbox';
    case 'todo':return !task.done&&task.status!=='in_progress'&&task.status!=='inbox';
    case 'in_progress':return !task.done&&task.status==='in_progress';
    case 'completed':return task.done||task.status==='completed';
    case 'overdue':return !task.done&&Boolean(due)&&due<today;
    case 'upcoming':{const date=scheduled||due;return !task.done&&Boolean(date)&&date>=today&&date<=addDays(today,7)}
    case 'unscheduled':return !task.done&&!scheduled;
    default:return true;
  }
}

function addDays(day:string,count:number):string{
  const d=new Date(`${day}T12:00:00`);d.setDate(d.getDate()+count);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
