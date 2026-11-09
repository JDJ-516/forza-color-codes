const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {packet}=await import('../test-support/telemetry-fixtures.js'),{decodeHorizonPacket}=await import('../fh6-decoder.js'),{resolveCar}=await import('../car-identities.js'),{engineKey}=await import('../telemetry-engine.js');
 const {fillDrag}=require('./browser-inputs.cjs'),{readSI,HP_PER_KW,LBFT_PER_NM}=await import('../public/units.js');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
  let latest={...decodeHorizonPacket(packet({speed:50,car:3726})),torqueNm:550};const key=engineKey(latest);let capture={id:0,state:'idle'},starts=0;
  await page.route('**/api/telemetry',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({state:'receiving',decodedAgeMs:0,latest,car:resolveCar(3726),dragCapture:capture})}));
  await page.route('**/api/telemetry/drag/start*',r=>{starts++;capture={id:starts,key,state:new URL(r.request().url()).searchParams.has('countdown')?'countdown':'recording',remainingMs:5000,launched:true,recordedSamples:0};return r.fulfill({contentType:'application/json',body:JSON.stringify(capture)});});
  await page.route('**/api/telemetry/drag/stop',r=>{capture={...capture,state:'stopped',reason:'manual',stoppedAt:Date.now()};return r.fulfill({contentType:'application/json',body:JSON.stringify(capture)});});
  const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3017';await page.goto(base+'/?tune=drag#tuning');await page.locator('#drag-start-now').waitFor();
  assert.equal(await page.locator('#drag-strip').inputValue(),'');await page.locator('#drag-start-now').click();await page.waitForFunction(()=>document.querySelector('#drag-capture-countdown').textContent==='LIVE');assert.equal(starts,1);
  await page.locator('#drag-stop-capture').click();await page.waitForFunction(()=>document.querySelector('#drag-capture-countdown').textContent==='STOPPED');
  assert.equal(await page.locator('#drag-strip-info').count(),0);assert.doesNotMatch(await page.locator('#drag-form').textContent(),/Preset distances|Pink Wristband|Nangan|kW|N·m|kg|meters|liters/);
  for(let j=0;j<5;j++){
   latest={...latest,timestampMs:10000+j*100,speedKph:100,throttle:0,brake:0,steer:0,tireSlipRatio:[0,0,0,0],wheelRotationSpeed:Array(4).fill(2*(100/3.6)/(.0254*29))};
   const next=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/telemetry');await page.clock.fastForward(1200);await next;
  }
  await page.waitForFunction(()=>document.querySelector('#drag-form [name=tireDiameterIn]').value==='29');
  assert.equal(await page.locator('#drag-form [name=engineLimitRpm]').inputValue(),'8000');
  latest={...latest,speedKph:50*3.6,throttle:1};
  await fillDrag(page);const f=name=>page.locator(`#drag-form [name=${name}]`);
  assert.ok(Math.abs(Number(await f('powerKw').inputValue())-350*HP_PER_KW)<1e-8);assert.ok(Math.abs(Number(await f('torqueNm').inputValue())-550*LBFT_PER_NM)<1e-8);
  await f('name').fill('US migration check');await page.locator('#drag-form button[type=submit]').click();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('fcc-drag-builds'))[0]);assert.ok(Math.abs(stored.input.powerKw-350)<1e-7);assert.ok(Math.abs(stored.input.mass-1400)<1e-7);assert.ok(Math.abs(stored.input.torqueNm-550)<1e-7);
  await f('topSpeedGoalMph').fill('200');await page.locator('#drag-setup-generate').click();await page.getByRole('tab',{name:'Gearing',exact:true}).click();assert.match(await page.locator('#drag-goal-result').textContent(),/200.0 mph.*7840 RPM/);assert.match(await page.locator('#drag-goal-result').textContent(),/RPM after shift/);
  await f('mass').fill('3200');await page.locator('[data-drag-load]').first().click();assert.equal(await f('mass').inputValue(),'3086.47');
  await page.locator('#drag-start-now').click();capture={...capture,measurements:{key,eligibleSamples:10,powerSamples:10,torqueSamples:10,peakPowerW:350000,peakTorqueNm:550,torquePeakRpm:5000,observedShifts:1,shiftRpm:7200}};await page.clock.fastForward(1100);await page.waitForFunction(()=>document.querySelector('#drag-measured-power').textContent==='469.4 HP');assert.equal(await page.locator('#drag-measured-torque').textContent(),'405.7 ft-lb');
  await page.locator('#drag-apply-measured').click();assert.equal(await f('powerKw').inputValue(),'469.36');
  await page.locator('.topbar [data-workspace=telemetry]').click();assert.match(await page.locator('[data-channel=speedKph]').textContent(),/111.*mph/);assert.match(await page.locator('[data-channel="tireTempC.0"]').textContent(),/212.*°F/);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});await page.locator('.topbar [data-workspace=tuning]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.evaluate(()=>scrollTo(0,document.querySelector('#drag-form').offsetTop));await page.screenshot({path:'/tmp/ingenium-us-goal-0151.png'});
  // The old canonical schema still loads, without relabeling its driver shift target as an engine limit.
  await page.evaluate(()=>{
   const old={id:'legacy',name:'Legacy SI build',car:'Legacy car',strip:'Irakawa Space Centre Drag Strip',stripId:'irakawa-space-centre',input:{mass:1400,powerKw:350,torqueNm:550,frontPercent:55,drive:'RWD',launchControl:'enabled',distanceM:321.869,width:265,aspect:35,rim:19,shiftRpm:7500,gears:[3.2,2.4,1.8,1.4,1.1,.9]},powerCurve:[]};localStorage.setItem('fcc-drag-builds',JSON.stringify([old]));
  });await page.reload();await page.locator('[data-drag-load]').click();assert.equal(await f('mass').inputValue(),'3086.47');assert.equal(await f('setupGearCount').inputValue(),'6');assert.equal(await f('engineLimitRpm').inputValue(),'');assert.ok(Math.abs(await f('tireDiameterIn').evaluate(async el=>(await import('/units.js')).readSI(el))-(19+2*265*.35/25.4))<1e-8);
  await page.waitForFunction(()=>document.querySelector('#tuning-car-status').textContent.includes('Live ·'));
  const {dragSession}=await import('../test-support/telemetry-fixtures.js');await page.locator('#drag-session-file').setInputFiles({name:'different-car.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(dragSession()))});await page.waitForFunction(()=>document.querySelector('#drag-run-status').textContent.includes('different car/build'));assert.match(await page.locator('#drag-run-status').textContent(),/different car\/build/);assert.equal(await page.locator('#drag-measured-power').textContent(),'—');assert.equal(await page.locator('#drag-save-run').isDisabled(),true);
  assert.deepEqual(errors,[]);console.log('PASS: moving capture without strip, removed notes, HP/ft-lb/lb/ft/in display, saved SI precision, automatic coasting diameter, mph goal gearing, captured US engine values, US telemetry and mobile layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
