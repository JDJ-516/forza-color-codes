const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {fillDrag}=require('./browser-inputs.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/telemetry',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({state:'waiting',dragCapture:{state:'idle',id:0}})}));
 await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:3018')+'/?tune=drag#tuning');const f=n=>page.locator(`#drag-form [name=${n}]`);
 assert.equal(await page.locator('#competition-panel').count(),0);assert.doesNotMatch(await page.locator('body').textContent(),/COMPETITIVE DEVELOPMENT|Chase your benchmark/);
 for(const name of ['engineLimitRpm','tireDiameterIn','tireSize'])assert.equal(await f(name).isVisible(),true);
 assert.equal(await page.locator('#drag-gearing-data').count(),0);
 await fillDrag(page);await f('tireSize').fill('295/45R20');assert.equal(await f('tireDiameterIn').inputValue(),'30.45');assert.equal(await page.locator('#drag-tire-error').textContent(),'');
 await page.locator('#drag-setup-generate').click();await page.getByRole('tab',{name:'Gearing',exact:true}).click();assert.match(await page.locator('#drag-goal-result').textContent(),/Offline power-envelope gearing fit/);
 let d=page.waitForEvent('download');await page.locator('#drag-setup-export').click();let saved=JSON.parse(fs.readFileSync(await (await d).path(),'utf8'));assert.ok(Math.abs(saved.inputs.tireDiameterIn-30.45275590551181)<1e-9);assert.equal(saved.inputs.tireSize,'295/45R20');assert.ok(saved.gearing.fit.candidateCost<=saved.gearing.fit.referenceCost+1e-8);
 await page.locator('#drag-form button[type=submit]').click();await page.reload();await page.locator('[data-drag-load]').click();assert.equal(await f('tireSize').inputValue(),'295/45R20');assert.equal(await f('tireDiameterIn').inputValue(),'30.45');
 await f('tireSize').fill('not a size');await page.locator('#drag-setup-generate').click();assert.match(await page.locator('#drag-setup-status').textContent(),/295\/45R20/);assert.equal(await f('tireSize').getAttribute('aria-invalid'),'true');assert.equal(await f('tireDiameterIn').inputValue(),'');
 await f('tireSize').fill('28x10.5R15');assert.equal(await f('tireDiameterIn').inputValue(),'28');await f('tireDiameterIn').fill('27.5');assert.equal(await f('tireSize').inputValue(),'');await f('name').fill('Direct diameter build');await page.locator('#drag-form button[type=submit]').click();await page.locator('[data-drag-load]').nth(1).click();assert.equal(await f('tireSize').inputValue(),'295/45R20');await page.locator('[data-drag-load]').first().click();assert.equal(await f('tireDiameterIn').inputValue(),'27.5');assert.equal(await f('tireSize').inputValue(),'');
 // A physically coherent captured first gear, with a broad measured power curve.
 const samples=[];for(let j=0;j<80;j++){const speedKph=30+j*.35;samples.push({timestampMs:j*20,isRaceOn:true,carOrdinal:42,gear:1,speedKph,rpm:speedKph/3.6/(Math.PI*27.5*.0254)*60*12,throttle:1,brake:0,steer:0,engineMaxRpm:8000,powerW:200000,tireSlipRatio:[0,0,0,0]});}
 for(let bin=0;bin<25;bin++)for(let j=0;j<7;j++){const rpm=2000+bin*250;samples.push({timestampMs:1600+(bin*7+j)*20,isRaceOn:true,carOrdinal:42,gear:2,speedKph:rpm/(9*60)*(Math.PI*27.5*.0254)*3.6,rpm,throttle:1,brake:0,steer:0,engineMaxRpm:8000,powerW:400000-Math.abs(5500-rpm)*90,tireSlipRatio:[0,0,0,0]});}
 await page.locator('#drag-session-file').setInputFiles({name:'coherent-pull.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:'forza-garage-telemetry/v1',samples}))});await page.waitForFunction(()=>document.querySelector('#drag-run-status').textContent.includes('no usable standing-start run'));
 await page.locator('#drag-setup-generate').click();await page.getByRole('tab',{name:'Gearing',exact:true}).click();assert.match(await page.locator('#drag-goal-result').textContent(),/Power-curve gearing fit/);assert.match(await page.locator('#drag-goal-result').textContent(),/Captured first-gear reduction retained/);
 d=page.waitForEvent('download');await page.locator('#drag-setup-export').click();saved=JSON.parse(fs.readFileSync(await (await d).path(),'utf8'));assert.ok(Math.abs(saved.gearing.gears[0]*saved.gearing.finalDrive/12-1)<.01);assert.equal(saved.gearing.fit.mode,'measured power curve');assert.ok(saved.gearing.fit.capturedGearsEvaluated>=2);assert.match(await page.locator('#drag-goal-result').textContent(),/Speed at shift \(mph\)/);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await f('engineLimitRpm').isVisible(),true);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.locator('#drag-powertrain').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ingenium-powertrain-0180.png'});await page.locator('#drag-settings-result').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ingenium-gearing-0180.png'});assert.deepEqual(errors,[]);
 console.log('PASS: required visible specifications, automatic metric/flotation tire conversion, errors and saved precision, removed benchmark, offline power fit, measured launch retention, gearing export and mobile layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
