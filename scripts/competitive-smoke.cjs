const {fillDrag}=require('./browser-inputs.cjs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {dragSession}=await import('../test-support/telemetry-fixtures.js');
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:3000')+'/?tune=drag#tuning');
 await page.locator('#competition-panel').waitFor();await fillDrag(page);assert.match(await page.title(),/Forza-ingenium/);
 assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(20, 20, 20)');
 const input=name=>page.locator(`#competition-form [name="${name}"]`);
 for(const [name,value] of Object.entries({event:'Test strip',car:'Test build',className:'S1 900',conditions:'Dry',assists:'No assists',setup:'A',target:'10'}))await input(name).fill(value);
 await input('launchControl').selectOption('enabled');
 await input('clean').check();
 for(const value of ['10.4','10.5','10.6']){await input('value').fill(value);await page.locator('#competition-form button[type=submit]').click();}
 await input('setup').fill('B');for(const value of ['9.9','10','10.1']){await input('value').fill(value);await page.locator('#competition-form button[type=submit]').click();}
 assert.equal(await page.locator('#competition-summary tbody tr').count(),2);
 await page.locator('#competition-baseline').selectOption('A');await page.locator('#competition-candidate').selectOption('B');await page.locator('#competition-compare').click();assert.match(await page.locator('#competition-comparison').textContent(),/0.500 seconds/);
 await input('conditions').fill('Wet');assert.equal(await page.locator('#competition-summary tbody tr').count(),0);await input('conditions').fill('Dry');
 await page.reload();assert.equal(await page.locator('#competition-history .saved-tune').count(),6);await fillDrag(page);
 await page.locator('#drag-session-file').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(dragSession()))});
 await page.locator('#competition-drag').waitFor();assert.equal(await page.locator('#competition-drag').isEnabled(),true);await page.locator('#competition-drag').click();assert.equal(await input('event').inputValue(),'Irakawa Space Centre Drag Strip');assert.ok(Number(await input('value').inputValue())>0);assert.match(await page.locator('#competition-evidence').textContent(),/Telemetry-integrated/);assert.match(await page.locator('#drag-validation').textContent(),/Real-run validation/);await page.locator('#drag-strip').selectOption('custom');await page.locator('#drag-form [name=distanceM]').fill('');assert.equal(await page.locator('#competition-drag').isDisabled(),true);await page.locator('#drag-form [name=distanceM]').fill('321.869');assert.equal(await page.locator('#competition-drag').isEnabled(),true);
 await page.locator('#drag-session-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});assert.equal(await page.locator('#competition-drag').isDisabled(),true);
 await page.locator('#tune-mode-picker [data-tune-mode=drift]').click();assert.equal(await input('mode').inputValue(),'drift');assert.equal(await input('value').inputValue(),'');
 await input('event').fill('Drift route');await input('car').fill('Drift build');await input('className').fill('A 800');await input('conditions').fill('Dry');await input('assists').fill('No assists');await input('setup').fill('Drift A');await input('value').fill('100000');await input('clean').check();await page.locator('#competition-form button[type=submit]').click();assert.match(await page.locator('#competition-summary').textContent(),/100000/);
 await page.locator('#tune-mode-picker [data-tune-mode=track]').click();
 const track=dragSession({seconds:25});for(const sample of track.samples){const t=sample.timestampMs/1000;sample.lapNumber=Math.floor(t/6);sample.currentLapS=t%6;sample.lastLapS=t>=6?6:0;}
 await page.locator('#competition-file').setInputFiles({name:'track-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(track))});
 await page.locator('#competition-lap-wrap').waitFor();assert.ok(await page.locator('#competition-lap option').count()>=2);assert.equal(Number(await input('value').inputValue()),6);await input('setup').fill('Track A');await input('clean').check();await page.locator('#competition-form button[type=submit]').click();assert.match(await page.locator('#competition-history').textContent(),/track telemetry/);await page.locator('#competition-form button[type=submit]').click();assert.match(await page.locator('#competition-status').textContent(),/already recorded/);
 await page.locator('#competition-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});assert.equal(await input('value').inputValue(),'');assert.equal(await page.locator('#competition-lap-wrap').isHidden(),true);
 const download=page.waitForEvent('download');await page.locator('#competition-export').click();assert.equal((await download).suggestedFilename(),'forza-ingenium-results.json');
 await page.locator('#tune-mode-picker [data-tune-mode=drag]').click();await page.locator('#opt-spacing').check();await page.locator('#drag-optimize').click();await page.locator('#drag-apply-candidate').waitFor();assert.equal(await page.locator('#drag-candidates tbody tr').count(),5);
 await page.screenshot({path:'/tmp/ingenium-tuning.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/ingenium-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:3000')+'/');await page.locator('#featured-recipe').waitFor();await page.screenshot({path:'/tmp/ingenium-home.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: neutral branding, deep links, repeated A/B runs, exact-context filtering, persistence, telemetry ET handoff/reset, drift scores, export, multi-variable search and mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
