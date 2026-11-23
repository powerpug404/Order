import type {State} from './types';
const day=(n:number)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const seed:State={
 calendars:[{id:'business',name:'Personal',color:'#71856A',visible:true,isDefault:true}],
 tasks:[{id:'t1',title:'Review your priorities',date:day(0),time:'',duration:15,priority:5,goal:'',calendar:'business',done:false,postponed:0},{id:'t2',title:'Plan one thing for tomorrow',date:day(1),time:'',duration:10,priority:4,goal:'',calendar:'business',done:false,postponed:0}],
 events:[],
 goals:[],
 captures:[],
 entries:[],
 settings:{name:'Alex Morgan',workDays:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],restDay:'Sunday',accountability:'Balanced',notifications:true,theme:'Dark',vacation:false,dailyCapacityMinutes:240},streak:12,longest:24,restHonored:18
};
