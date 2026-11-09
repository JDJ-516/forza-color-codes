const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {fillDrag}=require('./browser-inputs.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/telemetry',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({state:'waiting',packets:0,dragCapture:{id:0,state:'idle'}})}));
 await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:3017')+'/?tune=drag#tuning');await page.locator('#drag-setup-generate').waitFor();
 assert.equal(await page.locator('#app-version').textContent(),'Build 0.18.0');
 for(const id of ['drag-capture-details','drag-measured-details'])assert.equal(await page.locator('#'+id).getAttribute('open'),null);
 for(const id of ['drag-start-now','drag-reset-capture','drag-stop-capture','drag-analyze-live','drag-export-capture'])assert.equal(await page.locator('#'+id).isVisible(),true);
 assert.equal(await page.locator('#drag-session-file').isHidden(),true);
 const f=n=>page.locator(`#drag-form [name=${n}]`);
 for(const name of ['topSpeedGoalMph','setupGearCount','tireCompound','launchControl'])assert.equal(await page.locator(`#drag-powertrain [name=${name}]`).count(),1);
 assert.deepEqual(await f('launchControl').locator('option').evaluateAll(a=>a.filter(x=>x.value).map(x=>x.textContent)),['On','Off']);
 for(const name of ['shiftRpm','torquePeakRpm','powerPeakRpm','setupFirstGear','setupTopGear','lowTorquePercent','lossPercent','mu','wheelbase','cgHeight','cda','rolling','launchRpm','manualRpm','throttleRamp','shiftSeconds','finalDrive','ratios','width','aspect','rim','setupFrontHz','setupRearHz','setupDamperMin','setupDamperMax','setupSpringMin','setupSpringMax'])assert.equal(await f(name).count(),0,name+' should be removed');
 assert.doesNotMatch(await page.locator('#drag-form').textContent(),/Enter the specifications|Captured maxima and shift|Advanced traction|Chassis & tire starting|Launch & gearing/);
 await fillDrag(page);await f('car').fill('2018 Jeep Grand Cherokee Trackhawk');await f('drive').selectOption('AWD');await f('mass').fill('5300');await page.locator('#drag-setup-generate').click();
 assert.deepEqual(await page.locator('#drag-setup-tabs button').allTextContents(),['Tires','Gearing','Alignment','Antiroll bars','Springs','Damping','Aero','Brake','Differential']);
 assert.match(await page.locator('#drag-setup-status').textContent(),/Starting setup generated/);
 assert.match(await page.locator('#setup-panel-0').textContent(),/18.0 PSI/);
 await page.getByRole('tab',{name:'Gearing',exact:true}).click();assert.equal(await page.locator('#drag-goal-result tbody tr').count(),7);assert.ok(Math.abs(Number((await page.locator('#drag-goal-result').textContent()).match(/([\d.]+) mph at/)[1])-200)<4);
 const ratios=await page.locator('#drag-goal-result tbody td:nth-child(2)').allTextContents();assert.ok(ratios.every(x=>/^\d+\.\d{2}$/.test(x)));assert.ok(Number(ratios[0])<=6.1);
 await page.getByRole('tab',{name:'Damping',exact:true}).click();const damping=await page.locator('#setup-panel-5 dd').allTextContents();assert.ok(damping.every(x=>Number(x)>=1&&Number(x)<=20));
 await page.getByRole('tab',{name:'Differential',exact:true}).click();assert.match(await page.locator('#setup-panel-8').textContent(),/63% rear/);await page.keyboard.press('ArrowLeft');assert.equal(await page.getByRole('tab',{name:'Brake',exact:true}).getAttribute('aria-selected'),'true');
 assert.match(await page.locator('#setup-panel-7').textContent(),/100%/);
 assert.ok(await page.locator('#drag-settings-result').evaluate(e=>e.getBoundingClientRect().top)>=await page.locator('#drag-form').evaluate(e=>e.getBoundingClientRect().bottom));
 const row=await page.locator('.drag-build-row label').evaluateAll(a=>a.filter(n=>n.getClientRects().length).map(n=>Math.round(n.getBoundingClientRect().top)));assert.equal(new Set(row).size,1);
 const download=page.waitForEvent('download');await page.locator('#drag-setup-export').click();const file=await download;const saved=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(saved.schema,'forza-ingenium-starting-setup/v2');assert.equal(saved.units.springRates,'lb/in');assert.equal(saved.gearing.gears.length,6);assert.equal(saved.chassis.differential.center,63);
 await f('mass').fill('3200');assert.equal(await page.locator('#drag-setup-export').isDisabled(),true);assert.match(await page.locator('#drag-setup-status').textContent(),/out of date/);
 await f('engineLimitRpm').fill('');await page.locator('#drag-setup-generate').click();assert.match(await page.locator('#drag-setup-status').textContent(),/Engine RPM limit is needed/);await page.getByRole('tab',{name:'Gearing',exact:true}).click();assert.match(await page.locator('#setup-panel-1').textContent(),/Engine RPM limit/);
 await f('engineLimitRpm').fill('8000');await f('launchControl').selectOption('disabled');await page.locator('#drag-setup-generate').click();assert.match(await page.locator('#drag-setup-status').textContent(),/Launch control Off/);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});for(const tab of await page.getByRole('tab').all()){await tab.click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);}}
 await page.getByRole('tab',{name:'Gearing',exact:true}).click();await page.locator('#drag-settings-result').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/ingenium-fh6-setup-0170.png'});assert.deepEqual(errors,[]);
 console.log('PASS: simplified Powertrain, removed inputs, On/Off LC, 9 FH6 tabs, two-decimal gearing, pictured damping/brake/AWD controls, offline partial results, export/stale state, keyboard and mobile layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
