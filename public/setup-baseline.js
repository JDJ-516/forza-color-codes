// Adapted reference constants/heuristics: ClickClickMedia/Forza-6-telemetry,
// commit 523e8ba188d0f7c0a5540139174db286198e851c, app/tune_calc.py (MIT).
// Copyright (c) 2026 ClickClickMedia. License: car-catalogue-LICENSE.txt.
// These are testable starting references, not measured or optimized FH6 settings.
import {LB_PER_KG} from './units.js';
export const TIRE_REFERENCE_PSI={Stock:28,Street:28,Sport:28.5,'Semi-Slick':29,Slick:29,Drag:29.5,Drift:28.5,Rally:27,Offroad:26,Snow:26,Vintage:27.5};
const r=value=>Number(value.toFixed(1));
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export function dragChassisBaseline(input){
 if(!finite(input.mass,500,5000)||!finite(input.frontPercent,20,80))throw new Error('Enter weight (lb) and front weight distribution (%) to generate chassis settings.');
 if(!['RWD','FWD','AWD'].includes(input.drive))throw new Error('Choose the drivetrain, or connect the current car telemetry.');
 const frontHz=input.setupFrontHz,rearHz=input.setupRearHz;
 if(!finite(frontHz,.5,4)||!finite(rearHz,.5,4))throw new Error('Ride-frequency targets must be between 0.5 and 4 Hz.');
 const damperMin=input.setupDamperMin,damperMax=input.setupDamperMax;
 if(!finite(damperMin,0,100)||!finite(damperMax,0,100)||damperMax<=damperMin)throw new Error('Enter an ordered damper reference range.');
 if(!Object.hasOwn(TIRE_REFERENCE_PSI,input.tireCompound))throw new Error('Choose a supported tire compound for the pressure reference.');
 const low=Number.isFinite(input.setupSpringMin)?input.setupSpringMin:0,high=Number.isFinite(input.setupSpringMax)?input.setupSpringMax:Infinity;
 if(low<0||high<=low)throw new Error('Spring limits must be nonnegative and ordered. Leave them blank if unknown.');
 const frontFraction=input.frontPercent/100,weight=input.mass*LB_PER_KG;
 const frontSpring=r(frontHz**2*weight*frontFraction/19.56),rearSpring=r(rearHz**2*weight*(1-frontFraction)/19.56);
 const rebF=r(Math.max(0,6.5+(frontHz-2.4)*4)),rebR=r(Math.max(0,6.5+(rearHz-2.4)*4));
 const bumpF=r(rebF*.6),bumpR=r(rebR*.6),offset={FWD:[-2,2],RWD:[0,0],AWD:[-1,1]}[input.drive];
 const camber=r(-.3+(input.drive==='FWD'?-.4:0)),diff=input.drive==='RWD'?[68,34]:[55,20];
 return {
  springs:{front:frontSpring,rear:rearSpring,frontInRange:frontSpring>=low&&frontSpring<=high,rearInRange:rearSpring>=low&&rearSpring<=high,rangeKnown:Number.isFinite(input.setupSpringMin)||Number.isFinite(input.setupSpringMax)},
  dampers:{frontRebound:rebF,rearRebound:rebR,frontBump:bumpF,rearBump:bumpR,inRange:[rebF,rebR,bumpF,bumpR].every(v=>v>=damperMin&&v<=damperMax),min:damperMin,max:damperMax},
  tires:{front:r(TIRE_REFERENCE_PSI[input.tireCompound]+offset[0]),rear:r(TIRE_REFERENCE_PSI[input.tireCompound]+offset[1]),compound:input.tireCompound},
  arb:{front:r(Math.max(1,Math.min(65,25+(input.frontPercent-50)*.7))),rear:r(Math.max(1,Math.min(65,25-(input.frontPercent-50)*.7)))},
  alignment:{frontCamber:camber,rearCamber:r(camber*.5),frontToe:0,rearToe:0,caster:5},
  differential:{front:input.drive==='RWD'?null:{accel:diff[0],decel:diff[1]},rear:input.drive==='FWD'?null:{accel:diff[0],decel:diff[1]},center:null},
  brakes:{pressure:100,balance:50},
  assumptions:[`Gross axle-weight spring approximation; front ${frontHz.toFixed(1)} Hz / rear ${rearHz.toFixed(1)} Hz; unsprung mass and motion ratio are not independently measured.`,`Tire compound reference: ${input.tireCompound}; it is not detected from telemetry.`,`Damper reference scale ${damperMin}–${damperMax}; rebound = 6.5 + (Hz − 2.4) × 4; bump = 60% of rebound. This is not a physical damping-coefficient-to-game-slider calibration.`,'Pressure, alignment, anti-roll, differential and brake settings are source-profile starting points, not proven FH6 optima.','Spring and ride-height/aero limits depend on installed parts. Ride height, aero and AWD center split are not guessed.'],
 };
}
