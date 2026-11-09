const {fillDrag}=require('./browser-inputs.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {dragSession}=await import('../test-support/telemetry-fixtures.js');const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/telemetry',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({state:'waiting',dragCapture:{state:'idle',id:0}})}));
 await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:3017')+'/?tune=drag#tuning');await fillDrag(page);
 const f=name=>page.locator(`#drag-form [name=${name}]`),distance=()=>f('distanceM').evaluate(async el=>(await import('/units.js')).readSI(el));
 for(const [value,meters]of [['fh6:irakawa-space-centre:321.869',321.869],['fh6:ito-airfield:804.672',804.672],['fh6:horizon-festival:965.606',965.606]]){await page.locator('#drag-strip').selectOption(value);assert.ok(Math.abs(await distance()-meters)<1e-8);assert.equal(await f('distanceM').isHidden(),true);}
 await page.locator('#drag-strip').selectOption('custom');await f('distanceM').fill('1320');assert.ok(Math.abs(await distance()-402.336)<1e-8);await f('name').fill('Drag <safe> build');await f('launchControl').selectOption('disabled');await page.locator('#drag-form button[type=submit]').click();assert.equal(await page.locator('[data-drag-load]').count(),1);
 await page.reload();await page.locator('[data-drag-load]').click();assert.equal(await f('name').inputValue(),'Drag <safe> build');assert.equal(await f('launchControl').inputValue(),'disabled');assert.equal(await f('setupGearCount').inputValue(),'6');assert.ok(Math.abs(await distance()-402.336)<1e-8);
 await page.locator('#drag-capture-details').evaluate(e=>e.open=true);await page.locator('#drag-run-lc').selectOption('enabled');
 const file=()=>({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(dragSession()))});await page.locator('#drag-session-file').setInputFiles(file());await page.waitForFunction(()=>document.querySelector('#drag-run-status').textContent.includes('Completed measured run'));
 assert.match(await page.locator('#drag-validation').textContent(),/Measured run/);await page.locator('#drag-setup-generate').click();assert.match(await page.locator('#drag-setup-feedback').textContent(),/Driven-wheel slip/);
 await page.locator('#drag-save-run').click();await page.locator('[data-run-compare]').click();assert.match(await page.locator('#drag-compare-note').textContent(),/ET \+0.000 s/);
 await f('distanceM').fill('5280');assert.match(await page.locator('#drag-run-results').textContent(),/1 mile/);
 await page.locator('#drag-session-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});assert.equal(await page.locator('#drag-save-run').isDisabled(),true);assert.equal(await page.locator('#drag-validation').isHidden(),true);assert.equal(await page.locator('#drag-setup-export').isDisabled(),true);
 const moving=dragSession();moving.samples=moving.samples.filter(s=>s.speedKph>30);await page.locator('#drag-session-file').setInputFiles({name:'moving.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(moving))});assert.match(await page.locator('#drag-run-status').textContent(),/no usable standing-start run/);assert.equal(await page.locator('#drag-validation').isHidden(),true);
 await page.route('**/api/telemetry/drag/session',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(dragSession())}));await f('distanceM').fill('1320');await page.locator('#drag-analyze-live').click();await page.waitForFunction(()=>document.querySelector('#drag-run-status').textContent.includes('Completed measured run'));
 for(const [selector,filename]of [['#drag-export-capture','forza-telemetry-session.json'],['[data-drag-export]','forza-drag-build.json']]){const d=page.waitForEvent('download');await page.locator(selector).click();assert.equal((await d).suggestedFilename(),filename);}
 await page.locator('[data-drag-delete]').click();assert.equal(await page.locator('[data-drag-load]').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: FH6/custom distances, LC, saved builds/reload, measured run import/comparison, telemetry feedback, distance recomputation, malformed/rolling captures, live analysis and exports.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
