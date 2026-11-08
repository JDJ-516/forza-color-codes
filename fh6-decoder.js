// Cross-checked community Horizon 324-byte layout; see docs/telemetry.md.
// Unsupported layouts are reported explicitly rather than guessed by shifting offsets.
const finite=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const printable=value=>Number.isFinite(value)?value:String(value);
export function inspectHorizonPacket(buffer){
 const checks=[];
 const check=(name,offset,value,expected,valid)=>{checks.push({name,offset,value:printable(value),expected,valid});};
 check('Packet size',null,buffer.length,'324 bytes',buffer.length===324);
 if(buffer.length!==324)return {layout:'horizon324-community',bytes:buffer.length,valid:false,checks,failures:checks.filter(c=>!c.valid)};
 const f=offset=>buffer.readFloatLE(offset),race=buffer.readInt32LE(0),speed=f(256),rpm=f(16),maxRpm=f(8),velocity=[32,36,40].map(f);
 check('Active flag',0,race,'0 (inactive) or 1 (driving)',[0,1].includes(race));
 check('Current engine RPM',16,rpm,'0–25000 RPM',finite(rpm,0,25000));
 check('Maximum engine RPM',8,maxRpm,race===0?'0–25000 RPM (zero is allowed while inactive)':'100–25000 RPM while driving',finite(maxRpm,race===0?0:100,25000));
 check('Speed',256,speed,'0–250 m/s',finite(speed,0,250));
 check('Gear',319,buffer[319],'0–11',buffer[319]<=11);
 // Signed byte endpoints are both representable; normalize -128 to full-left (-1).
 check('Steering',320,buffer.readInt8(320),'-128–127 signed byte',true);
 velocity.forEach((value,i)=>check(`Velocity ${['X','Y','Z'][i]}`,32+i*4,value,'−500–500 m/s',finite(value,-500,500)));
 const magnitude=Math.hypot(...velocity);
 check('Speed / velocity agreement',256,magnitude,`velocity magnitude within max(1 m/s, 10%) of speed (${printable(speed)})`,Number.isFinite(magnitude)&&Number.isFinite(speed)&&Math.abs(magnitude-speed)<=Math.max(1,speed*.1));
 for(const [start,label,min,max,convert,unit] of [[68,'suspension travel',-.25,1.25,v=>v,'normalized'],[84,'tire slip ratio',-100,100,v=>v,'ratio'],[268,'tire temperature',-100,350,v=>(v-32)*5/9,'°C']]){
  [0,4,8,12].forEach((delta,i)=>{const value=convert(f(start+delta));check(`${['Front-left','Front-right','Rear-left','Rear-right'][i]} ${label}`,start+delta,value,`${min}–${max} ${unit}`,finite(value,min,max));});
 }
 check('Engine power',260,f(260),'−2000000–5000000 watts',finite(f(260),-2000000,5000000));
 return {layout:'horizon324-community',bytes:buffer.length,valid:checks.every(c=>c.valid),checks,failures:checks.filter(c=>!c.valid),carOrdinal:buffer.readInt32LE(212),gameTimestampMs:buffer.readUInt32LE(4)};
}
export function decodeHorizonPacket(buffer){
 const inspection=inspectHorizonPacket(buffer);
 if(!inspection.valid){
  const reason=buffer.length!==324?`Unsupported packet size: ${buffer.length}; expected 324 bytes.`:'Packet failed plausibility checks: '+inspection.failures.slice(0,4).map(c=>`${c.name} at byte ${c.offset}: ${c.value}; expected ${c.expected}`).join('. ')+'.';
  const error=new Error(reason);error.inspection=inspection;throw error;
 }
 return readHorizonChannels(buffer);
}

// The display can inspect rejected 324-byte packets, but only decodeHorizonPacket
// authorizes a reading for capture/tuning. Never infer offsets for another size.
export function readHorizonChannels(buffer){
 if(buffer.length!==324)return null;
 const f=offset=>{const value=buffer.readFloatLE(offset);return Number.isFinite(value)?value:null;};
 const array=offset=>[0,4,8,12].map(delta=>f(offset+delta));
 const vector=offset=>[0,4,8].map(delta=>f(offset+delta));
 const scale=(value,factor,shift=0)=>value===null?null:(value+shift)*factor;
 const maxRpm=f(8),lap=offset=>finite(f(offset),0,10800)?f(offset):null;
 return {
  timestampMs:buffer.readUInt32LE(4),isRaceOn:buffer.readInt32LE(0)===1,
  raceOnRaw:buffer.readInt32LE(0),carOrdinal:buffer.readInt32LE(212),
  carClass:buffer.readInt32LE(216),carPerformanceIndex:buffer.readInt32LE(220),
  drivetrain:buffer.readInt32LE(224),cylinders:buffer.readInt32LE(228),
  carGroup:buffer.readInt32LE(232),smashableVelocityDifference:f(236),smashableMass:f(240),
  speedKph:scale(f(256),3.6),rpm:f(16),engineMaxRpm:maxRpm>=100?maxRpm:null,
  engineMaxRpmRaw:maxRpm,engineIdleRpm:f(12),powerW:f(260),torqueNm:f(264),
  acceleration:vector(20),velocity:vector(32),angularVelocity:vector(44),
  yaw:f(56),pitch:f(60),roll:f(64),position:vector(244),
  gear:buffer[319],throttle:buffer[315]/255,brake:buffer[316]/255,
  clutch:buffer[317]/255,handbrake:buffer[318]/255,steer:Math.max(-1,buffer.readInt8(320)/127),
  drivingLine:buffer.readInt8(321),aiBrakeDifference:buffer.readInt8(322),
  suspensionTravel:array(68),tireSlipRatio:array(84),wheelRotationSpeed:array(100),
  onRumbleStrip:[116,120,124,128].map(offset=>buffer.readInt32LE(offset)!==0),
  puddleDepth:array(132),surfaceRumble:array(148),tireSlipAngle:array(164),
  tireCombinedSlip:array(180),suspensionTravelM:array(196),
  tireTempC:array(268).map(v=>scale(v,5/9,-32)),boostPsi:f(284),fuelFraction:f(288),
  distanceTraveledM:f(292),bestLapS:f(296),lastLapS:lap(300),currentLapS:lap(304),
  raceTimeS:f(308),lapNumber:buffer.readUInt16LE(312),racePosition:buffer[314],
  reservedByte:buffer[323],
 };
}
