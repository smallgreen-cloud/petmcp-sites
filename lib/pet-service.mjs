import { AppError,ensure,object,fields,str,id,confirmed,normalize,kind,page,checkImage,base64,fromBase64,MAX_BACKUP } from './pet-validation.mjs';
const now=()=>new Date().toISOString(),uuid=()=>crypto.randomUUID();
const sql=(env,q,...args)=>env.DB.prepare(q).bind(...args);
const all=async s=>(await s.all()).results;
const record=row=>({id:row.id,kind:row.kind,data:JSON.parse(row.data),revision:row.revision,created_at:row.created_at,updated_at:row.updated_at});
export async function getRecord(env,owner,value){const row=await sql(env,'SELECT * FROM records WHERE owner=? AND id=?',owner,id(value)).first();ensure(row,'找不到紀錄',404);return record(row);}
export async function attachment(env,owner,value){const row=await sql(env,'SELECT id,mime,size,created_at FROM attachments WHERE owner=? AND id=?',owner,id(value)).first();ensure(row,'找不到附件',404);return row;}
async function references(env,owner,type,data){
  if(data.pet_id)ensure((await getRecord(env,owner,data.pet_id)).kind==='pet','關聯紀錄不是寵物');
  const image=data.avatar_id||data.attachment_id;if(image)await attachment(env,owner,image);
}
function insertRecord(env,owner,r,key=null){return sql(env,'INSERT INTO records (owner,id,kind,pet_id,data,revision,idempotency_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',owner,r.id,r.kind,r.data.pet_id??null,JSON.stringify(r.data),r.revision,key,r.created_at,r.updated_at);}
function auditStatement(env,owner,operation,before,after){return sql(env,'INSERT INTO audit (owner,id,record_id,operation,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?)',owner,uuid(),(after??before).id,operation,before?JSON.stringify(before):null,after?JSON.stringify(after):null,now());}
async function create(env,owner,type,args){
  fields(args,['data','confirmed','idempotency_key']);confirmed(args);const data=normalize(type,args.data),key=str(args.idempotency_key,'重試識別碼',100);
  const existing=await sql(env,'SELECT * FROM records WHERE owner=? AND idempotency_key=?',owner,key).first();
  if(existing){ensure(existing.kind===type&&existing.data===JSON.stringify(data),'重複識別碼對應不同內容',409);return record(existing);}
  await references(env,owner,type,data);const time=now(),r={id:uuid(),kind:type,data,revision:1,created_at:time,updated_at:time};
  try{await env.DB.batch([insertRecord(env,owner,r,key),auditStatement(env,owner,'create',null,r)]);}catch(e){
    if(String(e.message).includes('UNIQUE')){const row=await sql(env,'SELECT * FROM records WHERE owner=? AND idempotency_key=?',owner,key).first();if(row&&row.data===JSON.stringify(data)&&row.kind===type)return record(row);throw new AppError(409,'重複提交衝突，請重新讀取');}throw e;
  }return r;
}
async function update(env,owner,args){
  fields(args,['id','data','revision','confirmed']);confirmed(args);const before=await getRecord(env,owner,args.id);
  ensure(args.revision===before.revision,'版本已變更，請重新讀取後修正',409);
  const data=normalize(before.kind,args.data);await references(env,owner,before.kind,data);
  const after={...before,data,revision:before.revision+1,updated_at:now()};
  // The conditional audit insert and update share one D1 transaction. A stale
  // revision changes neither row, even if another request wins after our read.
  const result=await env.DB.batch([
    sql(env,'INSERT INTO audit (owner,id,record_id,operation,before_json,after_json,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM records WHERE owner=? AND id=? AND revision=?)',owner,uuid(),before.id,'update',JSON.stringify(before),JSON.stringify(after),now(),owner,before.id,before.revision),
    sql(env,'UPDATE records SET data=?,pet_id=?,revision=?,updated_at=? WHERE owner=? AND id=? AND revision=?',JSON.stringify(data),data.pet_id??null,after.revision,after.updated_at,owner,before.id,before.revision),
  ]);ensure(result[1].meta.changes===1,'版本已變更，請重新讀取',409);return after;
}
async function remove(env,owner,args){
  fields(args,['id','revision','confirmed']);confirmed(args);const before=await getRecord(env,owner,args.id);ensure(args.revision===before.revision,'版本已變更',409);
  ensure(!(await sql(env,'SELECT id FROM records WHERE owner=? AND pet_id=? LIMIT 1',owner,before.id).first()),'請先刪除相關紀錄',409);
  const results=await env.DB.batch([
    sql(env,'INSERT INTO audit (owner,id,record_id,operation,before_json,after_json,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM records WHERE owner=? AND id=? AND revision=?)',owner,uuid(),before.id,'delete',JSON.stringify(before),null,now(),owner,before.id,before.revision),
    sql(env,'DELETE FROM records WHERE owner=? AND id=? AND revision=?',owner,before.id,before.revision),
  ]);ensure(results[1].meta.changes===1,'版本已變更',409);return {deleted:before.id,audit_retained:true};
}
async function list(env,owner,args){
  fields(args,['kind','pet_id','limit','cursor']);const {limit,cursor}=page(args),where=['owner=?','id>?'],values=[owner,cursor];
  if(args.kind){where.push('kind=?');values.push(kind(args.kind));}if(args.pet_id){await getRecord(env,owner,args.pet_id);where.push('pet_id=?');values.push(args.pet_id);}
  const rows=await all(sql(env,`SELECT * FROM records WHERE ${where.join(' AND ')} ORDER BY id LIMIT ?`,...values,limit+1));
  return {items:rows.slice(0,limit).map(record),next_cursor:rows.length>limit?rows[limit-1].id:null};
}
async function audit(env,owner,args){fields(args,['id','limit','cursor']);const {limit,cursor}=page(args);const rows=await all(sql(env,`SELECT * FROM audit WHERE owner=? AND id>? ${args.id?'AND record_id=?':''} ORDER BY id LIMIT ?`,owner,cursor,...(args.id?[id(args.id)]:[]),limit+1));return {items:rows.slice(0,limit).map(r=>({id:r.id,record_id:r.record_id,operation:r.operation,before:r.before_json?JSON.parse(r.before_json):null,after:r.after_json?JSON.parse(r.after_json):null,created_at:r.created_at})),next_cursor:rows.length>limit?rows[limit-1].id:null};}
export async function upload(env,owner,bytes,mime){
  checkImage(bytes,mime);const item={id:uuid(),mime,size:bytes.byteLength,created_at:now()};const key=owner+'/'+item.id;
  await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
  try{await sql(env,'INSERT INTO attachments (owner,id,mime,size,created_at) VALUES (?,?,?,?,?)',owner,item.id,mime,item.size,item.created_at).run();}catch(e){await env.BUCKET.delete(key);throw e;}return item;
}
export async function imageData(env,owner,value){const meta=await attachment(env,owner,value);const file=await env.BUCKET.get(owner+'/'+meta.id);ensure(file,'附件儲存體缺少檔案',503);return {meta,file};}
async function exportData(env,owner){
  const rows=await all(sql(env,'SELECT * FROM records WHERE owner=? ORDER BY id LIMIT 10001',owner));
  const photos=await all(sql(env,'SELECT id,mime,size,created_at FROM attachments WHERE owner=? ORDER BY id LIMIT 1001',owner));
  const events=await all(sql(env,'SELECT * FROM audit WHERE owner=? ORDER BY id LIMIT 20001',owner));
  ensure(rows.length<=1000&&photos.length<=100&&events.length<=5000,'資料超過本版可還原備份上限；請先聯絡維護者，勿刪除資料',413);
  ensure(photos.reduce((sum,p)=>sum+p.size,0)<=MAX_BACKUP/2,'附件超過本版備份大小上限；請先逐張下載，勿刪除資料',413);
  const attachments=[];for(const p of photos){const {file}=await imageData(env,owner,p.id);attachments.push({...p,base64:base64(await file.arrayBuffer())});}
  const backup={format:'petmcp-backup/v1',exported_at:now(),records:rows.map(record),attachments,audit:events.map(r=>({id:r.id,record_id:r.record_id,operation:r.operation,before:r.before_json?JSON.parse(r.before_json):null,after:r.after_json?JSON.parse(r.after_json):null,created_at:r.created_at}))};
  ensure(JSON.stringify(backup).length<=MAX_BACKUP,'完整備份超過本版 20 MB 上限',413);return backup;
}
async function restore(env,owner,args){
  fields(args,['backup','confirmed']);confirmed(args);const x=object(args.backup);fields(x,['format','exported_at','records','attachments','audit']);
  ensure(x.format==='petmcp-backup/v1'&&Array.isArray(x.records)&&Array.isArray(x.attachments)&&Array.isArray(x.audit),'不支援此備份格式');
  ensure(JSON.stringify(x).length<=MAX_BACKUP&&x.records.length<=1000&&x.attachments.length<=100&&x.audit.length<=5000,'超過本版還原上限（1000 紀錄／100 附件／5000 稽核）',413);
  for(const table of ['records','attachments','audit'])ensure(!(await sql(env,`SELECT id FROM ${table} WHERE owner=? LIMIT 1`,owner).first()),'只能還原至空白的個人資料庫',409);
  const rs=x.records.map(r=>{fields(r,['id','kind','data','revision','created_at','updated_at']);id(r.id);ensure(Number.isInteger(r.revision)&&r.revision>0,'備份版本不正確');str(r.created_at,'建立時間',40);str(r.updated_at,'更新時間',40);return {...r,data:normalize(r.kind,r.data)};});
  ensure(new Set(rs.map(r=>r.id)).size===rs.length,'備份有重複紀錄');
  const photos=x.attachments.map(p=>{fields(p,['id','mime','size','created_at','base64']);id(p.id);str(p.created_at,'附件時間',40);const bytes=fromBase64(p.base64);checkImage(bytes,p.mime);ensure(bytes.length===p.size,'附件大小不符');return {...p,bytes};});
  ensure(new Set(photos.map(p=>p.id)).size===photos.length,'備份有重複附件');
  for(const r of rs){if(r.data.pet_id)ensure(rs.some(p=>p.kind==='pet'&&p.id===r.data.pet_id),'備份缺少寵物');const image=r.data.avatar_id||r.data.attachment_id;if(image)ensure(photos.some(p=>p.id===image),'備份缺少附件');}
  const events=x.audit.map(e=>{fields(e,['id','record_id','operation','before','after','created_at']);id(e.id);id(e.record_id);str(e.created_at,'稽核時間',40);ensure(['create','update','delete'].includes(e.operation),'稽核操作不正確');for(const r of [e.before,e.after])if(r){fields(r,['id','kind','data','revision','created_at','updated_at']);normalize(r.kind,r.data);ensure(r.id===e.record_id,'稽核關聯不符');}return e;});
  const statements=[...photos.map(p=>sql(env,'INSERT INTO attachments (owner,id,mime,size,created_at) VALUES (?,?,?,?,?)',owner,p.id,p.mime,p.size,p.created_at)),...rs.toSorted((a,b)=>Number(b.kind==='pet')-Number(a.kind==='pet')).map(r=>insertRecord(env,owner,r)),...events.map(e=>sql(env,'INSERT INTO audit (owner,id,record_id,operation,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?)',owner,e.id,e.record_id,e.operation,e.before?JSON.stringify(e.before):null,e.after?JSON.stringify(e.after):null,e.created_at))];
  const uploaded=[];try{for(const p of photos){await env.BUCKET.put(owner+'/'+p.id,p.bytes,{httpMetadata:{contentType:p.mime}});uploaded.push(p.id);}if(statements.length)await env.DB.batch(statements);}catch(e){for(const key of uploaded)await env.BUCKET.delete(owner+'/'+key);throw e;}
  return {restored:rs.length,attachments:photos.length,audit:events.length};
}
async function purge(env,owner,args){fields(args,['confirmed','confirmation']);confirmed(args);ensure(args.confirmation==='DELETE ALL PETMCP DATA','刪除確認文字不符');const photos=await all(sql(env,'SELECT id FROM attachments WHERE owner=?',owner));for(const p of photos)await env.BUCKET.delete(owner+'/'+p.id);
  // Keep metadata until all object deletions succeed, so failures can be retried.
  await env.DB.batch([sql(env,'DELETE FROM records WHERE owner=? AND kind<>?',owner,'pet'),sql(env,'DELETE FROM records WHERE owner=?',owner),sql(env,'DELETE FROM attachments WHERE owner=?',owner),sql(env,'DELETE FROM audit WHERE owner=?',owner)]);return {purged:true};}
