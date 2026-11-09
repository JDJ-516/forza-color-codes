import {fitPowerSpacing,rollingWorkCost} from './drag-power-fit.js';
import {LB_PER_KG} from './units.js';
import {estimateShiftPoints,validateSession} from './telemetry-analysis.js';

// Endpoints visible in the owner's FH6 Trackhawk screenshots. These describe
// that installed build; they are not a database of every car's adjustment limits.
export const SCREEN_REFERENCE={tires:[15,55],damping:[1,20],arb:[1,65],camber:[-5,5],toe:[-5,5],differential:[0,100],brakeBalance:[0,100],brakePressure:[0,200]};
export const TRACKHAWK_OBSERVATIONS={frontSpringMax:2148.4,rearSpringMin:429.7,frontRideHeightMax:8.5,rearRideHeightMin:8.1,finalDriveMax:6.10,gearMin:.48};
export const COMPOUNDS=['Stock','Street','Sport','Semi-Slick','Slick','Drag','Drift','Rally','Offroad','Snow','Vintage'];
const round=(n,d=1)=>Number(n.toFixed(d)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
export const isTrackhawk=car=>/\b2018\b.*\bJeep\b.*\bTrackhawk\b/i.test(car||'');
const median=a=>{const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;};

// Effective rolling diameter from the Data Out angular-speed channel (rad/s).
// Coast, straight, very low slip only. This is a measurement, not tire size ID.
export function rollingDiameterIn(s){
 if(!s?.isRaceOn||!finite(s.speedKph,40,450)||!Number.isInteger(s.gear)||s.gear<1||s.gear>10||!finite(s.throttle,0,.2)||!finite(s.brake,0,.01)||!finite(s.steer,-.05,.05)||!Array.isArray(s.tireSlipRatio)||s.tireSlipRatio.length!==4||!s.tireSlipRatio.every(x=>finite(x,-.03,.03))||!Array.isArray(s.wheelRotationSpeed)||s.wheelRotationSpeed.length!==4)return null;
 const indices=s.drivetrain===0?[0,1]:s.drivetrain===1?[2,3]:s.drivetrain===2?[0,1,2,3]:[];
 const values=indices.map(i=>2*(s.speedKph/3.6)/Math.abs(s.wheelRotationSpeed[i])/.0254);
 if(!values.length||!values.every(x=>finite(x,14,50)))return null;
 const value=median(values);return values.every(x=>Math.abs(x-value)/value<.03)?value:null;
}
export function sessionGearingEvidence(session){
 const samples=session?.samples||[],limits=samples.map(s=>s.engineMaxRpm).filter(v=>finite(v,1000,25000)),diameters=samples.map(rollingDiameterIn).filter(v=>v!==null);
 return {engineLimitRpm:limits.length?median(limits):null,tireDiameterIn:diameters.length>=5?round(median(diameters),2):null,diameterSamples:diameters.length};
}

export function dragSetupFeedback(session,input){
 if(!session)return ['Capture a real run to evaluate wheelspin, suspension travel and shift behavior.'];
 validateSession(session);
 const wheels={FWD:[0,1],RWD:[2,3],AWD:[0,1,2,3]}[input.drive];
 if(!wheels)return ['Select a drivetrain to evaluate driven-wheel slip.'];
 let measured=0,spinning=0,travel=0,compressed=0;
 const s=session.samples;
 for(let j=0;j<s.length-1;j++){
  const p=s[j],dt=(s[j+1].timestampMs-p.timestampMs)/1000;
  if(dt<=0||dt>.25||!p.isRaceOn||p.throttle<.8||p.brake>.02||Math.abs(p.steer)>.1||p.speedKph<3||p.speedKph>96.56064)continue;
  if(p.tireSlipRatio?.length===4&&wheels.every(k=>Number.isFinite(p.tireSlipRatio[k]))){measured+=dt;if(wheels.some(k=>Math.abs(p.tireSlipRatio[k])>.2))spinning+=dt;}
  if(p.suspensionTravel?.length===4&&p.suspensionTravel.every(Number.isFinite)&&p.onRumbleStrip?.length===4&&!p.onRumbleStrip.some(Boolean)){travel+=dt;if(p.suspensionTravel.some(v=>v>=.98))compressed+=dt;}
 }
 const out=[];
 if(measured>=1){const pct=100*spinning/measured;out.push(`Driven-wheel slip exceeded 0.20 for ${pct.toFixed(1)}% of ${measured.toFixed(1)} measured launch seconds below 60 mph. `+(pct>5?'Test a taller first gear or gentler launch, then compare three 60-ft times.':'No persistent driven-wheel launch spin at this threshold; compare repeatability before changing pressure.'));}else out.push('Not enough eligible launch-slip coverage to recommend a traction change.');
 if(travel>=1)out.push(`Near-full compression appeared for ${(100*compressed/travel).toFixed(1)}% of ${travel.toFixed(1)} off-curb launch seconds. `+(compressed/travel>.02?'Test more ride-height clearance before increasing spring stiffness.':'No repeated full compression in the eligible launch window.'));
 else out.push('Suspension travel cannot be assessed without enough off-curb launch data.');
 out.push('Data Out does not identify tire pressure, compound, spring rates, damper settings, or launch-control state. Feedback does not assume the generated settings were already installed.');
 return out;
}

export function generateFH6Chassis(i){
 if(!finite(i.mass,500,5000)||!finite(i.frontPercent,20,80))throw new Error('Enter weight and front weight distribution in Powertrain details.');
 if(!['FWD','RWD','AWD'].includes(i.drive))throw new Error('Select the drivetrain.');
 if(!COMPOUNDS.includes(i.tireCompound))throw new Error('Select the installed tire package.');
 if(!['enabled','disabled'].includes(i.launchControl))throw new Error('Set launch control to On or Off.');
 const drive=i.drive,drag=i.tireCompound==='Drag',front=i.frontPercent/100,weight=i.mass*LB_PER_KG;
 // Purpose-specific wheel-rate approximation, not a game suspension solver.
 const hz={RWD:[1.65,1.85],FWD:[2.0,1.65],AWD:[1.9,2.0]}[drive];
 const spring=(fraction,f)=>round((2*Math.PI*f)**2*(weight*fraction/2)/386.0886);
 let frontSpring=spring(front,hz[0]),rearSpring=spring(1-front,hz[1]);
 const pictured=isTrackhawk(i.car),limited=[];
 if(pictured){
  if(frontSpring>TRACKHAWK_OBSERVATIONS.frontSpringMax){frontSpring=TRACKHAWK_OBSERVATIONS.frontSpringMax;limited.push('Front spring capped at the pictured Trackhawk maximum.');}
  if(rearSpring<TRACKHAWK_OBSERVATIONS.rearSpringMin){rearSpring=TRACKHAWK_OBSERVATIONS.rearSpringMin;limited.push('Rear spring raised to the pictured Trackhawk minimum.');}
 }
 const basePressure={Stock:27,Street:27,Sport:26,'Semi-Slick':25,Slick:24,Drift:27,Rally:25,Offroad:24,Snow:24,Vintage:26}[i.tireCompound]??18;
 const psi=drag?{RWD:[40,17],FWD:[17,40],AWD:[18,18]}[drive]:{RWD:[32,basePressure],FWD:[basePressure,32],AWD:[basePressure,basePressure]}[drive];
 const damp={RWD:[5,9,7,4],FWD:[9,5,4,7],AWD:[6,8,6,4.5]}[drive];
 const bias=clamp((i.frontPercent-50)*.08,-2,2);
 const damping={frontRebound:round(clamp(damp[0]+bias,1,20)),rearRebound:round(clamp(damp[1]-bias,1,20)),frontBump:round(clamp(damp[2]+bias*.5,1,20)),rearBump:round(clamp(damp[3]-bias*.5,1,20))};
 return {
  tires:{front:psi[0],rear:psi[1],compound:i.tireCompound},
  alignment:{frontCamber:0,rearCamber:0,frontToe:0,rearToe:0,caster:5},
  arb:{front:drive==='FWD'?12:1,rear:drive==='RWD'?12:1},
  springs:{front:frontSpring,rear:rearSpring,frontHz:hz[0],rearHz:hz[1],limited,rangeKnown:false},
  rideHeight:{front:drive==='FWD'?'Start low; retain compression travel':'Start at mid travel',rear:drive==='RWD'?'Start low; retain compression travel':'Start at mid travel'},
  dampers:{...damping,min:1,max:20,inRange:true},
  aero:{front:'Minimum available downforce',rear:'Minimum available downforce'},
  brakes:{balance:50,pressure:100},
  differential:{front:drive==='RWD'?null:{accel:100,decel:0},rear:drive==='FWD'?null:{accel:100,decel:0},center:drive==='AWD'?Math.round(clamp(60+(i.frontPercent-50)*.5,50,75)):null},
  launch:{mode:i.launchControl,message:i.launchControl==='enabled'?'Use the game’s launch control. Compare launch RPM and 60-ft times from repeated captures.':'Stage manually. Increase throttle progressively if the driven wheels spin; compare 60-ft times.'},
  assumptions:[
   'Drag starting heuristics, not a leaderboard prediction. Straight-line alignment is neutral; differential acceleration lock is 100% on driven axles and coast lock is 0%.',
   `Spring wheel-rate approximation: (2πf)² × axle weight / (2 × 386.0886), front ${hz[0]} Hz / rear ${hz[1]} Hz. Gross corner weight, unit motion ratio; unsprung weight and leverage are unknown.`,
   'Damping, antiroll, pressure and AWD balance are drivetrain-specific starting heuristics. Their numbers are not inferred from the extreme slider positions in the screenshots.',
   'Screen references: tires 15–55 PSI; damping 1–20; antiroll 1–65; camber/toe ±5°; differential 0–100%; brake balance 0–100%, pressure 0–200%. Confirm adjustability on the installed car.',
   pictured?'Pictured 2018 Trackhawk only: front spring maximum 2,148.4 lb/in; rear spring minimum 429.7 lb/in; front ride-height maximum 8.5 in; rear minimum 8.1 in. Opposite endpoints are unknown. These screenshots do not identify installed parts.':'Spring, ride-height, aero and gearing adjustment limits vary by car and upgrades. The Trackhawk spring/height endpoints are not applied to this car.',
   ...limited,
   'Ride height and aero have no universal numeric conversion. Follow the relative targets only where adjustable; watch suspension travel and high-speed stability.',
  ],
 };
}

export function generateFH6Gearing(i,curve=[],session=null,measuredRun=null){
 if(!finite(i.topSpeedGoalMph,1,600))throw new Error('Enter a top-speed goal in Powertrain details.');
 if(!Number.isInteger(i.setupGearCount)||i.setupGearCount<2||i.setupGearCount>10)throw new Error('Choose the number of gears in your installed gearbox.');
 if(!finite(i.engineLimitRpm,1000,25000))throw new Error('Engine RPM limit is needed. Enter it in Powertrain details or connect telemetry.');
 if(!finite(i.tireDiameterIn,14,50))throw new Error('Enter your driven tire size in Powertrain details; the app calculates the diameter. Telemetry can also measure it.');
 const limit=i.engineLimitRpm,usable=curve.filter(p=>finite(p.rpm,1000,limit)&&finite(p.powerW,1,5000000)).sort((a,b)=>a.rpm-b.rpm);
 const peak=usable.length>=4?usable.reduce((a,b)=>a.powerW>=b.powerW?a:b):null;
 const k=peak?usable.indexOf(peak):-1;
 const interior=peak&&k>0&&k<usable.length-1&&usable[k-1].rpm>=peak.rpm-500&&usable[k+1].rpm<=peak.rpm+500;
 const targetRpm=interior?peak.rpm:Math.round(limit*.98),source=interior?'measured power-curve peak':'98% of engine limit · reference, power peak unknown';
 // Launch span must not shrink to the narrow high-power band: doing so made
 // first gear excessively tall on broad/late-peaking measured curves.
 const drop=.72;
 const overall=targetRpm*Math.PI*i.tireDiameterIn*60/(i.topSpeedGoalMph*63360);
 const count=i.setupGearCount,pictured=isTrackhawk(i.car),minGear=pictured ? .48 : .5;
 // Search an explicitly conservative design window, not alleged universal FH6
 // slider limits. Round to the hundredths displayed by the in-game Gearing tab.
 let best=null;
 for(let fd=2;fd<= (pictured?6.10:5.00)+.001;fd+=.01){
  const finalDrive=round(fd,2),top=overall/finalDrive;
  const first=Math.min(5,top/drop**(count-1));
  if(top<minGear||first<=top)continue;
  const gears=Array.from({length:count},(_,n)=>round(first*(top/first)**(n/(count-1)),2));
  if(gears.some((g,n)=>g<minGear||g>5||n&&g>=gears[n-1]))continue;
  const theoreticalMph=targetRpm*Math.PI*i.tireDiameterIn*60/(gears.at(-1)*finalDrive*63360);
  const error=Math.abs(theoreticalMph-i.topSpeedGoalMph)/i.topSpeedGoalMph;
  const score=error*500+Math.abs(finalDrive-3.5)*.03+Math.abs(gears[0]-3.2)*.02;
  if(!best||score<best.score)best={score,finalDrive,gears,theoreticalMph};
 }
 if(!best||Math.abs(best.theoreticalMph/i.topSpeedGoalMph-1)>.02)throw new Error('This goal cannot be represented within the conservative ratio design window. Review speed, engine limit, tire diameter and gear count.');
 const referenceOverall=best.gears.map(g=>g*best.finalDrive),fitted=fitPowerSpacing(i,referenceOverall,usable,session,measuredRun);
 const quantize=overall=>{
  let result=null;
  for(let hundredths=200;hundredths<=(pictured?610:500);hundredths++){
   const fd=hundredths/100,gears=overall.map(r=>round(r/fd,2));
   if(gears.some((g,n)=>g<minGear||g>5||n&&g>=gears[n-1]))continue;
   const mph=targetRpm*Math.PI*i.tireDiameterIn*60/(gears.at(-1)*fd*63360);
   const firstError=Math.abs(gears[0]*fd/overall[0]-1);
   if(Math.abs(mph/i.topSpeedGoalMph-1)>.02||firstError>.01)continue;
   const error=gears.reduce((sum,g,n)=>sum+Math.log(g*fd/overall[n])**2,0)+Math.log(mph/i.topSpeedGoalMph)**2*5+firstError**2*5;
   if(!result||error<result.error)result={error,finalDrive:fd,gears,theoreticalMph:mph};
  }
  return result;
 };
 const fittedRounded=quantize(fitted.overall),neutral=fitted.overall.map((_,n)=>fitted.overall[0]*(fitted.overall.at(-1)/fitted.overall[0])**(n/(count-1))),neutralRounded=quantize(neutral);
 let fit={...fitted.fit};
 if(fittedRounded){
  let selected=fittedRounded;
  if(fitted.model&&fitted.options){
   let cost=rollingWorkCost(selected.gears.map(g=>g*selected.finalDrive),fitted.model,fitted.options);
   const ref=neutralRounded&&rollingWorkCost(neutralRounded.gears.map(g=>g*neutralRounded.finalDrive),fitted.model,fitted.options);
   if(ref&&(!cost||ref.seconds<cost.seconds)){selected=neutralRounded;cost=ref;fit={...fit,capturedPrefixRetained:0,shape:1};}
   if(cost)fit={...fit,referenceCost:ref?.seconds??null,candidateCost:cost.seconds,shifts:cost.shifts,endGear:cost.endGear,powerUtilization:cost.powerUtilization};
   else fit={mode:'RPM reference',launch:fit.launch,message:'Rounded ratios lack continuous power coverage. No rolling improvement is claimed.'};
  }
  best={score:0,...selected};
 }else fit={mode:'RPM reference',message:'The captured launch ratio does not fit the ratio design window. Original reference gearing retained.'};
 const supported=estimateShiftPoints(usable,best.gears,limit);
 const shifts=best.gears.slice(1).map((g,n)=>({from:n+1,to:n+2,rpm:supported[n]?.rpm??Math.round(limit*.98),source:supported[n]?.rpm?'supported power crossover':'engine-limit reference',afterRpm:Math.round((supported[n]?.rpm??limit*.98)*g/best.gears[n])}));
 const {score,...result}=best;
 return {...result,rpm:targetRpm,source,engineLimitRpm:limit,revLimitMph:best.theoreticalMph*limit/targetRpm,goalMph:i.topSpeedGoalMph,shifts,launchControl:i.launchControl,fit,assumptions:[
  'Speed = RPM × π × driven tire diameter (in) × 60 / (ratio × final drive × 63,360). This is a gearing ceiling, not an attainable-speed prediction.',
  'Two-decimal ratios. Conservative design window: final drive 2.00–5.00, individual ratios 0.50–5.00; this is not a universal FH6 adjustment range.'+(pictured?' For the pictured Trackhawk only, final drive may reach 6.10 and individual gears may reach 0.48.':''),
  interior?'Top gear targets the supported measured power peak. Power delivery and shift costs select intermediate spacing; launch reduction is fitted independently.':'Power peak is unknown. A 72% reference RPM-retention span seeds launch reduction, then available rated power/torque or measured power coverage is used to fit intermediate spacing.',
  ...(fit.assumptions||[]),
  fit.launch?'First-gear overall reduction is retained from a stable, low-slip capture within 1% rounding. This keeps the captured launch configuration as a starting point.':'First-gear launch reduction is a reference until a stable first-gear capture is provided; the rolling fit does not optimize launch grip.',
  'Shift crossover recommendations require power coverage in both gears. Observed driver shifts alone are not optimal-shift evidence. No missing power bins are extrapolated.',
 ]};
}
