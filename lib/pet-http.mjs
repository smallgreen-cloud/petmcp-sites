import {execute,upload,imageData} from './pet-service.mjs';
import {tools} from './pet-tools.mjs';
import {AppError,ensure,object,MAX_FILE,MAX_BACKUP} from './pet-validation.mjs';
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const json=(value,status=200)=>Response.json(value,{status,headers});
async function body(request,max){
  ensure(Number(request.headers.get('content-length')??0)<=max,'傳送資料過大',413);
  const reader=request.body?.getReader();ensure(reader,'缺少內容');let size=0;const chunks=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new AppError(413,'傳送資料過大');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
async function jsonBody(request){
  ensure(request.headers.get('content-type')?.split(';')[0]==='application/json','請使用 JSON 格式',415);
  try{return object(JSON.parse(new TextDecoder().decode(await body(request,MAX_BACKUP))));}catch(e){if(e instanceof AppError)throw e;throw new AppError(400,'JSON 格式不正確');}
}
async function rpc(request,env,owner){
  const message=await jsonBody(request);ensure(message.jsonrpc==='2.0'&&typeof message.method==='string','JSON-RPC 格式不正確');
  const envelope=result=>json({jsonrpc:'2.0',id:message.id??null,result});
  if(message.method==='server/discover')return envelope({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
  if(message.method==='initialize')return envelope({protocolVersion:'2025-03-26',serverInfo:{name:'petmcp-sites',version:'0.1.0'},capabilities:{tools:{}}});
  if(message.method==='notifications/initialized')return new Response(null,{status:202,headers});
  if(message.method==='tools/list')return envelope({tools});
  ensure(owner,'請先登入 ChatGPT',401);
  if(message.method==='tools/call'){
    try{const params=object(message.params),result=await execute(env,owner,params.name,params.arguments??{});
      return envelope({content:params.name==='get_attachment'?[{type:'image',mimeType:result.mime,data:result.base64}]:[{type:'text',text:JSON.stringify(result)}],isError:false});
    }catch(e){if(!(e instanceof AppError))console.error('petmcp_mcp_failure',{operation:message.params?.name,error_type:e.name});return envelope({content:[{type:'text',text:e instanceof AppError?e.message:'儲存服務暫時無法完成，請稍後重試'}],isError:true});}
  }
  return json({jsonrpc:'2.0',id:message.id??null,error:{code:-32601,message:'Method not found'}});
}
export async function handle(request,env){
  const path=new URL(request.url).pathname,owner=request.headers.get('oai-authenticated-user-id');
  try{
    if(!['GET','POST'].includes(request.method))return json({error:'不支援的方法'},405);
    if(request.method==='POST'){const origin=request.headers.get('origin');ensure(!origin||origin===new URL(request.url).origin,'來源不允許',403);}
    if(path==='/health'){ensure(request.method==='GET','不支援的方法',405);await env.DB.prepare('SELECT 1 FROM records LIMIT 1').first();ensure(env.BUCKET,'附件綁定尚未就緒',503);return json({status:'ok',service:'petmcp-sites',version:'0.1.0'});}
    if(path==='/mcp'){ensure(request.method==='POST','請使用 MCP POST',405);return await rpc(request,env,owner);}
    ensure(owner,'請先登入 ChatGPT',401);
    if(path==='/api/state'&&request.method==='GET')return json(await execute(env,owner,'list_records',Object.fromEntries(new URL(request.url).searchParams)));
    if(path==='/api/action'&&request.method==='POST'){const x=await jsonBody(request);return json(await execute(env,owner,x.name,x.arguments??{}));}
    if(path==='/api/attachments'&&request.method==='POST')return json(await upload(env,owner,await body(request,MAX_FILE),request.headers.get('content-type')?.split(';')[0]),201);
    if(path.startsWith('/api/attachments/')&&request.method==='GET'){const {meta,file}=await imageData(env,owner,decodeURIComponent(path.slice('/api/attachments/'.length)));return new Response(file.body,{headers:{...headers,'content-type':meta.mime,'content-length':String(meta.size)}});}
    return json({error:'找不到此路徑'},404);
  }catch(e){if(!(e instanceof AppError))console.error('petmcp_http_failure',{path,error_type:e.name});return json({error:e instanceof AppError?e.message:'儲存服務暫時無法完成，請稍後重試'},e instanceof AppError?e.status:503);}
}
