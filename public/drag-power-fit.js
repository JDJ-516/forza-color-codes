import {validateSession} from './telemetry-analysis.js';
const median=a=>{const b=[...a].sort((x,y)=>x-y),j=Math.floor(b.length/2);return b.length%2?b[j]:(b[j-1]+b[j])/2;};
const valid=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;

export function tireDiameterFromSize(text){
 const value=String(text).trim();
 if(!value)return null;
 // Tire designations use industry units: mm/%/in, or flotation diameter × width.
 const metric=value.match(/^(?:P|LT)?\s*(\d{3})\s*\/\s*(\d{2,3})\s*(?:ZR|R|[-])?\s*(\d{2}(?:\.\d+)?)\s*(?:[A-Z]{0,2})?$/i);
 let diameter;
 if(metric){const [,w,a,r]=metric.map(Number);if(!valid(w,100,500)||!valid(a,10,100)||!valid(r,10,30))throw new Error('Check the tire size, for example 295/45R20.');diameter=r+2*w*a/100/25.4;}
 else{
  const flotation=value.match(/^(\d{2}(?:\.\d+)?)\s*[x×]\s*(\d{1,2}(?:\.\d+)?)\s*(?:R|[-])?\s*(\d{2}(?:\.\d+)?)$/i);
  if(!flotation)throw new Error('Enter a tire size such as 295/45R20 or 28x10.5R15. The app calculates the diameter.');
  const [,d,w,r]=flotation.map(Number);if(!valid(w,3,20)||!valid(r,10,30)||d<=r)throw new Error('Check the tire diameter, width and wheel size.');diameter=d;
 }
 if(!valid(diameter,14,50))throw new Error('This tire size produces a diameter outside 14–50 inches.');
 return diameter;
}

// Learn the launch's overall reduction, without claiming Data Out reports the
// separate final drive. Reject clutch slip, tire slip, shifts and inconsistent RPM.
function learnReduction(session,diameterIn,drive,gear){
 if(!session||!valid(diameterIn,14,50))return null;
 validateSession(session);
 const indices={FWD:[0,1],RWD:[2,3],AWD:[0,1,2,3]}[drive];if(!indices)return null;
 for(const key of ['carPerformanceIndex','drivetrain','engineMaxRpm'])if(new Set(session.samples.map(s=>s[key]).filter(v=>v!=null)).size>1)return null;
 const a=[];
 for(let j=1;j<session.samples.length-1;j++){
  const s=session.samples[j],p=session.samples[j-1],next=session.samples[j+1];
  if(!s.isRaceOn||s.gear!==gear||p.gear!==gear||next.gear!==gear||s.timestampMs-p.timestampMs>150||next.timestampMs-s.timestampMs>150||s.speedKph<25||s.throttle<.9||s.brake>.02||Math.abs(s.steer)>.1||!s.tireSlipRatio||!indices.every(k=>valid(s.tireSlipRatio[k],-.05,.05)))continue;
  const ratio=s.rpm*Math.PI*diameterIn*.0254/(60*(s.speedKph/3.6));
  if(valid(ratio,1,40))a.push(ratio);
 }
 if(a.length<8)return null;
 const ratio=median(a),deviation=median(a.map(v=>Math.abs(v-ratio)))/ratio;
 if(deviation>.015||a.filter(v=>Math.abs(v-ratio)/ratio<=.03).length/a.length<.9)return null;
 return {overall:ratio,samples:a.length,relativeDeviation:deviation,source:gear===1?'captured first-gear reduction':`captured gear ${gear} reduction`};
}

export const learnLaunchReduction=(session,diameterIn,drive)=>learnReduction(session,diameterIn,drive,1);

