import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import net from 'node:net';
import http from 'node:http';
const exec=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));
async function freePort(){const s=net.createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const p=s.address().port;await new Promise(resolve=>s.close(resolve));return p;}
test('launcher starts the real background app, reuses it, and stops only its recorded instance',async t=>{
 const state=await mkdtemp(join(tmpdir(),'forza-launcher-')),port=await freePort();
 const env={...process.env,FORZA_GARAGE_PORT:String(port),FORZA_GARAGE_UDP_PORT:'0',FORZA_GARAGE_STATE_DIR:state};
 const run=args=>exec(process.execPath,['launcher.js',...args],{cwd:root,env,timeout:20000});
 t.after(async()=>{try{await run(['--stop']);}catch{}await rm(state,{recursive:true,force:true});});
 await run(['--no-open']);const first=await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();assert.equal(first.app,'forza-garage');assert.equal(first.version,JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).version);assert.ok(first.instanceId);
 assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status,200);
 const udp=await (await fetch(`http://127.0.0.1:${port}/api/telemetry`)).json();assert.equal(udp.state,'waiting');
 await run(['--no-open']);const second=await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();assert.equal(first.pid,second.pid);
 const saved=await readFile(join(state,'server.json'),'utf8');await writeFile(join(state,'server.json'),JSON.stringify({pid:first.pid,instanceId:'wrong',port}));
 await assert.rejects(run(['--stop']),/not the managed instance/);assert.equal((await fetch(`http://127.0.0.1:${port}/api/health`)).status,200);
 await writeFile(join(state,'server.json'),saved);await run(['--stop']);await assert.rejects(fetch(`http://127.0.0.1:${port}/api/health`));
});
test('launcher refuses an occupied unrelated port without stopping the listener',async t=>{
 const state=await mkdtemp(join(tmpdir(),'forza-unrelated-')),server=http.createServer((req,res)=>{res.writeHead(404,{'Connection':'close'});res.end();});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(state,{recursive:true,force:true});});
 await assert.rejects(exec(process.execPath,['launcher.js','--no-open'],{cwd:root,env:{...process.env,FORZA_GARAGE_STATE_DIR:state,FORZA_GARAGE_PORT:String(server.address().port)},timeout:10000}),/already in use/);
 assert.equal(server.listening,true);
});

test('browser handoff occurs after the actual app is ready', {skip:process.platform!=='linux'},async t=>{
 const state=await mkdtemp(join(tmpdir(),'forza-opener-')),port=await freePort(),resultFile=join(state,'opened.json');
 const opener=join(state,'xdg-open');
 await writeFile(opener,`#!/usr/bin/env node\nconst fs=require('node:fs');fetch(process.argv[2]+'/api/health').then(r=>r.json()).then(info=>fs.writeFileSync(process.env.FORZA_GARAGE_BROWSER_TEST_RESULT,JSON.stringify({url:process.argv[2],app:info.app}))).catch(e=>fs.writeFileSync(process.env.FORZA_GARAGE_BROWSER_TEST_RESULT,JSON.stringify({error:e.message})));\n`,{mode:0o755});
 const env={...process.env,PATH:state+':'+process.env.PATH,FORZA_GARAGE_PORT:String(port),FORZA_GARAGE_UDP_PORT:'0',FORZA_GARAGE_STATE_DIR:state,FORZA_GARAGE_BROWSER_TEST_RESULT:resultFile};
 t.after(async()=>{try{await exec(process.execPath,['launcher.js','--stop'],{cwd:root,env,timeout:10000});}catch{}await rm(state,{recursive:true,force:true});});
 await exec(process.execPath,['launcher.js'],{cwd:root,env,timeout:20000});
 let opened;for(let i=0;i<80;i++){try{opened=JSON.parse(await readFile(resultFile,'utf8'));break;}catch{await new Promise(resolve=>setTimeout(resolve,25));}}
 assert.deepEqual(opened,{url:`http://127.0.0.1:${port}`,app:'forza-garage'});
});
