import {spawn} from 'node:child_process';
import net from 'node:net';
import {mkdir,readFile,writeFile,rm,open} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';

const root=dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.FORZA_GARAGE_PORT||3000);
const stateRoot=process.env.FORZA_GARAGE_STATE_DIR||join(process.env.LOCALAPPDATA||process.env.XDG_STATE_HOME||tmpdir(),'ForzaGarage','runtime');
const stateFile=join(stateRoot,'server.json'),logFile=join(stateRoot,'server.log');
const url=`http://127.0.0.1:${port}`;
const version=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function health(){
 try{const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1000)});if(!r.ok)return null;const data=await r.json();return data.app==='forza-garage'?data:null;}catch{return null;}
}
function portOpen(){return new Promise(resolve=>{const socket=net.createConnection({host:'127.0.0.1',port});const done=value=>{socket.destroy();resolve(value);};socket.once('connect',()=>done(true));socket.once('error',()=>done(false));socket.setTimeout(700,()=>done(true));});}
function openBrowser(){
 const command=process.platform==='win32'?{file:'rundll32.exe',args:['url.dll,FileProtocolHandler',url]}:process.platform==='darwin'?{file:'open',args:[url]}:{file:'xdg-open',args:[url]};
 return new Promise((resolve,reject)=>{const child=spawn(command.file,command.args,{stdio:'ignore',windowsHide:true,detached:true});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});
}
async function remember(info){if(info.instanceId)await writeFile(stateFile,JSON.stringify({pid:info.pid,instanceId:info.instanceId,port}),{mode:0o600});}
export async function launch({browser=true}={}){
 await mkdir(stateRoot,{recursive:true});let info=await health();
 if(info){if(info.version!==version)throw new Error('An older Forza-ingenium is running. Run the installer to update it, or stop the older app first.');await remember(info);if(browser)await openBrowser();return info;}
 if(await portOpen())throw new Error(`Port ${port} is already in use. Close the previous Forza-ingenium CMD window or the application using that port, then retry the shortcut.`);
 const log=await open(logFile,'a');const instanceId=randomUUID();
 const child=spawn(process.execPath,[join(root,'server.js')],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',log.fd,log.fd],env:{...process.env,HOST:'127.0.0.1',PORT:String(port),TELEMETRY_ENABLED:'1',TELEMETRY_HOST:'127.0.0.1',TELEMETRY_PORT:process.env.FORZA_GARAGE_UDP_PORT||'5300',FORZA_GARAGE_INSTANCE_ID:instanceId}});
 let spawnError=null;child.once('error',e=>{spawnError=e;});child.unref();await log.close();
 const deadline=Date.now()+12000;
 while(Date.now()<deadline){
  if(spawnError)throw spawnError;
  info=await health();
  if(info){if(info.version!==version)throw new Error('A different app version started on the port. Stop it before retrying.');await remember(info);if(browser)await openBrowser();return info;}
  await delay(200);
 }
 if(child.pid&&child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');
 throw new Error(`The app did not become ready. See ${logFile}.`);
}
export async function stop(){
 let saved;try{saved=JSON.parse(await readFile(stateFile,'utf8'));}catch{return false;}
 const info=await health();
 if(!info){await rm(stateFile,{force:true});return false;}
 if(!Number.isInteger(saved.pid)||saved.pid<=0||saved.pid===process.pid||info.pid!==saved.pid||!saved.instanceId||info.instanceId!==saved.instanceId)throw new Error('The running server is not the managed instance recorded by this launcher. Close its original window instead.');
 process.kill(saved.pid,'SIGTERM');
 for(let i=0;i<40;i++){const current=await health();if(!current||current.instanceId!==saved.instanceId){await rm(stateFile,{force:true});return true;}await delay(100);}
 throw new Error('The background app did not stop. Close it before updating.');
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid local HTTP port.');
  if(process.argv.includes('--stop')){await stop();console.log('Managed Forza-ingenium stopped, or was not running.');}
  else{const info=await launch({browser:!process.argv.includes('--no-open')});console.log(`Forza-ingenium ${info.version} ready at ${url}`);}
 }catch(error){await mkdir(stateRoot,{recursive:true});await writeFile(join(stateRoot,'launcher-error.txt'),error.message+'\n');console.error(error.message);process.exitCode=1;}
}
