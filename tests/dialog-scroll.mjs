import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {outputFiles}=await require('esbuild').build({entryPoints:['components/dialog-accessibility.tsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react']});
let cleanup,observer,dialogs=[],mutations=0;
const classes=()=>{const values=new Set();return {contains:k=>values.has(k),toggle:(k,on)=>{mutations++;on?values.add(k):values.delete(k)},remove:k=>values.delete(k)}};
const root={classList:classes()},body={classList:classes(),style:{overflow:'hidden',removeProperty(k){this[k]=''}}};
const previous={isConnected:true,focus(){document.activeElement=this}};
const document={body,documentElement:root,activeElement:previous,querySelectorAll:()=>dialogs,addEventListener(){},removeEventListener(){}};
class Observer{constructor(fn){this.fn=fn;observer=this}observe(){}disconnect(){}}
const module={exports:{}};const context={module,document,MutationObserver:Observer,exports:{},require:(id)=>{assert.equal(id,'react');return {useEffect:fn=>{cleanup=fn()}}}};
vm.runInNewContext(outputFiles[0].text,context);module.exports.default();
assert.equal(body.style.overflow,'');
const locked=()=>root.classList.contains('siraj-dialog-open')&&body.classList.contains('siraj-dialog-open');
function modal(){const button={getClientRects:()=>[{}],focus(){document.activeElement=this}};return {visible:true,getClientRects(){return this.visible?[{}]:[]},querySelectorAll:()=>[button],contains:el=>el===button}}
const first=modal(),second=modal();dialogs=[first];observer.fn();assert.ok(locked());const changes=mutations;
observer.fn();assert.equal(mutations,changes,'Stable DOM mutations must not retrigger class writes');
dialogs=[first,second];observer.fn();assert.ok(locked());dialogs=[first];observer.fn();assert.ok(locked(),'Nested dialog close preserves outer lock');
dialogs=[];observer.fn();assert.ok(!locked());assert.equal(document.activeElement,previous);assert.equal(body.style.overflow,'');
dialogs=[first];first.visible=false;observer.fn();assert.ok(!locked(),'Hidden dialogs cannot lock the page');first.visible=true;observer.fn();assert.ok(locked());cleanup();assert.ok(!locked());
assert.ok(!(await readFile('app/page.tsx','utf8')).includes('document.body.style.overflow'),'Legacy Modal cannot compete for body overflow');
console.log('PASS: stale locks, repeated updates, nested dialogs, hidden dialogs, focus return and unmount cleanup');
