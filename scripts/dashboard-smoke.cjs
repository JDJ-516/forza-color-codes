const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000',page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const data=JSON.parse(fs.readFileSync('public/catalogue.json','utf8')),longest=data.filter(c=>c.layers.length===2).sort((a,b)=>b.name.length-a.name.length)[0];
 await page.addInitScript(id=>localStorage.setItem('fcc-featured-color',JSON.stringify({id,changedAt:Date.now()})),longest.id);
 await page.clock.install();let snapshot={state:'waiting',packets:0};let fail=false;
 await page.route('**/api/telemetry',r=>r.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify(snapshot)}));
 await page.goto(base);await page.locator('#featured-name').filter({hasText:longest.name}).waitFor();assert.equal(await page.locator('.brand-sub').count(),0);assert.equal(await page.title(),'Forza-ingenium');
 const icon=await page.locator('link[rel=icon]').getAttribute('href'),response=await page.request.get(base+icon);assert.equal(response.status(),200);assert.match(response.headers()['content-type'],/image\/svg\+xml/);assert.equal(await page.evaluate(async()=>{const img=new Image();img.src=document.querySelector('link[rel=icon]').href;await img.decode();return img.naturalWidth>0;}),true);
 for(const [width,height] of [[1280,720],[1366,768],[1440,900],[1920,1080]]){await page.setViewportSize({width,height});const size=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,viewportWidth:innerWidth,viewportHeight:innerHeight}));assert.ok(size.height<=height,`Dashboard requires scrolling at ${width}x${height}: ${JSON.stringify(size)}`);assert.ok(size.width<=width);assert.equal(await page.locator('.garage-overview').isVisible(),true);}
 const green='rgb(107, 224, 156)',ids=['home-telemetry-title','telemetry-title','home-telemetry-state','telemetry-state'];
 for(const active of [true,false]){snapshot={state:'receiving',packets:10,recordedSamples:5,decodedAgeMs:0,latest:{isRaceOn:active,speedKph:active?100:0,rpm:3000,gear:2}};await page.clock.fastForward(1100);await page.waitForFunction(active=>document.querySelector('#home-telemetry-state').textContent===(active?'Live driving data':'Connected · game inactive'),active);for(const id of ids)assert.equal(await page.locator('#'+id).evaluate(e=>getComputedStyle(e).color),green);}
 for(const state of ['stale','waiting','disabled','stopped','error']){snapshot={...snapshot,state};await page.clock.fastForward(1100);await page.waitForFunction(expected=>document.querySelector('#home-telemetry-state').textContent===expected,({stale:'Signal lost',waiting:'Waiting for game',disabled:'Receiver disabled',stopped:'Receiver stopped',error:'Receiver error'})[state]);for(const id of ids)assert.equal(await page.locator('#'+id).evaluate(e=>getComputedStyle(e).color),'rgb(255, 184, 107)');assert.doesNotMatch(await page.locator('#home-telemetry-state').textContent(),/Live driving|Connected/);}
 snapshot={state:'receiving',packets:20};await page.clock.fastForward(1100);assert.notEqual(await page.locator('#telemetry-title').evaluate(e=>getComputedStyle(e).color),green);
 snapshot={state:'receiving',decodedAgeMs:0,latest:{isRaceOn:true,speedKph:100,rpm:3000,gear:2}};await page.clock.fastForward(1100);await page.waitForFunction(()=>document.querySelector('#telemetry-title').classList.contains('is-connected'));fail=true;await page.clock.fastForward(1100);await page.waitForFunction(()=>!document.querySelector('#telemetry-title').classList.contains('is-connected'));
 await page.setViewportSize({width:1366,height:768});await page.screenshot({path:'/tmp/dashboard-compact.png'});assert.deepEqual(errors,[]);console.log('PASS: compact Dashboard at four desktop sizes with long two-layer recipe, favicon decoded, no subtitle, green active/inactive connections and clearing on stale/raw/error/disconnected data.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
