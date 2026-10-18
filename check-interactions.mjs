import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {lessons as basicLessons} from './dist/lessons.js';
import {toyProject,toyGeometry,toySpots} from './dist/project.js';
import {extraProjects,projectCatalog,extraGeometry,extraSpots} from './dist/projects-extra.js';
import {planetaryProject,planetaryCatalog,planetaryGeometry,planetarySpots,planetaryId,foundationIds,foundationsComplete} from './dist/project-planetary.js';
import {sources,chapters} from './dist/reference.js';
const code=fs.readFileSync('dist/app.js','utf8').replace(/^import .*;$/gm,'');
const storage=new Map(),nodes=new Map();
const node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',style:{},checked:false,events:{},classList:{toggle(){},remove(){}},addEventListener(k,v){this.events[k]=v;},setAttribute(){},remove(){},close(){this.open=false;},showModal(){this.open=true;}});return nodes.get(key);};
const context={document:{querySelector:node,querySelectorAll(){return[];}},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},window:{addEventListener(){}},setTimeout(){},matchMedia:()=>({matches:true}),basicLessons,toyProject,toyGeometry,toySpots,extraProjects,projectCatalog,extraGeometry,extraSpots,planetaryProject,planetaryCatalog,planetaryGeometry,planetarySpots,planetaryId,foundationIds,foundationsComplete,sources,chapters};
const c=vm.createContext(context),run=x=>vm.runInContext(x,c);
run(code);
run('start(3)');assert.equal(run('li'),0,'locked direct start stays in base project');assert.ok(node('#drawer-content').innerHTML.includes('disabled'));
const event=(type,arg)=>node('#fusion').events[type](arg);
const click=key=>event('click',{target:{closest:s=>s==='button[data-key]'?{dataset:{key}}:null}});
function act(st){
 if(st.value!==undefined){const naming=/name$/.test(st.target),value=naming?'בדיקה <שם> & 42':st.value,target={dataset:{key:st.target},value,matches(){return true;},focus(){}};if(naming){target.value='';event('keydown',{key:'Enter',target,preventDefault(){}});assert.ok(node('#feedback').textContent.includes('שם'));target.value=value;}else{target.value='wrong';const before=run('si');event('keydown',{key:'Enter',target,preventDefault(){}});assert.equal(run('si'),before);target.value=value;}event('input',{target});event('keydown',{key:'Enter',target,preventDefault(){}});
 }else if(st.select!==undefined)event('change',{target:{dataset:{key:st.target},value:st.select,matches(){return true;}}});else click(st.target);
}
let count=0;
for(let i=0;i<4;i++){run(`start(${i})`);const project=run('current()');for(let j=0;j<project.steps.length;j++){act(project.steps[j]);assert.equal(run('si'),j+1,project.id+' '+j);count++;}assert.ok(run('done.has(current().id)'));if(i<2)assert.equal(run('isUnlocked(planetaryProject)'),false);if(i===2)assert.equal(run('isUnlocked(planetaryProject)'),true);}
assert.ok(node('#fusion').innerHTML.includes('בדיקה &lt;שם&gt; &amp; 42'));
run('start(3,true)');assert.equal(run('si'),planetaryProject.steps.length);assert.equal(run("values['new-name']"),'בדיקה <שם> & 42');
run('done.clear();projectProgress={};start(0)');node('#skip').onclick();while(run('step()'))run('advance()');assert.equal(run('done.has(toyProject.id)'),false);
for(let i=1;i<=2;i++){run(`start(${i});while(step())advance()`);}assert.equal(run('isUnlocked(planetaryProject)'),false,'one skipped base cannot unlock');
run('li=3;persist()');
const reboot=vm.createContext({...context});vm.runInContext(code,reboot);assert.equal(vm.runInContext('li',reboot),0,'saved locked project falls back safely');
console.log(`PASS: ${count} project interactions, name escaping, numeric rejection, persisted names, completion unlock, skipped base and locked reload.`);