export function powerModel(input,curve=[]){
 const data=curve.filter(p=>valid(p.rpm,1000,input.engineLimitRpm)&&valid(p.powerW,1,5000000)).sort((a,b)=>a.rpm-b.rpm);
 if(data.length>=4)return {mode:'measured power curve',minRpm:data[0].rpm,maxRpm:data.at(-1).rpm,peakW:Math.max(...data.map(p=>p.powerW)),at(rpm){
  if(rpm<data[0].rpm||rpm>data.at(-1).rpm)return null;
  for(let j=1;j<data.length;j++){const a=data[j-1],b=data[j];if(rpm>=a.rpm&&rpm<=b.rpm&&b.rpm-a.rpm<=500)return a.powerW+(b.powerW-a.powerW)*(rpm-a.rpm)/(b.rpm-a.rpm);}
  return null;
 }};
 if(!valid(input.powerKw,20,3000)||!valid(input.torqueNm,30,4000))return null;
 const watts=input.powerKw*1000;
 return {mode:'rated power/torque envelope',minRpm:1000,maxRpm:input.engineLimitRpm,peakW:watts,at(rpm){return rpm>=1000&&rpm<=input.engineLimitRpm?Math.min(watts,input.torqueNm*rpm*2*Math.PI/60):null;}};
}

// Compare ratio spacing over one common rolling window. Dynamic programming
// considers stay/shift decisions plus a stated interruption cost. Kinetic work
// uses engine power, without guessed traction, drag or drivetrain efficiency.
// These relative costs are deliberately not displayed as drag ET predictions.
export function rollingWorkCost(overall,model,options){
 const {diameterIn,mass,startMph,endMph,shiftSeconds=.15}=options;
 if(!model||!valid(mass,500,5000)||!valid(diameterIn,14,50)||!(endMph>startMph)||!overall.length||overall.some((r,j)=>!valid(r,.1,50)||j&&r>=overall[j-1])||!valid(shiftSeconds,0,1))return null;
 const circumference=Math.PI*diameterIn*.0254,lo=startMph*.44704,hi=endMph*.44704,steps=Math.ceil((endMph-startMph)/.5);
 let costs=overall.map(()=>Infinity),shifts=overall.map(()=>0);costs[0]=0;
 for(let j=0;j<steps;j++){
  const a=lo+(hi-lo)*j/steps,b=lo+(hi-lo)*(j+1)/steps,next=overall.map(()=>Infinity),counts=overall.map(()=>0);
  for(let g=0;g<overall.length;g++){
   const pa=model.at(a*overall[g]*60/circumference),pb=model.at(b*overall[g]*60/circumference);
   if(!(pa>0&&pb>0))continue;
   const stay=costs[g],change=g?costs[g-1]+shiftSeconds:Infinity;
   const previous=Math.min(stay,change);if(!Number.isFinite(previous))continue;
   next[g]=previous+mass*(b*b-a*a)/(pa+pb);counts[g]=change<stay?shifts[g-1]+1:shifts[g];
  }
  costs=next;shifts=counts;
 }
 const seconds=Math.min(...costs);if(!Number.isFinite(seconds))return null;
 const endGear=costs.indexOf(seconds)+1,work=.5*mass*(hi*hi-lo*lo);
 return {seconds,shifts:shifts[endGear-1],endGear,powerUtilization:work/(seconds*model.peakW)};
}

