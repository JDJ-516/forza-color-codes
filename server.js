import {createRareCarSource} from './rare-cars.js';
import http from 'node:http';
import { createTelemetryReceiver } from './telemetry.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const files = new Map([
  ...['drag-power-fit','fh6-setup','setup-baseline','setup-sheet-view','units','drag-gearing','drag-capture-view','drag-capture-data','engine-observations','tuning-telemetry','telemetry-view','telemetry-channels','drag-optimizer','competition','rare-cars-workspace','dashboard-cars','seasonal-cars'].map(name=>['/'+name+'.js',[name+'.js','text/javascript; charset=utf-8']]),
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/telemetry-setup.html', ['telemetry-setup.html', 'text/html; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/data.js', ['data.js', 'text/javascript; charset=utf-8']],
  ['/recipe.js', ['recipe.js', 'text/javascript; charset=utf-8']],
  ['/color-tools.js', ['color-tools.js', 'text/javascript; charset=utf-8']],
  ['/garage.js', ['garage.js', 'text/javascript; charset=utf-8']],
  ['/calculators.js', ['calculators.js', 'text/javascript; charset=utf-8']],
  ['/drag.js', ['drag.js', 'text/javascript; charset=utf-8']],
  ['/drag-workspace.js', ['drag-workspace.js', 'text/javascript; charset=utf-8']],
  ['/telemetry-analysis.js', ['telemetry-analysis.js', 'text/javascript; charset=utf-8']],
  ['/rare-cars.json', ['rare-cars.json', 'application/json; charset=utf-8']],
  ['/catalogue.json', ['catalogue.json', 'application/json; charset=utf-8']],
  ['/import-report.json', ['import-report.json', 'application/json; charset=utf-8']],
]);

const version=JSON.parse(await readFile(new URL('./package.json',import.meta.url),'utf8')).version;

export function createServer({telemetry,rareCars=createRareCarSource()} = {}) {
  return http.createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if(path==='/api/rare-cars'){
      const force=req.method==='POST';
      if(!['GET','HEAD','POST'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD, POST'});return res.end();}
      if(force){const origin=req.headers.origin;if(req.headers['x-forza-garage']!=='1'||(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)){res.writeHead(403);return res.end('Forbidden');}}
      try{const data=await rareCars.snapshot({force});res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(req.method==='HEAD'?undefined:JSON.stringify(data));}
      catch{res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end(JSON.stringify({error:'Rare-car data is unavailable. Reload to retry.'}));}
    }
    if(['/api/telemetry/drag/start','/api/telemetry/drag/stop'].includes(path)&&req.method==='POST'){
      const origin=req.headers.origin;
      if(req.headers['x-forza-garage']!=='1'||(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)){res.writeHead(403);return res.end('Forbidden');}
      res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
      if(!telemetry){res.writeHead(409);return res.end(JSON.stringify({error:'Enable the local telemetry receiver first.'}));}
      try{const capture=path.endsWith('/start')?telemetry.startDrag({countdown:new URL(req.url,'http://localhost').searchParams.get('countdown')==='1'}):telemetry.stopDrag();res.writeHead(200);return res.end(JSON.stringify(capture));}
      catch(error){res.writeHead(409);return res.end(JSON.stringify({error:error.message}));}
    }
    if(path==='/api/telemetry/reset' && req.method==='POST'){
      const origin=req.headers.origin;
      if(req.headers['x-forza-garage']!=='1' || (origin && origin!==`http://${req.headers.host}` && origin!==`https://${req.headers.host}`)){res.writeHead(403);return res.end('Forbidden');}
      if(!telemetry){res.writeHead(409);return res.end('Telemetry is disabled');}
      telemetry.reset();res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});return res.end('{"reset":true}');
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end();
    }
    if(path==='/api/health'){
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
      return res.end(req.method==='HEAD'?undefined:JSON.stringify({app:'forza-garage',version,pid:process.pid,instanceId:process.env.FORZA_GARAGE_INSTANCE_ID||null}));
    }
    if(path==='/api/telemetry/diagnostics'){
      const diagnostic=telemetry?.diagnostics();res.writeHead(diagnostic?200:409,{'Content-Type':'application/json','Cache-Control':'no-store','Content-Disposition':'attachment; filename="forza-ingenium-packet-diagnostics.json"'});
      return res.end(req.method==='HEAD'?undefined:JSON.stringify(diagnostic?{...diagnostic,appVersion:version}:{error:'No packet has arrived yet. Start the local receiver and game Data Out first.'}));
    }
    if(path==='/api/telemetry/drag/session'){
      const session=telemetry?.dragSession(),ready=session?.samples?.length>=2;
      res.writeHead(ready?200:409,{'Content-Type':'application/json','Cache-Control':'no-store','Content-Disposition':'attachment; filename="forza-drag-capture.json"'});
      return res.end(req.method==='HEAD'?undefined:JSON.stringify(ready?session:{error:'No drag run recorded yet. Start a drag capture or import a session.'}));
    }
    if (path === '/api/telemetry/session') {
      const session=telemetry?.session();
      res.writeHead(session?.samples?.length>=2?200:409, {'Content-Type':'application/json','Cache-Control':'no-store','Content-Disposition':'attachment; filename="forza-telemetry-session.json"'});
      return res.end(req.method==='HEAD'?undefined:JSON.stringify(session?.samples?.length>=2?session:{error:'No usable capture yet. Enable telemetry and drive before exporting.'}));
    }
    if (path === '/api/telemetry') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(telemetry?.snapshot() || { state: 'disabled', packets: 0, format: 'unverified' }));
    }
    const entry = files.get(path);
    if (!entry) { res.writeHead(404); return res.end('Not found'); }
    try {
      const body = await readFile(fileURLToPath(new URL(`./public/${entry[0]}`, import.meta.url)));
      res.writeHead(200, {
        'Content-Type': entry[1],
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(500); res.end('Unable to load application'); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const telemetry = process.env.TELEMETRY_ENABLED === '1' ? createTelemetryReceiver({
    host: process.env.TELEMETRY_HOST || '127.0.0.1',
    port: Number(process.env.TELEMETRY_PORT || 5300),
  }) : undefined;
  if (telemetry) {
    await telemetry.start();
    console.log(`Telemetry receiver: ${telemetry.snapshot().state}`);
  }
  const server = createServer({telemetry});
  server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Forza-ingenium listening on port ${port}`));
  async function stop() { if (telemetry) await telemetry.close(); server.close(() => process.exit(0)); }
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
