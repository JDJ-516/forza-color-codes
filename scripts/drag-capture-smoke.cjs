const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {packet,dragSession}=await import('../test-support/telemetry-fixtures.js'),{decodeHorizonPacket}=await import('../fh6-decoder.js'),{resolveCar}=await import('../car-identities.js'),{engineKey}=await import('../telemetry-engine.js');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
  const latest=decodeHorizonPacket(packet({speed:0,car:3726}));const key=engineKey(latest);
  let capture={id:0,state:'idle',recordedSamples:0},snapshot={state:'receiving',decodedAgeMs:0,latest,car:resolveCar(3726),dragCapture:capture};
  const session=dragSession();for(const s of session.samples){s.carOrdinal=3726;s.carPerformanceIndex=0;s.drivetrain=1;s.torqueNm=550;}session.capture={id:1,state:'stopped',reason:'stationary',key};
  await page.route('**/api/telemetry',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({...snapshot,dragCapture:capture})}));
  await page.route('**/api/telemetry/drag/start*',r=>{capture={id:capture.id+1,key,state:'countdown',remainingMs:3000,recordedSamples:0};return r.fulfill({contentType:'application/json',body:JSON.stringify(capture)});});
  await page.route('**/api/telemetry/drag/stop',r=>{capture={...capture,state:'stopped',reason:'manual',stoppedAt:99999};return r.fulfill({contentType:'application/json',body:JSON.stringify(capture)});});
  await page.route('**/api/telemetry/drag/session',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(session)}));
  await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:3017')+'/?tune=drag#tuning');await page.locator('#drag-reset-capture').waitFor();
  const order=await page.locator('#drag-capture-heading').evaluate(e=>e.getBoundingClientRect().top);assert.ok(order<await page.locator('#drag-form').evaluate(e=>e.getBoundingClientRect().top));
  await page.locator('#drag-strip').selectOption('fh6:irakawa-space-centre:321.869');await page.locator('#drag-reset-capture').click();await page.locator('#drag-capture-countdown').filter({hasText:'3'}).waitFor();assert.equal(await page.locator('#drag-capture-indicator').getAttribute('data-state'),'countdown');
  capture.remainingMs=2000;await page.clock.fastForward(1000);await page.waitForFunction(()=>document.querySelector('#drag-capture-countdown').textContent==='2');
  capture.remainingMs=1000;await page.clock.fastForward(1000);await page.waitForFunction(()=>document.querySelector('#drag-capture-countdown').textContent==='1');
  capture={...capture,state:'recording',remainingMs:0};await page.clock.fastForward(1000);await page.waitForFunction(()=>document.querySelector('#drag-capture-countdown').textContent==='GO');assert.equal(await page.locator('#drag-capture-indicator').getAttribute('data-state'),'recording');
  const input=name=>page.locator(`#drag-form [name=${name}]`);
  for(const [name,value] of Object.entries({powerKw:400,torqueNm:600,mass:1500,frontPercent:55,displacement:3}))await input(name).fill(String(value));assert.equal(await page.locator('#drag-pwr').textContent(),'0.2667 HP/lb');
  capture={...capture,launched:true,recordedSamples:100,measurements:{key,eligibleSamples:10,powerSamples:10,torqueSamples:10,peakPowerW:350000,peakTorqueNm:550,torquePeakRpm:5000,shiftRpm:7200,observedShifts:1}};await page.clock.fastForward(1100);await page.waitForFunction(()=>document.querySelector('#drag-measured-power').textContent==='469.4 HP');
  assert.equal(await input('powerKw').inputValue(),'400');assert.equal(await input('torqueNm').inputValue(),'600');assert.equal(await input('torquePeakRpm').inputValue(),'5000');assert.equal(await input('shiftRpm').inputValue(),'7200');
  await input('shiftRpm').fill('7300');capture.measurements.shiftRpm=7400;await page.clock.fastForward(1100);assert.equal(await input('shiftRpm').inputValue(),'7300');
  await page.locator('#drag-apply-measured').click();assert.equal(await input('powerKw').inputValue(),'469.36');assert.equal(await input('torqueNm').inputValue(),'405.66');assert.equal(await page.locator('#drag-pwr').textContent(),'0.3129 HP/lb');
  snapshot.latest={...latest,speedKph:80,brake:1};await page.clock.fastForward(1100);assert.equal(await page.locator('#drag-capture-countdown').textContent(),'LIVE');
  capture={...capture,state:'stopped',reason:'stationary',stoppedAt:50000};snapshot.latest={...latest,speedKph:0,brake:1};await page.clock.fastForward(1100);await page.waitForFunction(()=>document.querySelector('#drag-capture-countdown').textContent==='STOPPED');await page.locator('#drag-run-status').filter({hasText:'Completed measured run'}).waitFor();assert.equal(await page.locator('#drag-stop-capture').isDisabled(),true);
  await page.locator('#drag-reset-capture').click();await page.locator('#drag-stop-capture').click();await page.waitForFunction(()=>document.querySelector('#drag-capture-state').textContent.includes('manually'));
  await page.locator('#drag-session-file').setInputFiles({name:'exported-drag.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(session))});await page.clock.fastForward(1100);assert.match(await page.locator('#drag-engine-source').textContent(),/Imported run/);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'drag overflow at '+width);}
  await page.evaluate(()=>scrollTo(0,document.querySelector('#drag-calculator').offsetTop));await page.screenshot({path:'/tmp/ingenium-drag-0150.png'});
  assert.deepEqual(errors,[]);console.log('PASS: capture-first layout, 3-2-1/green GO, manual powertrain/PWR, separate measured outputs, explicit use, manual RPM override, zero-speed completion/auto-analysis, manual stop and mobile layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
