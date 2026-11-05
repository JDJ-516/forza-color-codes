export const SESSION_SCHEMA='forza-garage-telemetry/v1';
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const median=values=>{const s=[...values].sort((a,b)=>a-b);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;};
export function validateSession(session){
 if(!session||session.schema!==SESSION_SCHEMA||!Array.isArray(session.samples)||session.samples.length<2||session.samples.length>18000)throw new Error('Expected forza-garage-telemetry/v1 JSON with 2–18,000 samples. Export a session from the live receiver first.');
 const samples=session.samples;
 for(let i=0;i<samples.length;i++){
  const s=samples[i];
  if(!s||!finite(s.timestampMs,0,Number.MAX_SAFE_INTEGER)||i&&s.timestampMs<=samples[i-1].timestampMs)throw new Error(`Sample ${i+1}: timestamps must be finite and strictly increasing.`);
  for(const [key,min,max] of [['speedKph',0,900],['rpm',0,25000],['gear',0,11],['throttle',0,1],['brake',0,1],['steer',-1,1]])if(!finite(s[key],min,max))throw new Error(`Sample ${i+1}: invalid ${key}.`);
  if(!Number.isInteger(s.gear))throw new Error(`Sample ${i+1}: gear must be an integer.`);
  for(const [key,min,max] of [['engineMaxRpm',100,25000],['powerW',-2000000,5000000],['lapNumber',0,65535],['lastLapS',0,10800],['currentLapS',0,10800],['carOrdinal',0,1000000]])if(s[key]!=null&&!finite(s[key],min,max))throw new Error(`Sample ${i+1}: invalid ${key}.`);
  for(const [key,min,max] of [['suspensionTravel',-.25,1.25],['tireSlipRatio',-100,100],['tireTempC',-100,350]])if(s[key]!==undefined&&(!Array.isArray(s[key])||s[key].length!==4||s[key].some(v=>!finite(v,min,max))))throw new Error(`Sample ${i+1}: ${key} needs four valid wheel values (FL, FR, RL, RR).`);
  if(s.onRumbleStrip!==undefined&&(!Array.isArray(s.onRumbleStrip)||s.onRumbleStrip.length!==4||s.onRumbleStrip.some(v=>typeof v!=='boolean')))throw new Error(`Sample ${i+1}: invalid rumble-strip flags.`);
  if(s.isRaceOn!==undefined&&typeof s.isRaceOn!=='boolean')throw new Error(`Sample ${i+1}: invalid active-driving flag.`);
 }
 const cars=new Set(samples.map(s=>s.carOrdinal).filter(v=>v!=null));
 if(cars.size>1)throw new Error('Mixed-car session: split the capture by car before tuning.');
 return session;
}
export function analyzeSession(session){
 validateSession(session);const s=session.samples,elapsed=(s.at(-1).timestampMs-s[0].timestampMs)/1000;
 const duration={usable:0,moving:0,slip:0,slipMeasured:0,frontCompression:0,rearCompression:0,travelMeasured:0,overlap:0};
 let gaps=0,lapStart=null,previousLap=null;const laps=[],powerBins=new Map(),temps=[[],[],[],[]];
 for(let i=0;i<s.length;i++){
  const sample=s[i],dt=i<s.length-1?(s[i+1].timestampMs-sample.timestampMs)/1000:0;
  if(dt>1){gaps++;lapStart=null;previousLap=null;}
  const active=sample.isRaceOn!==false;
  if(active&&Number.isInteger(sample.lapNumber)){
   if(previousLap!==null&&sample.lapNumber===previousLap+1){
    const seconds=sample.lastLapS,observed=lapStart===null?null:(sample.timestampMs-lapStart)/1000;
    if(observed!==null&&finite(seconds,5,10800)&&Math.abs(seconds-observed)<=Math.max(1,seconds*.02))laps.push({lap:previousLap,seconds});
    lapStart=sample.timestampMs;
   }else if(previousLap!==null&&sample.lapNumber!==previousLap)lapStart=null;
   previousLap=sample.lapNumber;
  }else{lapStart=null;previousLap=null;}
  if(dt<=0||dt>1||!active)continue;
  duration.usable+=dt;
  if(sample.speedKph<40||sample.gear<1||sample.gear>10)continue;
  duration.moving+=dt;
  const straight=Math.abs(sample.steer)<.15;
  if(sample.throttle>.6&&sample.brake>.3&&straight)duration.overlap+=dt;
  if(sample.tireSlipRatio&&sample.throttle>.6&&sample.brake<.05&&straight){
   duration.slipMeasured+=dt;
   if(sample.tireSlipRatio.some(v=>Math.abs(v)>.2))duration.slip+=dt;
  }
  if(sample.suspensionTravel&&sample.onRumbleStrip&&!sample.onRumbleStrip.some(Boolean)){
   duration.travelMeasured+=dt;
   if(Math.max(...sample.suspensionTravel.slice(0,2))>=.98)duration.frontCompression+=dt;
   if(Math.max(...sample.suspensionTravel.slice(2))>=.98)duration.rearCompression+=dt;
  }
  if(sample.tireTempC)sample.tireTempC.forEach((v,j)=>temps[j].push(v));
  if(sample.powerW>0&&sample.throttle>=.95&&sample.brake<=.02&&straight&&sample.gear>=2&&sample.tireSlipRatio&&sample.tireSlipRatio.every(v=>Math.abs(v)<.15)){
   const bin=Math.round(sample.rpm/250)*250;
   if(!powerBins.has(bin))powerBins.set(bin,[]);powerBins.get(bin).push(sample.powerW);
  }
 }
 const curve=[...powerBins].filter(([,v])=>v.length>=5).map(([rpm,v])=>({rpm,powerW:median(v),samples:v.length})).sort((a,b)=>a.rpm-b.rpm);
 const findings=[];
 if(duration.moving<30)findings.push({kind:'quality',title:'More road-driving data needed',evidence:`${duration.moving.toFixed(1)} seconds above 40 km/h.`,action:'Record at least 30 seconds of representative driving before drawing tuning conclusions.'});
 if(gaps||duration.usable/elapsed<.9)findings.push({kind:'quality',title:'Capture gaps or inactive periods',evidence:`${gaps} gaps over 1 second; ${Math.round(duration.usable/elapsed*100)}% active time coverage.`,action:'Repeat a continuous capture. Gaps invalidate lap boundary comparisons.'});
 if(duration.moving>=30){
  if(duration.slipMeasured>=10&&duration.slip/duration.slipMeasured>.05)findings.push({kind:'grip',title:'Slip during straight-line throttle',evidence:`${(100*duration.slip/duration.slipMeasured).toFixed(1)}% of ${duration.slipMeasured.toFixed(1)} measured throttle seconds exceeded |slip ratio| 0.20 on a wheel.`,action:'Check throttle control, driven-wheel traction, tire choice, and differential behavior. This observation alone does not determine a differential setting.'});
  for(const axle of ['front','rear'])if(duration.travelMeasured>=10&&duration[axle+'Compression']/duration.travelMeasured>.02)findings.push({kind:'suspension',title:`Frequent near-full ${axle} suspension compression`,evidence:`${(100*duration[axle+'Compression']/duration.travelMeasured).toFixed(1)}% of ${duration.travelMeasured.toFixed(1)} off-curb driving seconds reached travel ≥0.98.`,action:'Inspect bumps, ride height, available travel, and spring support. Test one small change at a time; near-full travel does not prove bump-stop contact.'});
  if(duration.overlap/duration.moving>.05)findings.push({kind:'driver',title:'Throttle/brake overlap on straights',evidence:`${duration.overlap.toFixed(1)} seconds with throttle >60% and brake >30%.`,action:'Check pedal calibration and assists before attributing the behavior to the mechanical tune.'});
 }
 const missing=[];
 if(!duration.slipMeasured)missing.push('Eligible straight-line slip samples');if(!duration.travelMeasured)missing.push('Suspension travel with curb flags');if(curve.length<4)missing.push('At least four populated 250-RPM wide-open-throttle power bins');if(!laps.length)missing.push('A full lap between two captured lap boundaries');
 const times=laps.map(l=>l.seconds);
 return {schema:SESSION_SCHEMA,samples:s.length,carOrdinal:s.find(x=>x.carOrdinal!=null)?.carOrdinal??null,captureSeconds:elapsed,drivingSeconds:duration.moving,activeCoverage:duration.usable/elapsed,gaps,
  laps,bestLapS:times.length?Math.min(...times):null,medianLapS:times.length?median(times):null,lapSpreadS:times.length>1?Math.max(...times)-Math.min(...times):null,
  topSpeedKph:Math.max(...s.filter(x=>x.isRaceOn!==false).map(x=>x.speedKph),0),tireTempMedianC:temps.map(v=>v.length?median(v):null),powerCurve:curve,findings,missing,
  limits:'Diagnostic thresholds are heuristics, not optimal tire-slip targets. Aggregate tire temperatures cannot establish camber or ideal tire pressure. No automatic game-slider changes or causal lap-time claims.'};
}
export function estimateShiftPoints(curve,gears,limitRpm){
 if(!Array.isArray(curve)||curve.length<4||!Number.isFinite(limitRpm)||!Array.isArray(gears)||gears.length<2)return [];
 const sorted=[...curve].sort((a,b)=>a.rpm-b.rpm);
 const power=rpm=>{
  for(let i=1;i<sorted.length;i++)if(rpm>=sorted[i-1].rpm&&rpm<=sorted[i].rpm&&sorted[i].rpm-sorted[i-1].rpm<=500){const a=sorted[i-1],b=sorted[i];return a.powerW+(b.powerW-a.powerW)*(rpm-a.rpm)/(b.rpm-a.rpm);}
  return null;
 };
 return gears.slice(0,-1).map((ratio,i)=>{
  const next=gears[i+1],drop=next/ratio;
  if(!finite(ratio,.1,10)||!finite(next,.1,10)||drop>=1)return {gear:i+1,rpm:null,reason:'Invalid gear progression.'};
  let crossover=null;
  for(let rpm=Math.ceil(sorted[0].rpm/drop/50)*50;rpm<=Math.min(limitRpm,sorted.at(-1).rpm);rpm+=50){const current=power(rpm),after=power(rpm*drop);if(current!==null&&after!==null&&after>=current){crossover=rpm;break;}}
  return {gear:i+1,rpm:crossover,reason:crossover?'Measured engine-power crossover estimate; assumes comparable drivetrain losses and ignores shift time.':'No supported power crossover in the measured RPM range. No extrapolated shift recommendation.'};
 });
}
export function compareSessions(baseline,candidate){
 if(baseline.carOrdinal===null||candidate.carOrdinal===null||baseline.carOrdinal!==candidate.carOrdinal)throw new Error('Run comparison needs the same known car ordinal.');
 if(baseline.laps.length<2||candidate.laps.length<2)throw new Error('Capture at least two complete laps in each run before comparing lap consistency.');
 return {medianDeltaS:candidate.medianLapS-baseline.medianLapS,bestDeltaS:candidate.bestLapS-baseline.bestLapS,baselineSpreadS:baseline.lapSpreadS,candidateSpreadS:candidate.lapSpreadS,warning:'Observed differences only. Confirm the same track, build, assists, weather, tires, and driving conditions before attributing a change to the tune.'};
}
