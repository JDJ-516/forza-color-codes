// Display schema for the 324-byte Horizon packet. Offsets/provenance: docs/telemetry.md.
const field=(key,label,unit='',precision=2,format)=>({key,label,unit,precision,format});
const vector=(key,label,unit)=>['X','Y','Z'].map((axis,index)=>({...field(key,`${label} ${axis}`,unit,3),index}));
const wheels=(key,label,unit='',precision=2)=>['Front left','Front right','Rear left','Rear right'].map((wheel,index)=>({...field(key,`${wheel} · ${label}`,unit,precision),index}));
export const TELEMETRY_GROUPS=[
 {title:'Engine & drivetrain',fields:[field('speedKph','Speed','km/h',1),field('rpm','Engine speed','RPM',0),field('engineMaxRpmRaw','Maximum engine speed','RPM',0),field('engineIdleRpm','Idle engine speed','RPM',0),field('gear','Gear','',0,'gear'),field('powerW','Engine power','W',0),field('torqueNm','Engine torque','N·m',1),field('boostPsi','Boost','psi',2),field('fuelFraction','Fuel','%',1,'percent')]},
 {title:'Driver inputs',fields:[field('throttle','Throttle','%',1,'percent'),field('brake','Brake','%',1,'percent'),field('clutch','Clutch','%',1,'percent'),field('handbrake','Handbrake','%',1,'percent'),field('steer','Steering','%',1,'percent'),field('drivingLine','Driving line','raw',0),field('aiBrakeDifference','AI brake difference','raw',0)]},
 {title:'Motion & orientation',fields:[...vector('acceleration','Acceleration','m/s²'),...vector('velocity','Velocity','m/s'),...vector('angularVelocity','Angular velocity','rad/s'),field('yaw','Yaw','rad',3),field('pitch','Pitch','rad',3),field('roll','Roll','rad',3)]},
 {title:'Position & race timing',fields:[...vector('position','Position','m'),field('distanceTraveledM','Distance traveled','m',1),field('bestLapS','Best lap','s',3),field('lastLapS','Last lap','s',3),field('currentLapS','Current lap','s',3),field('raceTimeS','Race time','s',3),field('lapNumber','Lap number','',0),field('racePosition','Race position','',0)]},
 {title:'Tire temperatures & wheel speeds',fields:[...wheels('tireTempC','temperature','°C',1),...wheels('wheelRotationSpeed','rotation speed','rad/s')]},
 {title:'Tire slip',fields:[...wheels('tireSlipRatio','slip ratio'),...wheels('tireSlipAngle','slip angle','normalized'),...wheels('tireCombinedSlip','combined slip','normalized')]},
 {title:'Suspension',fields:[...wheels('suspensionTravel','travel','normalized',3),...wheels('suspensionTravelM','travel','m',3)]},
 {title:'Surface & wheel contact',fields:[...wheels('onRumbleStrip','on rumble strip'),...wheels('puddleDepth','puddle depth','normalized',3),...wheels('surfaceRumble','surface rumble','normalized',3)]},
 {title:'Vehicle & session',fields:[field('raceOnRaw','Driving active','',0,'active'),field('timestampMs','Game timestamp','ms',0),field('carOrdinal','Car ID','',0),field('carClass','Car class','',0,'class'),field('carPerformanceIndex','Performance index','PI',0),field('drivetrain','Drivetrain','',0,'drivetrain'),field('cylinders','Cylinders','',0),field('carGroup','Car group ID','',0),field('smashableVelocityDifference','Smashable velocity difference','reported',3),field('smashableMass','Smashable mass','reported',3),field('reservedByte','Reserved byte (meaning unknown)','raw',0)]},
];
export function telemetryValue(readings,descriptor){
 let value=readings?.[descriptor.key];
 if(descriptor.index!==undefined)value=Array.isArray(value)?value[descriptor.index]:null;
 if(typeof value==='boolean')return value?'Yes':'No';
 if(typeof value!=='number'||!Number.isFinite(value))return '—';
 if(descriptor.format==='percent')value*=100;
 if(descriptor.format==='gear')return value===0?'R':value===11?'N':String(value);
 if(descriptor.format==='class')return ['D','C','B','A','S1','S2','X'][value]??String(value);
 if(descriptor.format==='drivetrain')return ['FWD','RWD','AWD'][value]??String(value);
 if(descriptor.format==='active')return value===1?'Yes':value===0?'No':String(value);
 return value.toLocaleString(undefined,{minimumFractionDigits:descriptor.precision,maximumFractionDigits:descriptor.precision})+(descriptor.unit?' '+descriptor.unit:'');
}
