const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/telemetry',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({state:'waiting',packets:0,dragCapture:{id:0,state:'idle'}})}));
  await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:3017')+'/?tune=drag#tuning');await page.locator('#drag-setup-generate').waitFor();
  assert.equal(await page.locator('#app-version').textContent(),'Build 0.16.0');assert.equal(await page.locator('#drag-capture-details').getAttribute('open'),null);assert.equal(await page.locator('#drag-capture-indicator').isHidden(),true);assert.equal(await page.locator('#drag-measured-details').getAttribute('open'),null);
  for(const id of ['drag-start-now','drag-reset-capture','drag-stop-capture','drag-analyze-live','drag-export-capture'])assert.equal(await page.locator('#'+id).isVisible(),true);
  assert.equal(await page.locator('#drag-session-file').isHidden(),true);await page.locator('#drag-capture-details summary').click();assert.equal(await page.locator('#drag-session-file').isVisible(),true);await page.locator('#drag-capture-details summary').click();
  const f=name=>page.locator(`#drag-form [name=${name}]`);
  for(const [name,value] of Object.entries({car:'Reference car',mass:3086.47,frontPercent:55,width:10.43,aspect:35,rim:19,shiftRpm:8000,torquePeakRpm:5000,topSpeedGoalMph:200,powerPeakRpm:7000}))await f(name).fill(String(value));await f('drive').selectOption('RWD');await f('setupGearCount').selectOption('6');
  assert.equal(await f('ratios').inputValue(),'');await page.locator('#drag-setup-generate').click();await page.locator('.generated-setting-card').first().waitFor();
  assert.equal(await page.locator('.generated-setting-card').count(),7);assert.match(await page.locator('#drag-setup-status').textContent(),/Starting setup generated/);assert.equal(await page.locator('#drag-goal-result tbody tr').count(),7);
  assert.match(await page.locator('#drag-goal-result').textContent(),/200.*mph/);assert.match(await page.locator('.generated-setting-card').filter({has:page.getByRole('heading',{name:'Springs',exact:true})}).textContent(),/lb\/in/);
  const dampers=page.locator('.generated-setting-card').filter({has:page.getByRole('heading',{name:'Dampers',exact:true})});assert.match(await dampers.textContent(),/7.7/);assert.match(await dampers.textContent(),/4.6/);
  const tires=page.locator('.generated-setting-card').filter({has:page.getByRole('heading',{name:'Tire pressure',exact:true})});assert.match(await tires.textContent(),/29.5 PSI/);assert.equal(await f('tireCompound').inputValue(),'Drag');
  assert.ok(await page.locator('#drag-settings-result').evaluate(e=>e.getBoundingClientRect().top)>=await page.locator('#drag-form').evaluate(e=>e.getBoundingClientRect().bottom));
  const row=await page.locator('.drag-build-row label').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>Math.round(n.getBoundingClientRect().top)));assert.equal(new Set(row).size,1);
  await page.locator('#drag-goal-apply').click();assert.equal((await f('ratios').inputValue()).split(',').length,6);assert.ok(Number(await f('finalDrive').inputValue())>0);assert.equal(await page.locator('#drag-setup-export').isDisabled(),false);
  const download=page.waitForEvent('download');await page.locator('#drag-setup-export').click();const file=await download;assert.equal(file.suggestedFilename(),'forza-starting-setup.json');const saved=JSON.parse(require('node:fs').readFileSync(await file.path(),'utf8'));assert.equal(saved.units.springRates,'lb/in');assert.equal(saved.gearing.gears.length,6);assert.ok(saved.chassis.springs.front>0);
  await f('mass').fill('3200');assert.equal(await page.locator('#drag-setup-export').isDisabled(),true);assert.match(await page.locator('#drag-setup-status').textContent(),/changed/);
  await f('setupDamperMax').fill('5');await page.locator('#drag-setup-generate').click();assert.match(await dampers.textContent(),/OUTSIDE ENTERED DAMPER RANGE/);
  await f('setupDamperMax').fill('20');await page.locator('#drag-setup-generate').click();
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow at '+width);}
  await page.evaluate(()=>scrollTo(0,document.querySelector('#drag-settings-result').getBoundingClientRect().top+scrollY));await page.screenshot({path:'/tmp/ingenium-setup-0160.png'});await page.evaluate(()=>scrollTo(0,document.querySelector('#drag-calculator').getBoundingClientRect().top+scrollY));await page.screenshot({path:'/tmp/ingenium-inputs-0160.png'});assert.deepEqual(errors,[]);console.log('PASS: collapsed capture details with visible controls, version wordmark, horizontal inputs, bottom settings sheet, generated gears/springs/dampers/tires, apply/export, stale results, range warnings and mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
