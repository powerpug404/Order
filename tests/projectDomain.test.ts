import test from 'node:test';
import assert from 'node:assert/strict';
import {detachLifeArea,detachProject,normalizeLifeArea,normalizeProject,projectAttention,projectCounts,projectProgress,reconcileTaskMilestoneLinks,reorderById} from '../src/projectDomain.ts';
import {seed} from '../src/data.ts';

const project=normalizeProject({id:'p1',name:'Bathroom refresh',status:'active',priority:1,goalIds:[],tags:[],milestones:[{id:'m1',title:'Install vanity',status:'not_started',order:0}]});
const task=(id:string,extra:any={})=>({...seed.tasks[0],id,title:id,projectId:'p1',project:project.name,goalId:'g1',goal:'Savings',...extra});

test('project progress follows existing task completion and milestone fallback',()=>{
  const tasks=[task('a',{done:true}),task('b')];
  assert.deepEqual(projectCounts(project,tasks),{done:1,total:2,open:[tasks[1]]});
  assert.equal(projectProgress(project,tasks),50);
  const withoutTasks={...project,milestones:[{id:'m1',title:'Stage',status:'completed' as const,order:0},{id:'m2',title:'Next',status:'not_started' as const,order:1}]};
  assert.equal(projectProgress(withoutTasks,[]),50);
  assert.equal(projectProgress({...project,status:'completed'},[]),100);
});

test('legacy task project labels remain visible without fabricating associations',()=>{
  const legacy=task('legacy',{projectId:undefined});
  assert.equal(projectCounts(project,[legacy]).total,1);
});

test('attention highlights overdue project milestones and tasks using real dates',()=>{
  assert.match(projectAttention({...project,milestones:[{id:'late',title:'Late stage',status:'not_started',targetDate:'2026-11-20',order:0}]},[], '2026-11-24'),/overdue milestone/);
  assert.match(projectAttention({...project,milestones:[]},[task('late',{dueDate:'2026-11-20'})],'2026-11-24'),/overdue task/);
});

test('deleting a project or Life Area detaches records without deleting tasks or goals',()=>{
  const state=structuredClone(seed);state.projects=[project];state.lifeAreas=[normalizeLifeArea({id:'a1',name:'Home'})];state.projects[0].lifeAreaId='a1';state.goals=[{id:'g1',name:'Savings',category:'Finance',lifeAreaId:'a1',description:'',priority:3,target:'',progress:0,milestones:[]}];state.tasks=[task('keep')];
  const withoutProject=detachProject(state,'p1');assert.equal(withoutProject.projects.length,0);assert.equal(withoutProject.tasks[0].id,'keep');assert.equal(withoutProject.tasks[0].projectId,undefined);assert.equal(withoutProject.goals.length,1);
  const withoutArea=detachLifeArea(state,'a1');assert.equal(withoutArea.lifeAreas.length,0);assert.equal(withoutArea.projects[0].lifeAreaId,undefined);assert.equal(withoutArea.goals[0].lifeAreaId,undefined);assert.equal(withoutArea.goals[0].category,'Finance');
});

test('life-area ordering changes only adjacent rows',()=>{
  const rows=[{id:'1'},{id:'2'},{id:'3'}];assert.deepEqual(reorderById(rows,'2',1).map(x=>x.id),['1','3','2']);assert.deepEqual(reorderById(rows,'1',-1),rows);
});

test('moving or unassigning a task clears links from its former Project milestones',()=>{
  const state=structuredClone(seed);
  state.projects=[{...project,milestones:[{id:'m1',title:'Build',status:'not_started',order:0,taskIds:['t1']}]},{...project,id:'p2',name:'Fence',milestones:[]}];
  const moved=reconcileTaskMilestoneLinks(state,'t1','p2','Fence');
  assert.deepEqual(moved.projects[0].milestones[0].taskIds,[]);
  assert.deepEqual(reconcileTaskMilestoneLinks(state,'t1',undefined,'').projects[0].milestones[0].taskIds,[]);
});
