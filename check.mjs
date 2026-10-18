import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {lessons as basicLessons} from './dist/lessons.js';
import {toyProject,toyGeometry,toySpots} from './dist/project.js';
import {extraProjects,projectCatalog,extraGeometry,extraSpots} from './dist/projects-extra.js';
import {planetaryProject,planetaryCatalog,planetaryGeometry,planetarySpots,planetaryId,foundationIds,foundationsComplete,gearMotion} from './dist/project-planetary.js';
import {gearProject,gearGeometry,gearSpots} from './dist/gear-project.js';
const lessons=[toyProject,...extraProjects,gearProject,planetaryProject,...basicLessons];
import {sources,chapters} from './dist/reference.js';
const app=fs.readFileSync(new URL('./dist/app.js',import.meta.url),'utf8');
const nodes=new Map();
const document={querySelector(key){if(!nodes.has(key))nodes.set(key,{innerHTML:'',style:{},clientWidth:1060});return nodes.get(key)},querySelectorAll(){return[]}};
const c=vm.createContext({document,basicLessons,toyProject,toyGeometry,toySpots,extraProjects,projectCatalog,extraGeometry,extraSpots,planetaryProject,planetaryCatalog,planetaryGeometry,planetarySpots,planetaryId,foundationIds,foundationsComplete,gearProject,gearGeometry,gearSpots,sources,chapters,progressStorage:{getItem(){return'{}'}},logActivity(){},applyFit(){},highlight(){},console});
vm.runInContext(app.replace(/^import .*;$/gm,'').split('function applyFit()')[0],c);
let count=0;
for(let l=0;l<lessons.length;l++){
 assert.ok(lessons[l].refs.every(x=>sources[x]),'Every lesson must have known sources');
 for(let i=0;i<=lessons[l].steps.length;i++){
  vm.runInContext(`li=${l};si=${i};renderSim()`,c);
  const html=nodes.get('#fusion').innerHTML;
  assert.ok(!html.includes('undefined'),'No missing UI data');
  if(i<lessons[l].steps.length){const s=lessons[l].steps[i];assert.ok(html.includes(`data-key="${s.target}"`),`${lessons[l].id} step ${i}: missing ${s.target}`);if(s.value!==undefined)assert.ok(html.includes(`<input id="f-${s.target}"`));if(s.select!==undefined)assert.ok(html.includes(s.select));count++;}
 }
}
assert.equal(chapters.flatMap(x=>x.rows).length,76);
assert.ok(lessons.every(x=>x.steps.length>2));
console.log(`PASS: ${lessons.length} lessons, ${count} interactive steps, all targets and input fields render; 76 reference operations.`);

const bases=[toyProject,...extraProjects];
assert.equal(foundationsComplete(new Set(),{},bases),false);
for(let mask=0;mask<8;mask++){const done=new Set(bases.filter((p,i)=>mask&(1<<i)).map(p=>p.id));assert.equal(foundationsComplete(done,{},bases),mask===7);}
const completed=Object.fromEntries(bases.map(p=>[p.id,{step:p.steps.length,skipped:false}]));
assert.equal(foundationsComplete(new Set(),completed,bases),true);
for(const p of bases){assert.equal(foundationsComplete(new Set(),{...completed,[p.id]:{step:p.steps.length,skipped:true}},bases),false);}
for(const angle of [0,60,360,720,-360]){const m=gearMotion(angle);assert.ok(Math.abs(16*(m.sun-m.carrier)+80*(m.ring-m.carrier))<1e-8);assert.ok(Math.abs(32*(m.planet-m.carrier)+16*(m.sun-m.carrier))<1e-8);}
assert.deepEqual(gearMotion(360),{sun:360,ring:0,carrier:60,planet:-90,planetRelative:-150});
console.log('PASS: all prerequisite combinations, skipped completion, and planetary motion equations.');
