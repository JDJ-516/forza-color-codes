import {validateSession,analyzeSession} from './telemetry-analysis.js';
export const DRAG_DISTANCES=[{name:'⅛ mile',meters:201.168},{name:'¼ mile',meters:402.336},{name:'½ mile',meters:804.672},{name:'1 mile',meters:1609.344}];
export const FH6_STRIPS=[
 {id:'irakawa-space-centre',name:'Irakawa Space Centre Drag Strip',meters:321.869,miles:.2,region:'Nangan',location:'Bottom-left corner of the map',unlock:'Pink Wristband',source:'User-provided and explicitly confirmed; not independently map-verified.',distanceNote:'Exactly 0.2 mile, rounded to 0.001 m. The earlier quarter-mile description was superseded by your confirmation.'},
 {id:'ito-airfield',name:'Ito Airfield Drag Strip',meters:804.672,miles:.5,region:'Minamino',location:'Ito airfield runway, above Legend Island',unlock:'Orange Wristband',source:'User-provided; not independently map-verified.',distanceNote:'0.5 mile / half-mile.'},
 {id:'horizon-festival',name:'Horizon Festival Kilometer',meters:965.606,miles:.6,region:null,location:null,unlock:null,source:'User-provided and explicitly confirmed; not independently map-verified.',distanceNote:'Exactly 0.6 mile, rounded to 0.001 m. Despite the supplied venue name, this profile uses 965.606 m, not 1,000 m.'}
];
const bound=(v,name,min,max)=>{if(!Number.isFinite(v)||v<min||v>max)throw new Error(`${name} must be between ${min} and ${max}.`);};
export function simulateDrag(input,powerCurve=[]){
 const {mass,powerKw,torqueNm,lossPercent,mu,cda,rolling,frontPercent,wheelbase,cgHeight,gradePercent,width,aspect,rim,finalDrive,gears,shiftRpm,shiftSeconds,distanceM,launchControl,launchRpm,manualRpm,throttleRamp}=input;
 for(const [key,name,min,max] of [['mass','Mass (kg)',500,5000],['powerKw','Engine power (kW)',20,3000],['torqueNm','Peak torque (Nm)',30,4000],['lossPercent','Drivetrain loss (%)',0,40],['mu','Assumed tire friction',.2,2.5],['cda','CdA (m²)',.2,2],['rolling','Rolling resistance',.005,.05],['frontPercent','Front weight (%)',20,80],['wheelbase','Wheelbase (m)',2,4],['cgHeight','CG height (m)',.1,1],['gradePercent','Strip grade (%)',-10,10],['width','Tire width (mm)',100,500],['aspect','Tire aspect (%)',10,100],['rim','Rim (in)',10,30],['finalDrive','Final drive',.5,10],['shiftRpm','Shift RPM',1000,20000],['shiftSeconds','Shift delay (s)',0,1],['distanceM','Strip length (m)',18.288,5000],['launchRpm','Launch-control RPM',1000,20000],['manualRpm','Manual launch RPM',800,20000],['throttleRamp','Throttle ramp (s)',0,3],['torquePeakRpm','Torque peak RPM',1000,20000],['lowTorquePercent','Low-RPM torque (%)',20,100]])bound(input[key],name,min,max);
 if(!['FWD','RWD','AWD'].includes(input.drive))throw new Error('Select FWD, RWD or AWD.');
 if(!['enabled','disabled'].includes(launchControl))throw new Error('Select launch control enabled or disabled.');
 if(!Array.isArray(gears)||gears.length<4||gears.length>10||gears.some((g,i)=>!Number.isFinite(g)||g<.1||g>10||i&&g>=gears[i-1]))throw new Error('Use 4–10 descending positive gear ratios.');
 const startRpm=launchControl==='enabled'?launchRpm:manualRpm;if(startRpm>shiftRpm)throw new Error('The active launch RPM must not exceed shift RPM.');
 const circumference=Math.PI*(rim*.0254+2*width*aspect/100/1000),efficiency=1-lossPercent/100,g=9.80665;
 const slope=gradePercent/100,cos=1/Math.sqrt(1+slope*slope),sin=slope*cos;
 const lookup=rpm=>{for(let i=1;i<powerCurve.length;i++){const a=powerCurve[i-1],b=powerCurve[i];if(rpm>=a.rpm&&rpm<=b.rpm&&b.rpm-a.rpm<=500)return a.powerW+(b.powerW-a.powerW)*(rpm-a.rpm)/(b.rpm-a.rpm);}return null;};
 let t=0,x=0,v=0,acceleration=0,gear=0,shiftEnd=0,measuredSteps=0,poweredSteps=0,startTime=null;const dt=.01,splits=[],trace=[];
 const markers=[{name:'60 ft',meters:18.288},...DRAG_DISTANCES].filter(m=>m.meters<=distanceM+.001);
 if(!markers.some(m=>Math.abs(m.meters-distanceM)<.001))markers.push({name:'Custom finish',meters:distanceM});markers.sort((a,b)=>a.meters-b.meters);
 let marker=0,zeroTo60Mph=null,limited=false;
 while(x<distanceM&&t<120){
  const rpm=Math.max(gear===0?startRpm:800,v/circumference*gears[gear]*finalDrive*60);
  if(rpm>=shiftRpm&&gear<gears.length-1&&t>=shiftEnd){gear++;shiftEnd=t+shiftSeconds;}
  const actualRpm=Math.max(gear===0?startRpm:800,v/circumference*gears[gear]*finalDrive*60),omega=actualRpm*2*Math.PI/60;
  const observed=lookup(actualRpm),torque=observed===null?Math.min(torqueNm*(input.lowTorquePercent/100+(1-input.lowTorquePercent/100)*Math.max(0,Math.min(1,(actualRpm-800)/(input.torquePeakRpm-800)))),powerKw*1000/omega):observed/omega;
  const ramp=throttleRamp===0?1:Math.min(1,t/throttleRamp);
  let force=t<shiftEnd?0:torque*gears[gear]*finalDrive*efficiency/(circumference/(2*Math.PI))*ramp;
  if(t>=shiftEnd){poweredSteps++;if(observed!==null)measuredSteps++;}
  const weight=mass*g*cos,frontLoad=Math.max(0,Math.min(weight,weight*frontPercent/100-mass*acceleration*cgHeight/wheelbase));
  const drivenLoad=input.drive==='AWD'?weight:input.drive==='FWD'?frontLoad:weight-frontLoad;
  force=Math.min(force,mu*drivenLoad);
  if(actualRpm>shiftRpm&&gear===gears.length-1){force=0;limited=true;}
  const resistance=.5*1.225*cda*v*v+rolling*weight+mass*g*sin;
  const oldV=v,oldX=x,oldT=t;acceleration=(force-resistance)/mass;v=Math.max(0,v+acceleration*dt);x+=(oldV+v)*.5*dt;t+=dt;
  if(startTime===null){if(v>=1/3.6){const fraction=(1/3.6-oldV)/(v-oldV);startTime=oldT+dt*fraction;x=(1/3.6+v)*.5*dt*(1-fraction);}else{x=0;}}
  if(zeroTo60Mph===null&&v>=26.8224)zeroTo60Mph=oldT+dt*(26.8224-oldV)/(v-oldV)-(startTime??0);
  while(marker<markers.length&&x>=markers[marker].meters){const fraction=(markers[marker].meters-oldX)/(x-oldX);splits.push({...markers[marker],seconds:oldT+dt*fraction-(startTime??0),trapKph:(oldV+(v-oldV)*fraction)*3.6});marker++;}
  if(startTime!==null&&Math.round(t*100)%10===0)trace.push({seconds:t-(startTime??0),distanceM:x,speedKph:v*3.6,gear:gear+1});
 }
 const finish=splits.find(m=>Math.abs(m.meters-distanceM)<.001);
 return {completed:!!finish,seconds:finish?.seconds??null,trapKph:finish?.trapKph??null,zeroTo60Mph,splits,trace,redlineLimited:limited,measuredPowerFraction:poweredSteps?measuredSteps/poweredSteps:0,
  assumptions:'Approximate 1D model: user-defined rising-torque/constant-power approximation unless measured bins cover an RPM, fixed drivetrain loss, ideal traction cap, approximate weight transfer, no wheelspin losses, no aero lift/downforce or game-specific launch-control algorithm. LC holds the chosen launch RPM; disabled uses manual launch RPM. ET and distance start at the 1 km/h crossing. Reaction time is excluded; no 1-foot rollout allowance. Finish speed is instantaneous, not a trap-zone average.'};
}
export function analyzeDragSession(session,distanceM){
 validateSession(session);bound(distanceM,'Strip length (m)',18.288,5000);
 const samples=session.samples;let stationaryStart=null,startIndex=-1,startTime=null;
 for(let i=0;i<samples.length;i++){
  const s=samples[i];
  if(i&&s.timestampMs-samples[i-1].timestampMs>250)stationaryStart=null;
  if(s.isRaceOn===false){stationaryStart=null;continue;}
  if(s.speedKph<=1){if(stationaryStart===null)stationaryStart=s.timestampMs;}
  else if(i&&stationaryStart!==null&&samples[i-1].speedKph<=1&&s.timestampMs-stationaryStart>=500&&s.gear===1){const prev=samples[i-1];startTime=prev.timestampMs+(s.timestampMs-prev.timestampMs)*(1-prev.speedKph)/(s.speedKph-prev.speedKph);startIndex=i;break;}
  else stationaryStart=null;
 }
 if(startIndex<0)throw new Error('Capture at least 0.5 seconds stationary, then launch forward in first gear. Rolling starts cannot establish a standing-start ET.');
 const markers=[{name:'60 ft',meters:18.288},...DRAG_DISTANCES].filter(m=>m.meters<=distanceM+.001);
 if(!markers.some(m=>Math.abs(m.meters-distanceM)<.001))markers.push({name:'Custom finish',meters:distanceM});markers.sort((a,b)=>a.meters-b.meters);
 let distance=0,previousTime=startTime,previousSpeed=1,marker=0,slipSeconds=0,slipCovered=0,brakingSeconds=0,finish=null,zeroTo60Mph=null;const splits=[],shifts=[];
 for(let i=startIndex;i<samples.length;i++){
  const s=samples[i],dt=(s.timestampMs-previousTime)/1000;
  if(dt>.25)throw new Error('A gap over 250 ms interrupts the drag run. Repeat with a continuous capture.');
  if(s.isRaceOn===false||s.gear===0)throw new Error('Run was interrupted by inactive/reverse data before the selected finish.');
  const before=distance;distance+=(previousSpeed+s.speedKph)/3.6*.5*dt;
  if(zeroTo60Mph===null&&previousSpeed<96.56064&&s.speedKph>=96.56064)zeroTo60Mph=(previousTime-startTime)/1000+dt*(96.56064-previousSpeed)/(s.speedKph-previousSpeed);
  if(s.brake>.1&&s.speedKph>40)brakingSeconds+=dt;
  if(before<=18.288&&s.tireSlipRatio){slipCovered+=dt;if(s.tireSlipRatio.some(v=>Math.abs(v)>.2))slipSeconds+=dt;}
  if(i>startIndex&&s.gear<=10&&samples[i-1].gear>=1&&s.gear>samples[i-1].gear)shifts.push({from:samples[i-1].gear,to:s.gear,rpm:samples[i-1].rpm});
  while(marker<markers.length&&distance>=markers[marker].meters){const fraction=(markers[marker].meters-before)/(distance-before);const result={...markers[marker],seconds:(previousTime-startTime)/1000+dt*fraction,trapKph:previousSpeed+(s.speedKph-previousSpeed)*fraction};splits.push(result);if(Math.abs(result.meters-distanceM)<.001)finish=result;marker++;}
  if(finish)break;previousTime=s.timestampMs;previousSpeed=s.speedKph;
 }
 const base=analyzeSession(session);
 return {completed:!!finish,seconds:finish?.seconds??null,trapKph:finish?.trapKph??null,distanceM,coveredDistanceM:distance,zeroTo60Mph,splits,shifts,launchRpm:samples[Math.max(0,startIndex-1)].rpm,launchSlipPercent:slipCovered?100*slipSeconds/slipCovered:null,brakingSeconds,carOrdinal:base.carOrdinal,powerCurve:base.powerCurve,launchControl:session.context?.launchControl||'unknown',
  notes:'Measured distance integrates reported speed; ET starts at the interpolated 1 km/h crossing after a stationary section. No 1-foot rollout or reaction-time correction. Finish speed is instantaneous, not a trap-zone average. Slip threshold 0.20 is diagnostic, not an optimal traction target. Launch-control state is user supplied, never inferred from packet data.'};
}
