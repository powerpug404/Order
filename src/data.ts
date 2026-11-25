import type {State} from './types';
const day=(n:number)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const seed:State={
 calendars:[{id:'business',name:'Personal',color:'#71856A',visible:true,isDefault:true}],
 tasks:[{id:'t1',title:'Review your priorities',date:day(0),time:'',duration:15,priority:5,goal:'',calendar:'business',done:false,postponed:0},{id:'t2',title:'Plan one thing for tomorrow',date:day(1),time:'',duration:10,priority:4,goal:'',calendar:'business',done:false,postponed:0}],
 events:[],
 goals:[],
 projects:[],
 lifeAreas:[],
 captures:[],
 entries:[],
 timeCategories:[{id:'focus',name:'Focus',color:'#9BAA88'}],
 settings:{name:'Alex Morgan',workDays:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],restDay:'Sunday',accountability:'Balanced',notifications:true,theme:'Dark',vacation:false,workStart:'',workEnd:'',breakMinutes:15,planningStyle:'Flexible'},streak:12,longest:24,restHonored:18
};

// Empty production starting state. The sample `seed` above is retained for isolated tests only.
export const emptyState:State={calendars:[{id:'personal',name:'Personal',color:'#71856A',visible:true,isDefault:true}],tasks:[],events:[],goals:[],projects:[],lifeAreas:[],captures:[],entries:[],timeCategories:[{id:'focus',name:'Focus',color:'#9BAA88'}],settings:{name:'',workDays:[],restDay:'',accountability:'Balanced',notifications:false,theme:'Dark',vacation:false,planningStyle:'Flexible',scheduleMode:'open',personalizationEnabled:true},streak:0,longest:0,restHonored:0};

export function hasUsableStoredShape(value:unknown):boolean{
 if(value===null)return true;
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const raw=value as Record<string,unknown>;
 if(!Array.isArray(raw.tasks)||!Array.isArray(raw.calendars))return false;
 for(const key of ['events','goals','projects','lifeAreas','captures','entries','timeCategories'])if(raw[key]!==undefined&&!Array.isArray(raw[key]))return false;
 if(raw.settings!==undefined&&(!raw.settings||typeof raw.settings!=='object'||Array.isArray(raw.settings)))return false;
 for(const key of ['tasks','calendars','events','goals','projects','lifeAreas','captures','entries','timeCategories']){
  const rows=raw[key];if(!Array.isArray(rows))continue;
  if(rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)||typeof (row as Record<string,unknown>).id!=='string'))return false;
 }
 return true;
}
