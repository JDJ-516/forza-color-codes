import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
export const SHEET_URL='https://docs.google.com/spreadsheets/d/1anCEWRN_SrteKIznuJLe8TrGXpVF-8vAUrNlb6nAFnM/edit?gid=1485355139#gid=1485355139';
export const EXPORT_URL='https://docs.google.com/spreadsheets/d/1anCEWRN_SrteKIznuJLe8TrGXpVF-8vAUrNlb6nAFnM/export?format=xlsx';
export const REFRESH_MS=10*60*1000;
const MAX=8*1024*1024;
const decode=s=>s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,v)=>v[0]==='#'?String.fromCodePoint(v[1].toLowerCase()==='x'?parseInt(v.slice(2),16):Number(v.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[v.toLowerCase()]));
const attr=(s,key)=>decode(new RegExp('(?:^|\\s)'+key+'="([^"]*)"').exec(s)?.[1]||'');
const text=xml=>[...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m=>decode(m[1])).join('');
function unzip(buffer){
 if(buffer.length>MAX||buffer.length<22)throw new Error('Invalid or oversized workbook.');
 let end=-1;for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0||buffer.readUInt16LE(end+4)||buffer.readUInt16LE(end+6))throw new Error('Unsupported workbook archive.');
 const count=buffer.readUInt16LE(end+10);let cursor=buffer.readUInt32LE(end+16),total=0;const files=new Map();
 if(count>500)throw new Error('Too many workbook parts.');
 for(let i=0;i<count;i++){
  if(cursor+46>buffer.length||buffer.readUInt32LE(cursor)!==0x02014b50)throw new Error('Damaged workbook directory.');
  const method=buffer.readUInt16LE(cursor+10),compressed=buffer.readUInt32LE(cursor+20),size=buffer.readUInt32LE(cursor+24),length=buffer.readUInt16LE(cursor+28),extra=buffer.readUInt16LE(cursor+30),comment=buffer.readUInt16LE(cursor+32),offset=buffer.readUInt32LE(cursor+42),name=buffer.toString('utf8',cursor+46,cursor+46+length);
  cursor+=46+length+extra+comment;
  if(!/^xl\/(workbook\.xml|_rels\/workbook\.xml.rels|sharedStrings\.xml|styles\.xml|worksheets\/[^/]+\.xml)$/.test(name))continue;
  if(size>MAX||(total+=size)>40*1024*1024||offset+30>buffer.length||buffer.readUInt32LE(offset)!==0x04034b50)throw new Error('Invalid workbook part size.');
  const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28);if(start+compressed>buffer.length)throw new Error('Truncated workbook part.');
  const raw=buffer.subarray(start,start+compressed),out=method===0?raw:method===8?inflateRawSync(raw,{maxOutputLength:MAX}):null;
  if(!out||out.length!==size)throw new Error('Unsupported or damaged workbook compression.');
  const xml=out.toString('utf8');if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Unsupported XML declarations.');files.set(name,xml);
 }
 return files;
}
export function parseRareCars(buffer){
 const files=unzip(buffer),workbook=files.get('xl/workbook.xml')||'',rels=files.get('xl/_rels/workbook.xml.rels')||'';
 const shared=[...(files.get('xl/sharedStrings.xml')||'').matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m=>text(m[1]));
 const styles=files.get('xl/styles.xml')||'',fills=[...(styles.match(/<fills\b[^>]*>([\s\S]*?)<\/fills>/)?.[1]||'').matchAll(/<fill>([\s\S]*?)<\/fill>/g)].map(m=>/patternType="solid"/.test(m[1])?(m[1].match(/<fgColor\b([^>]*)/)?.[1]||''):'');
 const fillKeys=fills.map(a=>attr(a,'rgb')?'rgb:'+attr(a,'rgb'):attr(a,'theme')?'theme:'+attr(a,'theme')+':'+attr(a,'tint'):'');
 const xfs=[...(styles.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1]||'').matchAll(/<xf\b([^>]*)/g)].map(m=>fillKeys[Number(attr(m[1],'fillId'))]||'');
 const targets=new Map([...rels.matchAll(/<Relationship\b([^>]*)/g)].map(m=>[attr(m[1],'Id'),attr(m[1],'Target')]));const cars=[],categories=[];
 for(const sheet of workbook.matchAll(/<sheet\b([^>]*)/g)){
  const name=attr(sheet[1],'name'),target=targets.get(attr(sheet[1],'r:id'))||'',path=target.startsWith('/')?target.slice(1):'xl/'+target;
  const xml=files.get(path);if(!xml)throw new Error('A workbook tab could not be read.');const rows=[];
  for(const row of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)){
   const number=Number(attr(row[1],'r'));if(number>10000)throw new Error('Workbook has too many rows.');const cells=[];
   for(const cell of row[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
    const ref=attr(cell[1],'r'),letters=ref.match(/^[A-Z]+/)?.[0];if(!letters)continue;let col=0;for(const ch of letters)col=col*26+ch.charCodeAt(0)-64;if(col>50)throw new Error('Workbook has too many columns.');
    const type=attr(cell[1],'t'),body=cell[2]||'',value=body.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1]||'';
    cells[col-1]={value:type==='s'?(shared[Number(value)]??''):type==='inlineStr'?text(body):decode(value),fill:xfs[Number(attr(cell[1],'s'))]||''};
   }
   rows.push({number,cells});
  }
  const header=rows.find(r=>r.cells[1]?.value.trim().toLowerCase()==='brand'&&r.cells[2]?.value.trim().toLowerCase()==='model');
  if(!header)throw new Error(`Tab “${name}” has changed headers; the previous data was retained.`);
  const fields=header.cells.map(c=>c?.value?.trim()||'');let count=0;const notes=[],legend=new Map();
  for(const row of rows){if(row.number<=header.number)continue;
   row.cells.forEach((cell,index)=>{if(!cell?.value||index<3||fields[index]||(index===4&&fields[3]&&!fields[4]))return;const value=cell.value.trim();if(value){notes.push(value);if(cell.fill&&/highlight/i.test(value))legend.set(cell.fill,value);}});
  }
  for(const row of rows){if(row.number<=header.number)continue;const a=row.cells.map(c=>c?.value||''),year=Number(a[0]);if(!a[0]&&!a[1]&&!a[2])continue;
   if(!Number.isInteger(year)||year<1800||year>3000||!a[1]?.trim()||!a[2]?.trim())throw new Error(`Unexpected car row in ${name}, row ${row.number}; the previous data was retained.`);
   const details=[];for(let i=3;i<a.length;i++)if(fields[i]&&a[i]){let value=a[i];if(/release date|DD\/MM\/YYYY/i.test(fields[i])&&/^\d+(\.\d+)?$/.test(value))value=new Date(Date.UTC(1899,11,30)+Number(value)*86400000).toISOString().slice(0,10);details.push({label:fields[i],value});}
   // Several tabs use an unlabeled E column for per-car notes, separate from their sidebar.
   if(fields[3]&&!fields[4]&&a[4])details.push({label:'Notes',value:a[4]});
   const identity=[name.trim(),a[0],a[1].trim(),a[2].trim(),details];cars.push({id:createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0,24),year,brand:a[1].trim(),model:a[2].trim(),category:name.trim(),details,classification:legend.get(row.cells[0]?.fill)||'',sourceRow:row.number});count++;
  }
  if(!count)throw new Error(`Tab “${name}” contains no cars; the previous data was retained.`);
  categories.push({name:name.trim(),count,notes:[...new Set(notes)],legend:[...legend.values()]});
 }
 if(!cars.length||cars.length>10000)throw new Error('The workbook contains no supported car data.');
 return {schema:'ingenium-rare-cars/v1',title:"KS21's FH6 Rare Car Sheet",url:SHEET_URL,sha256:createHash('sha256').update(buffer).digest('hex'),cars,categories};
}
function valid(data){return data?.schema==='ingenium-rare-cars/v1'&&Array.isArray(data.cars)&&data.cars.length>0&&data.cars.length<=10000&&Array.isArray(data.categories)&&data.categories.every(c=>typeof c.name==='string'&&Array.isArray(c.notes)&&c.notes.every(n=>typeof n==='string'))&&data.cars.every(c=>c&&typeof c.id==='string'&&typeof c.model==='string'&&typeof c.brand==='string'&&typeof c.category==='string'&&Number.isInteger(c.year)&&typeof c.classification==='string'&&Number.isInteger(c.sourceRow)&&Array.isArray(c.details)&&c.details.every(d=>typeof d.label==='string'&&typeof d.value==='string'));}
export function createRareCarSource({fetcher=fetch,now=Date.now,cachePath=join(process.env.FORZA_GARAGE_STATE_DIR||join(process.env.LOCALAPPDATA||process.env.XDG_STATE_HOME||tmpdir(),'ForzaGarage','runtime'),'rare-cars-cache.json'),fallbackPath=new URL('./public/rare-cars.json',import.meta.url)}={}){
 let data=null,origin='bundled',checkedAt=null,lastAttempt=-Infinity,error=null,pending=null,cacheWarning=null;
 const ready=(async()=>{try{data=JSON.parse(await readFile(fallbackPath,'utf8'));if(!valid(data))throw Error();}catch{throw new Error('Bundled rare-car snapshot is missing or invalid.');}try{const cached=JSON.parse(await readFile(cachePath,'utf8'));if(valid(cached.data)&&Number.isFinite(cached.checkedAt)){data=cached.data;checkedAt=cached.checkedAt;origin='cached';}}catch{}})();
 async function refresh(force=false){await ready;if(pending)return pending;if(now()-lastAttempt<(force?30000:REFRESH_MS))return;lastAttempt=now();
  pending=(async()=>{try{const response=await fetcher(EXPORT_URL,{signal:AbortSignal.timeout(15000),headers:{'Accept':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'},redirect:'follow'});if(!response.ok)throw new Error(`Google Sheets returned HTTP ${response.status}. Check that the sheet is accessible to anyone with the link as a viewer.`);if(Number(response.headers.get('content-length'))>MAX)throw new Error('Workbook exceeds the 8 MB limit.');const reader=response.body.getReader();let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX)throw new Error('Workbook exceeds the 8 MB limit.');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
   const next=parseRareCars(Buffer.concat(chunks));data=next;checkedAt=now();origin='live';error=null;cacheWarning=null;
   try{await mkdir(dirname(cachePath),{recursive:true});const temp=cachePath+'.tmp';await writeFile(temp,JSON.stringify({data,checkedAt}),{mode:0o600});await rename(temp,cachePath);}catch{cacheWarning='Updated for this session, but the disk cache could not be saved.';}
  }catch(e){error=e.name==='TimeoutError'?'Google Sheets timed out; keeping the previous data.':e.message;}finally{pending=null;}})();return pending;
 }
 return {async snapshot({force=false}={}){await refresh(force);return {...data,sync:{origin,checkedAt:checkedAt===null?null:new Date(checkedAt).toISOString(),lastAttemptAt:Number.isFinite(lastAttempt)?new Date(lastAttempt).toISOString():null,nextCheckAt:new Date(lastAttempt+REFRESH_MS).toISOString(),error,cacheWarning,intervalMs:REFRESH_MS}};}};
}
