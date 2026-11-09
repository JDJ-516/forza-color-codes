const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {packet}=await import('../test-support/telemetry-fixtures.js'),{decodeHorizonPacket}=await import('../fh6-decoder.js'),{resolveCar}=await import('../car-identities.js'),{engineKey}=await import('../telemetry-engine.js');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();
  let snapshot={state:'waiting',packets:0};
  await page.route('**/api/telemetry',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(snapshot)}));
  const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3017';await page.goto(base+'/#tuning');
  await page.locator('#tuning-setup-link').waitFor();assert.equal(await page.locator('#tuning-setup-link').getAttribute('href'),'/telemetry-setup.html');
  const doc=await page.request.get(base+'/telemetry-setup.html');assert.equal(doc.status(),200);assert.match(await doc.text(),/127.0.0.1.*5300/);
  await page.locator('.topbar [data-workspace=telemetry]').click();assert.equal(await page.locator('#telemetry-setup').getAttribute('open'),null);
  await page.locator('#telemetry-setup summary').click();assert.equal(await page.locator('#telemetry-setup li').count(),6);assert.equal(await page.locator('#telemetry-setup li').last().isVisible(),true);
  await page.locator('.topbar [data-workspace=tuning]').click();
  assert.deepEqual(await page.locator('#drag-strip option').evaluateAll(options=>options.filter(o=>['201.168','402.336','804.672','1609.344'].includes(o.value)).map(o=>o.value)),[]);
  assert.equal(await page.locator('#drag-strip option[data-fh6-id]').count(),3);
  function driving(ordinal,power=350000){const s=decodeHorizonPacket(packet({car:ordinal}));return {state:'receiving',decodedAgeMs:0,latest:s,car:resolveCar(ordinal),engineMeasurements:{key:engineKey(s),eligibleSamples:10,peakPowerW:power,peakTorqueNm:550,torquePeakRpm:5000}};}
  async function update(value){snapshot=value;await page.clock.fastForward(1100);}
  await update(driving(3726));await page.waitForFunction(()=>document.querySelector('#tuning-car-make').textContent==='Acura');
  assert.equal(await page.locator('#tuning-car-year').textContent(),'2023');assert.equal(await page.locator('#tuning-car-model').textContent(),'Integra A-Spec');assert.equal(await page.locator('#tuning-setup-link').isHidden(),true);
  for(const selector of ['#drag-form [name=car]','#tune-car','#drift-form [name=car]'])assert.equal(await page.locator(selector).inputValue(),'2023 Acura Integra A-Spec');
  assert.equal(await page.locator('#drag-form [name=drive]').inputValue(),'RWD');assert.equal(await page.locator('#drag-form [name=powerKw]').inputValue(),'');assert.equal(await page.locator('#drag-form [name=shiftRpm]').inputValue(),'');
  assert.equal(await page.locator('#shift-rpm').inputValue(),'8000');assert.equal(await page.locator('#drift-form [name=rpm]').inputValue(),'8000');
  for(const name of ['mass','width','ratios','launchControl'])assert.equal(await page.locator(`#drag-form [name=${name}]`).inputValue(),'');
  await page.locator('#tune-mode-picker [data-tune-mode=drag]').click();
  await page.locator('#drag-form [name=powerKw]').fill('420');await page.locator('#drag-form [name=mass]').fill('1400');
  await update(driving(3726,380000));assert.equal(await page.locator('#drag-form [name=powerKw]').inputValue(),'420');
  const resetMeasurement=driving(3726);resetMeasurement.engineMeasurements.eligibleSamples=0;await update(resetMeasurement);assert.equal(await page.locator('#drag-form [name=powerKw]').inputValue(),'420');assert.equal(await page.locator('#drag-form [name=torqueNm]').inputValue(),'');await update(driving(3726));
  await update(driving(3928));await page.waitForFunction(()=>document.querySelector('#tuning-car-make').textContent==='Hyundai');assert.equal(await page.locator('#drag-form [name=mass]').inputValue(),'');assert.equal(await page.locator('#drag-form [name=powerKw]').inputValue(),'');
  await update(driving(3726));await page.waitForFunction(()=>document.querySelector('#tuning-car-make').textContent==='Acura');assert.equal(await page.locator('#drag-form [name=mass]').inputValue(),'1400');assert.equal(await page.locator('#drag-form [name=powerKw]').inputValue(),'420');
  const changedBuild=driving(3726);changedBuild.latest.carPerformanceIndex=900;changedBuild.engineMeasurements.key=engineKey(changedBuild.latest);await update(changedBuild);await page.waitForFunction(()=>document.querySelector('#tuning-car-status').textContent.includes('900 PI'));assert.equal(await page.locator('#drag-form [name=mass]').inputValue(),'');await update(driving(3726));await page.waitForFunction(()=>document.querySelector('#drag-form [name=mass]').value==='1400');
  await update({state:'stale',latest:snapshot.latest,car:snapshot.car});await page.waitForFunction(()=>!document.querySelector('#tuning-setup-link').hidden);assert.equal(await page.locator('#tuning-car-year').textContent(),'—');assert.equal(await page.locator('#drag-form [name=mass]').inputValue(),'1400');
  await update(driving(999999));await page.waitForFunction(()=>document.querySelector('#current-car-title').textContent.includes('999999'));assert.equal(await page.locator('#tuning-car-make').textContent(),'—');assert.equal(await page.locator('#drag-form [name=car]').inputValue(),'');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await update(driving(3726));await page.waitForFunction(()=>document.querySelector('#tuning-car-make').textContent==='Acura');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/ingenium-tuning-current-car.png'});
  const {fillDrag}=require('./browser-inputs.cjs');await fillDrag(page);await page.locator('#drag-form button[type=submit]').click();await page.reload();if(await page.locator('#tune-mode-picker [data-tune-mode=drag]').getAttribute('aria-expanded')!=='true')await page.locator('#tune-mode-picker [data-tune-mode=drag]').click();await page.locator('[data-drag-load]').first().click();await update(driving(3726,400000));assert.equal(await page.locator('#drag-form [name=powerKw]').inputValue(),'350');assert.equal(await page.locator('#drag-form [name=car]').inputValue(),'Synthetic test car');
  assert.deepEqual(errors,[]);console.log('PASS: collapsed vertical setup, offline guide link, 3 FH6 strips, car year/make/model, measured prefills, manual override, safe car switches/profile restoration, unknown IDs, stale connection and responsive layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
