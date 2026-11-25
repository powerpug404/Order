import type {Goal,Task} from './types';

// Local deterministic suggestions. Replace this adapter with a secure server endpoint
// when a real AI backend is available; never put provider keys in the browser bundle.
export type CaptureSuggestion={id:string;text:string;kind:'task'|'event'|'goal'|'note';date?:string;confidence:'high'|'review'};
const uid=()=>Math.random().toString(36).slice(2,9);
const dayKey=(date:Date)=>{const d=new Date(date.getTime()-date.getTimezoneOffset()*60000);return d.toISOString().slice(0,10)};
export function organizeCapture(input:string,now=new Date()):CaptureSuggestion[]{
 const chunks=input.split(/\n|\s+(?:and then|and|also|plus)\s+|[,;]+/i).map(x=>x.trim()).filter(Boolean);
 return chunks.map(text=>{const lower=text.toLowerCase();let kind:CaptureSuggestion['kind']='task';if(/^(idea|goal|i want to|someday|dream):?\b/.test(lower))kind='goal';else if(/\b(meeting|appointment|dinner|call with|event|service)\b/.test(lower))kind='event';else if(/^(note|remember|thought):?\b/.test(lower))kind='note';let date: string|undefined;const dt=new Date(now);if(/\btomorrow\b/.test(lower)){dt.setDate(dt.getDate()+1);date=dayKey(dt)}else if(/\btoday\b/.test(lower))date=dayKey(dt);else{const weekdays=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];const w=weekdays.findIndex(x=>new RegExp(`\\b${x}\\b`).test(lower));if(w>=0){let delta=(w-now.getDay()+7)%7;if(delta===0)delta=7;dt.setDate(dt.getDate()+delta);date=dayKey(dt)}}const cleaned=text.replace(/\b(today|tomorrow|this\s+(?:weekend|week)|on\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/ig,'').trim();return{id:uid(),text:cleaned||text,kind,date,confidence:date||kind!=='task'?'high':'review'}})
}
export function nextMoveScore(task:Task,goals:Goal[],now=new Date()){
 const today=dayKey(now),hasDue=Boolean(task.date),due=task.date||today,days=hasDue?Math.ceil((new Date(due+'T12:00:00').getTime()-new Date(today+'T12:00:00').getTime())/86400000):99;
 const goal=goals.find(g=>(g.id===task.goalId||g.name===task.goal)&&(!g.status||g.status==='active')),level=task.priorityLevel||legacyPriority(task.priority);
 const score=[42,32,20,8][level-1]+Math.max(-16,Math.min(28,(7-days)*4))+(goal?.priority||0)*1.5+(task.importance||5)*1.2+(task.impact||5)*.8+(task.urgency||5)*.8+(task.confidence||5)*.35+Math.min(18,(task.postponed||0)*6)+(task.time?4:0)-(task.effort||task.difficulty||5)*.35;
 const reason=hasDue&&days<0?`It is ${Math.abs(days)} day${days===-1?'':'s'} overdue${goal?` and supports ${goal.name}`:''}.`:hasDue&&days===0?`It is due today${goal?` and supports ${goal.name}`:''}.`:goal?`It moves ${goal.name} forward${hasDue?` and is due ${new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(due+'T12:00:00'))}`:' and matches its importance and impact'}.`:'It ranks well by priority, importance, impact, and how long it has been waiting.';
 return{score,reason}
}
export function legacyPriority(value:number|undefined):1|2|3|4{const n=value??5;return n>=9?1:n>=7?2:n>=4?3:4}
export function suggestBreakdown(title:string):string[]{const lower=title.toLowerCase();if(/remodel|renovate|bathroom|kitchen/.test(lower))return['Define scope and budget','Measure the space and list needs','Compare materials and suppliers','Set a start date and book help','Review the work and finish details'];if(/launch|website|business|project|build/.test(lower))return['Clarify the outcome and deadline','List the first three concrete actions','Gather what you need to begin','Schedule a focused work block','Review progress and choose the next step'];return['Write down what “done” looks like','Identify the first physical action','Gather any materials or information','Schedule a focused time to begin']}
export function suggestMilestones(goal:Goal){return [`Define what success looks like for ${goal.name}`,`Choose one weekly action for ${goal.category}`,`Review progress toward ${goal.target}`]}

export function explicitEventTitle(message:string):string|undefined{
 const quoted=message.match(/\b(?:called|named|titled)\s+[\"“]([^\"”]+)[\"”]/i);
 const match=quoted||message.match(/\b(?:called|named|titled)\s+(.+?)(?=\s+(?:on|for|at|from)\b|[,;.!?]|$)/i);
 const title=match?.[1]?.trim();return title||undefined;
}

export function normalizeEventProposalTitles(message:string,actions:any[]):any[]{
 const explicit=explicitEventTitle(message);
 return actions.map(action=>{if(action?.type!=='event')return action;const title=String(action.title||action.eventTitle||'').trim();return title?{...action,title}:explicit?{...action,title:explicit}:action});
}