export async function execute(env,owner,name,args={}){
  str(owner,'登入身分',200);object(args);
  const creates={create_pet:'pet',record_lab_report:'lab',record_observation:'care',record_food_label:'food'};
  if(Object.hasOwn(creates,name))return create(env,owner,creates[name],args);
  switch(name){
    case 'list_records':return list(env,owner,args);
    case 'get_record':fields(args,['id']);return getRecord(env,owner,args.id);
    case 'update_record':return update(env,owner,args);
    case 'delete_record':return remove(env,owner,args);
    case 'get_audit':return audit(env,owner,args);
    case 'list_attachments':{fields(args,['limit','cursor']);const {limit,cursor}=page(args);const rows=await all(sql(env,'SELECT id,mime,size,created_at FROM attachments WHERE owner=? AND id>? ORDER BY id LIMIT ?',owner,cursor,limit+1));return {items:rows.slice(0,limit),next_cursor:rows.length>limit?rows[limit-1].id:null};}
    case 'get_attachment':{fields(args,['id']);const {meta,file}=await imageData(env,owner,args.id);return {mime:meta.mime,base64:base64(await file.arrayBuffer())};}
    case 'export_data':fields(args,[]);return exportData(env,owner);
    case 'restore_data':return restore(env,owner,args);
    case 'purge_data':return purge(env,owner,args);
    default:throw new AppError(400,'不支援的操作');
  }
}
