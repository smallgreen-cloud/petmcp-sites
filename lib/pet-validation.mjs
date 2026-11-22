export class AppError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
export function ensure(condition,message,status=400){if(!condition)throw new AppError(status,message);}
export function object(value){ensure(value && typeof value==='object' && !Array.isArray(value),'需要 JSON 物件');return value;}
export function fields(value,allowed){object(value);ensure(Object.keys(value).every(k=>allowed.includes(k)),'包含不支援的欄位');}
export function str(value,label,max=1000){ensure(typeof value==='string' && value.trim().length>0 && value.length<=max,`${label}格式不正確`);return value;}
export function id(value){return str(value,'識別碼',100);}
export function confirmed(args){ensure(args.confirmed===true,'請先確認原始資料，再儲存或刪除');}
function date(value){if(value==null)return null;const parsed=new Date(value+'T00:00:00Z');ensure(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value,'日期格式不正確');return value;}
function optional(value,label,max=1000){return value==null?null:str(value,label,max);}
const kinds=['pet','lab','care','food'];
export function kind(value){ensure(kinds.includes(value),'紀錄類型不正確');return value;}
function measurements(value,food=false){
  ensure(Array.isArray(value)&&value.length>0&&value.length<=100,'數值項目需為 1–100 筆');
  return value.map(item=>{fields(item,food?['name','raw_value','unit']:['analyte','raw_value','unit','reference_text']);return food?
    {name:str(item.name,'營養項目',100),raw_value:str(item.raw_value,'原始值',100),unit:str(item.unit,'單位',100)}:
    {analyte:str(item.analyte,'檢驗項目',100),raw_value:str(item.raw_value,'原始值',100),unit:str(item.unit,'單位',100),reference_text:optional(item.reference_text,'參考範圍',200)};});
}
export function normalize(type,input){
  const x=object(input);kind(type);
  if(type==='pet'){
    fields(x,['name','species','birth_date','avatar_id']);ensure(['cat','dog','other'].includes(x.species),'物種格式不正確');
    return {name:str(x.name,'名字',100),species:x.species,birth_date:date(x.birth_date),avatar_id:optional(x.avatar_id,'頭像識別碼',100)};
  }
  const common=['source_kind','attachment_id'];
  // Food labels are references, never consumption events. Do not add pet_id here.
  fields(x,type==='lab'?[...common,'pet_id','date','relative_time_label','laboratory','measurements']:type==='care'?[...common,'pet_id','date','category','text']:[...common,'product_name','ingredients_text','nutrition']);
  ensure(['synthetic','user_uploaded','public_source'].includes(x.source_kind),'來源類型不正確');
  const source={source_kind:x.source_kind,attachment_id:optional(x.attachment_id,'附件識別碼',100)};
  if(type==='food')return {...source,product_name:str(x.product_name,'產品名稱',200),ingredients_text:str(x.ingredients_text,'成分',10000),nutrition:measurements(x.nutrition,true)};
  const collected=date(x.date), pet_id=id(x.pet_id);
  if(type==='care'){ensure(collected,'照護日期不可空白');return {...source,pet_id,date:collected,category:str(x.category,'類別',100),text:str(x.text,'照護內容',10000)};}
  const relative_time_label=optional(x.relative_time_label,'相對時間',200);
  ensure(collected||relative_time_label,'日期未知時請保留原始相對時間');
  return {...source,pet_id,date:collected,relative_time_label,laboratory:optional(x.laboratory,'檢驗單位',200),measurements:measurements(x.measurements)};
}
export function page(args){
  const limit=args.limit??50;ensure(Number.isInteger(limit)&&limit>=1&&limit<=100,'每頁筆數需為 1–100');
  return {limit,cursor:args.cursor==null?'':id(args.cursor)};
}
export const MAX_FILE=5*1024*1024, MAX_BACKUP=20*1024*1024;
export function checkImage(bytes,mime){
  ensure(['image/png','image/jpeg','image/webp'].includes(mime),'只接受 PNG、JPEG 或 WebP 圖片',415);
  ensure(bytes.byteLength>0&&bytes.byteLength<=MAX_FILE,'圖片上限 5 MB',413);
  const b=new Uint8Array(bytes),matches=(values,offset=0)=>values.every((v,i)=>b[offset+i]===v);
  ensure(mime==='image/png'?matches([137,80,78,71,13,10,26,10]):mime==='image/jpeg'?matches([255,216,255]):matches([82,73,70,70])&&matches([87,69,66,80],8),'圖片內容與格式不符');
}
export function base64(bytes){let s='';for(const n of new Uint8Array(bytes))s+=String.fromCharCode(n);return btoa(s);}
export function fromBase64(value){str(value,'圖片內容',MAX_FILE*2);try{return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}catch{throw new AppError(400,'圖片編碼不正確');}}
