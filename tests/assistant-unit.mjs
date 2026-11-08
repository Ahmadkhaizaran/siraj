import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.resolve('wrangler/package.json'));
const {build}=require('esbuild');
await build({entryPoints:['lib/assistant.ts'],outfile:'outputs/assistant-unit.mjs',format:'esm',platform:'node',bundle:true});
const {guide}=await import('../outputs/assistant-unit.mjs');
assert.equal(guide('قراءة المصحف','admin').actions[0].page,'quran');
assert.equal(guide('قراءة المصحف','student').actions[0].page,'quran');
assert.equal(guide('إضافة طالب','primary').actions[0].modal,'student');
assert.ok(!guide('إضافة طالب','teacher').actions.some(a=>a.modal));
assert.ok(!guide('إضافة طالب','admin').actions.some(a=>a.modal==='student'));
assert.ok(!guide('إضافة طالب','student').actions.some(a=>a.modal));
assert.equal(guide('عندي مشكلة','primary').actions[0].page,'support');
assert.equal(guide('عندي مشكلة','admin').actions[0].page,'support');
assert.ok(!guide('عندي مشكلة','student').actions.some(a=>a.page==='support'));
assert.ok(!guide('توزيع الحلقات','teacher').actions.some(a=>a.modal));
assert.equal(guide('تقييم الحفظ','student').actions[0].page,'learning');
assert.equal(guide('كم طالب','primary',{students:12,circles:2}).text.includes('12'),true);
console.log('PASS: contextual assistant navigation respects admin, primary, teacher and student capabilities.');

assert.equal(guide('التواصل مع صاحب المنصة','student').actions[0].href,'tel:+96181358618');
assert.equal(guide('واتساب','teacher').actions[1].href,'https://wa.me/96181358618');
assert.ok(!guide('كيف ألغي حساب','teacher').actions.some(a=>a.page==='team'));
assert.ok(guide('دليل المنصة','student').actions.every(a=>['about','quran','calendar','learning','account'].includes(a.page)));

assert.equal(guide('الحضور والغياب','teacher').actions[0].page,'my-circles');
assert.match(guide('إضافة حساب لفريق التعليم','primary').text,/edu/);

assert.ok(guide('دليل المنصة','teacher').actions.every(a=>!['attendance','progress','team','circles','support'].includes(a.page)&&!a.modal));