export function fitPowerSpacing(input,referenceOverall,curve=[],session=null,measuredRun=null){
 const model=powerModel(input,curve),launch=learnLaunchReduction(session,input.tireDiameterIn,input.drive);
 const top=referenceOverall.at(-1),first=launch?.overall??referenceOverall[0],count=referenceOverall.length;
 const assumptions=[];
 if(first<=top||first>30)return {overall:referenceOverall,fit:{mode:'RPM reference',message:'Captured launch reduction cannot fit this speed goal; the reference launch remains.'}};
 const basic=Array.from({length:count},(_,j)=>first*(top/first)**(j/(count-1)));
 if(!model||!valid(input.mass,500,5000))return {overall:basic,fit:{mode:'RPM reference',launch,shapesTested:0,message:'Add rated HP/torque and weight, or capture a power curve, to evaluate power delivery.'}};
 const startMph=Math.max(20,model.minRpm*Math.PI*input.tireDiameterIn*60/(first*63360)*1.02);
 // A selected strip supplies a constant-peak-power, zero-loss upper reference
 // for the rolling window only. Use actual finish speed when a clean same-strip
 // capture exists. No claimed launch/ET/top-speed prediction follows from this.
 const distanceCeiling=valid(input.distanceM,18.288,5000)?Math.cbrt(3*model.peakW*input.distanceM/input.mass)*2.236936292:input.topSpeedGoalMph;
 const measuredFinish=measuredRun?.completed&&measuredRun.brakingSeconds<=.05&&Math.abs(measuredRun.distanceM-input.distanceM)<.001?measuredRun.trapKph/1.609344:null;
 const endMph=Math.min(input.topSpeedGoalMph*.95,measuredFinish??distanceCeiling);
 const options={diameterIn:input.tireDiameterIn,mass:input.mass,startMph,endMph,shiftSeconds:.15};
 let best=null,baseline=rollingWorkCost(basic,model,options),tested=0;
 for(let j=0;j<=32;j++){
  const shape=.55+j*.035;
  const overall=Array.from({length:count},(_,g)=>first*(top/first)**((g/(count-1))**shape));
  const cost=rollingWorkCost(overall,model,options);tested++;if(cost&&(!best||cost.seconds<best.cost.seconds))best={overall,cost,shape};
 }
 // Include the working captured gear prefix as a candidate, not just new
 // spacing shapes. Only stable measured ratios are retained; tall unused gears
 // fill the remaining span to the user's goal without claiming they were read.
 const captured=[];
 for(let g=1;g<=count;g++){const learned=learnReduction(session,input.tireDiameterIn,input.drive,g);if(!learned||(captured.length&&learned.overall>=captured.at(-1)))break;captured.push(learned.overall);}
 if(captured.length>=2&&captured.at(-1)>top){
  const prefix=captured.slice(0,count-1),seed=prefix.at(-1),missing=count-prefix.length;
  const existing=[...prefix,...Array.from({length:missing},(_,n)=>seed*(top/seed)**((n+1)/missing))];
  const cost=rollingWorkCost(existing,model,options);tested++;
  if(cost&&(!best||cost.seconds<best.cost.seconds))best={overall:existing,cost,shape:null,capturedPrefix:prefix.length};
 }
 // Always include the neutral spacing, and never replace it with a worse fit.
 if(baseline&&(!best||baseline.seconds<=best.cost.seconds))best={overall:basic,cost:baseline,shape:1};
 if(!best||endMph-startMph<10)return {overall:basic,fit:{mode:'RPM reference',launch,shapesTested:tested,message:'Insufficient continuous power coverage for a common rolling comparison. No missing power data was extrapolated.'}};
 assumptions.push('Power-delivery ranking excludes launch grip, aerodynamic/rolling resistance and drivetrain loss. A 0.15 s interruption per shift is a reference, not a measured game constant.');
 if(model.mode==='rated power/torque envelope')assumptions.push('Offline envelope = min(rated peak power, peak torque × angular speed). This is an optimistic envelope, not a measured power curve; high-RPM power falloff is unknown.');
 assumptions.push(measuredFinish?'Rolling comparison ends near the measured finish speed of the selected strip.':'The strip-based rolling-window reference assumes constant peak power and zero losses; it is an upper reference, not predicted finish speed.');
 return {overall:best.overall,fit:{mode:model.mode,launch,shapesTested:tested,startMph,endMph,shape:best.shape,capturedGearsEvaluated:captured.length,capturedPrefixRetained:best.capturedPrefix??0,shiftSeconds:.15,referenceCost:baseline?.seconds??null,candidateCost:best.cost.seconds,shifts:best.cost.shifts,endGear:best.cost.endGear,powerUtilization:best.cost.powerUtilization,assumptions},model,options};
}
