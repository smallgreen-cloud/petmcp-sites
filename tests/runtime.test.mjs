import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { execute } from '../lib/pet-service.mjs';
import { handle } from '../lib/pet-http.mjs';
import { trendGroups } from '../lib/pet-trends.mjs';

let env;
const a = 'synthetic-owner-a', b = 'synthetic-owner-b';
const petData = {name:'合成測試貓',species:'cat',birth_date:null,avatar_id:null};
const labData = pet_id => ({pet_id,date:'2026-11-22',relative_time_label:null,source_kind:'synthetic',attachment_id:null,laboratory:'Synthetic Lab',measurements:[{analyte:'CREA',raw_value:'1.20',unit:'mg/dL',reference_text:'0.8–2.4'}]});
function bindings() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  for (const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort()) db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
  const statement = (sql, values=[]) => ({bind:(...v)=>statement(sql,v),first:async()=>db.prepare(sql).get(...values)??null,all:async()=>({results:db.prepare(sql).all(...values)}),run:async()=>({meta:{changes:Number(db.prepare(sql).run(...values).changes)}})});
  const objects = new Map();
  return {DB:{prepare:sql=>statement(sql),batch:async ss=>{db.exec('BEGIN');try{const r=[];for(const s of ss)r.push(await s.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}},BUCKET:{put:async(key,body,options)=>objects.set(key,{body:new Uint8Array(await new Response(body).arrayBuffer()),options}),get:async key=>{const o=objects.get(key);return o?{body:o.body,arrayBuffer:async()=>o.body.buffer}:null;},delete:async key=>objects.delete(key)},objects};
}
beforeEach(()=>{env=bindings();});
const call=(name,args={},owner=a)=>execute(env,owner,name,args);
const pet=()=>call('create_pet',{data:petData,confirmed:true,idempotency_key:'pet-one'});
const req=(path,body,owner=a,extra={})=>new Request('https://pet.example'+path,{method:body===undefined?'GET':'POST',headers:{...(owner?{'oai-authenticated-user-id':owner}:{}),...(body===undefined?{}:{'content-type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});

test('confirmed writes, idempotency and raw lab values survive reads',async()=>{
  await assert.rejects(call('create_pet',{data:petData,idempotency_key:'x'}),/確認/);
  const p=await pet(); assert.equal((await pet()).id,p.id);
  await assert.rejects(call('create_pet',{data:{...petData,name:'different'},confirmed:true,idempotency_key:'pet-one'}),/重複/);
  const l=await call('record_lab_report',{data:labData(p.id),confirmed:true,idempotency_key:'lab-one'});
  assert.equal((await call('get_record',{id:l.id})).data.measurements[0].raw_value,'1.20');
  assert.equal((await call('list_records',{kind:'lab',pet_id:p.id})).items.length,1);
});
test('all object access is owner-scoped, including foreign keys and audit',async()=>{
  const p=await pet();
  assert.equal((await call('list_records',{},b)).items.length,0);
  await assert.rejects(call('get_record',{id:p.id},b),/找不到/);
  await assert.rejects(call('record_lab_report',{data:labData(p.id),confirmed:true,idempotency_key:'other'},b),/找不到/);
  await assert.rejects(call('update_record',{id:p.id,data:petData,revision:1,confirmed:true},b),/找不到/);
  await assert.rejects(call('delete_record',{id:p.id,revision:1,confirmed:true},b),/找不到/);
  assert.equal((await call('get_audit',{},b)).items.length,0);
});
test('food labels never infer consumption; invalid dates, units and owner fields fail',async()=>{
  const p=await pet();
  const food={product_name:'Synthetic food',ingredients_text:'合成標籤',nutrition:[{name:'蛋白質',raw_value:'30',unit:'%'}],source_kind:'synthetic',attachment_id:null};
  await call('record_food_label',{data:food,confirmed:true,idempotency_key:'food'});
  await assert.rejects(call('record_food_label',{data:{...food,pet_id:p.id},confirmed:true,idempotency_key:'food2'}),/欄位/);
  for(const data of [{...labData(p.id),date:'2026-02-30'},{...labData(p.id),measurements:[{analyte:'CREA',raw_value:'1.2',unit:''}]},{...labData(p.id),owner_id:b}]) await assert.rejects(call('record_lab_report',{data,confirmed:true,idempotency_key:crypto.randomUUID()}));
  await call('record_lab_report',{data:{...labData(p.id),date:null,relative_time_label:'約一個月前'},confirmed:true,idempotency_key:'relative'});
});
test('corrections preserve immutable audit; stale revisions fail; related pet cannot be deleted',async()=>{
  const p=await pet();const l=await call('record_lab_report',{data:labData(p.id),confirmed:true,idempotency_key:'lab'});
  const changed={...l.data,measurements:[{...l.data.measurements[0],raw_value:'1.30'}]};
  const edited=await call('update_record',{id:l.id,data:changed,revision:1,confirmed:true});assert.equal(edited.revision,2);
  await assert.rejects(call('update_record',{id:l.id,data:changed,revision:1,confirmed:true}),/版本/);
  const audit=(await call('get_audit',{id:l.id})).items;assert.equal(audit.length,2);assert.equal(audit.find(x=>x.operation==='update').before.data.measurements[0].raw_value,'1.20');
  await assert.rejects(call('delete_record',{id:p.id,revision:1,confirmed:true}),/相關/);
  await call('delete_record',{id:l.id,revision:2,confirmed:true});await assert.rejects(call('get_record',{id:l.id}));
});
test('care records, pagination and invalid tool requests',async()=>{
  const p=await pet();await call('record_observation',{data:{pet_id:p.id,date:'2026-11-22',category:'飲水',text:'合成紀錄',source_kind:'synthetic',attachment_id:null},confirmed:true,idempotency_key:'care'});
  const page=await call('list_records',{limit:1});assert.equal(page.items.length,1);assert.ok(page.next_cursor);
  assert.equal((await call('list_records',{limit:1,cursor:page.next_cursor})).items.length,1);
  await assert.rejects(call('nonesuch',{}));await assert.rejects(call('list_records',{limit:-1}));
});
test('HTTP fails closed without identity, cross origin, unsupported types and malformed JSON',async()=>{
  assert.equal((await handle(req('/api/state',undefined,null),env)).status,401);
  assert.equal((await handle(req('/api/action',{name:'list_records',arguments:{}},a,{origin:'https://evil.example'}),env)).status,403);
  assert.equal((await handle(req('/api/action',{},a,{'content-type':'text/plain'}),env)).status,415);
  assert.equal((await handle(new Request('https://pet.example/api/action',{method:'POST',headers:{'oai-authenticated-user-id':a,'content-type':'application/json'},body:'no'}),env)).status,400);
  assert.equal((await handle(req('/health'),env)).status,200);
});
test('MCP discovery, list, create/read and tool errors follow JSON-RPC',async()=>{
  const m=async(method,params={})=>(await handle(req('/mcp',{jsonrpc:'2.0',id:1,method,params}),env)).json();
  assert.ok((await m('server/discover')).result.supportedVersions.includes('2026-07-28'));
  assert.ok((await m('tools/list')).result.tools.some(x=>x.name==='create_pet'));
  const p=await m('tools/call',{name:'create_pet',arguments:{data:petData,confirmed:true,idempotency_key:'mcp'}});assert.equal(p.result.isError,false);
  const id=JSON.parse(p.result.content[0].text).id;
  const read=await m('tools/call',{name:'get_record',arguments:{id}});assert.equal(JSON.parse(read.result.content[0].text).data.name,petData.name);
  assert.equal((await m('tools/call',{name:'nonesuch',arguments:{}})).result.isError,true);
  assert.equal((await m('nonesuch')).error.code,-32601);
});
test('private upload, MIME checks, MCP image and attachment ownership',async()=>{
  const png=Uint8Array.from([137,80,78,71,13,10,26,10,0]);
  const upload=async(owner,body,type='image/png')=>handle(new Request('https://pet.example/api/attachments',{method:'POST',headers:{'oai-authenticated-user-id':owner,'content-type':type},body}),env);
  assert.equal((await upload(a,'<svg>','image/svg+xml')).status,415);
  assert.equal((await upload(a,'fake','image/png')).status,400);
  const r=await upload(a,png);assert.equal(r.status,201);const image=await r.json();
  assert.equal((await handle(req('/api/attachments/'+image.id,undefined,b),env)).status,404);
  assert.equal((await handle(req('/api/attachments/'+image.id),env)).headers.get('cache-control'),'no-store');
  const m=await (await handle(req('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_attachment',arguments:{id:image.id}}}),env)).json();assert.equal(m.result.content[0].type,'image');
  assert.equal((await call('list_attachments')).items.length,1);
});
test('export includes photos and audit; restore only into empty owner; purge removes all data',async()=>{
  const p=await pet();
  const photo=await (await handle(new Request('https://pet.example/api/attachments',{method:'POST',headers:{'oai-authenticated-user-id':a,'content-type':'image/png'},body:Uint8Array.from([137,80,78,71,13,10,26,10,0])}),env)).json();
  await call('update_record',{id:p.id,revision:1,data:{...p.data,avatar_id:photo.id},confirmed:true});
  const backup=await call('export_data');assert.equal(backup.records.length,1);assert.ok(!JSON.stringify(backup).includes(a));assert.equal(backup.attachments.length,1);
  await assert.rejects(call('restore_data',{backup,confirmed:true}),/空白/);
  await call('restore_data',{backup,confirmed:true},b);assert.equal((await call('get_record',{id:p.id},b)).data.name,petData.name);assert.equal((await call('get_attachment',{id:photo.id},b)).base64,backup.attachments[0].base64);
  await assert.rejects(call('purge_data',{confirmed:true,confirmation:'wrong'}));
  await call('purge_data',{confirmed:true,confirmation:'DELETE ALL PETMCP DATA'});
  assert.equal((await call('export_data')).records.length,0);assert.equal((await call('get_audit')).items.length,0);
  assert.equal((await call('list_records',{},b)).items.length,1);
  assert.equal(env.objects.size,1);
});
test('trend grouping never merges units, pets or nonnumeric / unknown-date values',()=>{
  const r=(pet_id,unit,date,raw_value)=>({kind:'lab',data:{pet_id,date,measurements:[{analyte:'CREA',unit,raw_value}]}});
  const gs=trendGroups([r('p1','mg/dL','2026-11-22','1.20'),r('p2','mg/dL','2026-11-22','2'),r('p1','µmol/L','2026-11-22','110'),r('p1','mg/dL',null,'3'),r('p1','mg/dL','2026-11-22','>3'),{kind:'care'}]);
  assert.equal(gs.length,3);assert.equal(gs[0].points.length,1);assert.equal(gs[0].points[0].raw,'1.20');
});
test('invalid restore is rejected before any object or database writes',async()=>{
  await assert.rejects(call('restore_data',{confirmed:true,backup:{format:'invalid',records:[],attachments:[],audit:[]}}));
  assert.equal(env.objects.size,0);assert.equal((await call('list_records')).items.length,0);
});
