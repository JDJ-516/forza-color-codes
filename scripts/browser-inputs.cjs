async function fillCanonical(locator,value){const {toDisplay}=await import('../public/units.js');const kind=await locator.getAttribute('data-si-display');await locator.fill(String(typeof value==='number'?toDisplay(value,kind):value));}
// Explicit synthetic build inputs for browser tests. Production forms start blank.
const ratios='3.2, 2.4, 1.8, 1.4, 1.1, 0.9';

async function fillDrag(page){
 await page.locator('#drag-form details').evaluateAll(ds=>ds.forEach(d=>d.open=true));
 await page.locator('#drag-strip').selectOption('fh6:irakawa-space-centre:321.869');await page.locator('#drag-form [name=drive]').selectOption('RWD');await page.locator('#drag-launch-control').selectOption('enabled');await page.locator('#drag-form [name=setupGearCount]').selectOption('6');await page.locator('#drag-form [name=tireCompound]').selectOption('Drag');
 const values={name:'Synthetic drag build',car:'Synthetic test car',mass:1400,powerKw:350,torqueNm:550,frontPercent:55,engineLimitRpm:8000,tireDiameterIn:27.5,topSpeedGoalMph:200};
 for(const [name,value] of Object.entries(values))await fillCanonical(page.locator(`#drag-form [name=${name}]`),value);
}
async function fillTrack(page){
 await page.locator('#gear-count').selectOption('6');const values={'tune-name':'Synthetic road setup','tune-car':'Synthetic test car','tire-width':265,'tire-aspect':35,'tire-rim':19,'shift-rpm':8000,'final-drive':3.7,'target-speed':300,'vehicle-mass':1400,'front-weight':55,'front-unsprung':40,'rear-unsprung':40,'front-frequency':1.8,'rear-frequency':2,'front-motion':1,'rear-motion':1,'damping-ratio':.65};
 for(const [id,value] of Object.entries(values))await fillCanonical(page.locator('#'+id),value);for(const [i,value] of [3.2,2.4,1.8,1.4,1.1,.9].entries())await page.locator(`[data-gear="${i}"]`).fill(String(value));
}
async function fillDrift(page){const values={name:'Synthetic drift setup',car:'Synthetic test car',width:265,aspect:35,rim:19,rpm:6500,roadKph:80,overrunPercent:30,finalDrive:3.7,gear:3,ratios};for(const [name,value] of Object.entries(values))await fillCanonical(page.locator(`#drift-form [name=${name}]`),value);}
module.exports={fillDrag,fillTrack,fillDrift,fillCanonical};
