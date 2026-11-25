export type OrderedCalendar={id:string};
export function moveCalendar<T extends OrderedCalendar>(calendars:T[],id:string,direction:-1|1):T[]{
  const current=calendars.findIndex(calendar=>calendar.id===id),target=current+direction;
  if(current<0||target<0||target>=calendars.length)return calendars;
  const next=[...calendars];[next[current],next[target]]=[next[target],next[current]];return next;
}
