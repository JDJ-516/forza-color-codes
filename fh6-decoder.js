// Cross-checked community Horizon 324-byte layout; see docs/telemetry.md.
// Exact length and plausibility checks intentionally reject unsupported layouts.
export function decodeHorizonPacket(buffer) {
  if(buffer.length!==324)throw new Error(`Unsupported packet size: ${buffer.length}; expected 324 bytes.`);
  const f=o=>buffer.readFloatLE(o), array=o=>[0,4,8,12].map(i=>f(o+i));
  const race=buffer.readInt32LE(0),speed=f(256),rpm=f(16),maxRpm=f(8),velocity=array(32).slice(0,3);
  const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
  if(![0,1].includes(race)||!finite(speed,0,250)||!finite(rpm,0,25000)||!finite(maxRpm,100,25000)||buffer[319]>11||buffer.readInt8(320)<-127)throw new Error('Packet failed basic race/RPM/speed/gear plausibility checks.');
  if(velocity.some(v=>!finite(v,-500,500))||Math.abs(Math.hypot(...velocity)-speed)>Math.max(1,speed*.1))throw new Error('Packet speed does not agree with the velocity vector.');
  const travel=array(68),slip=array(84),temps=array(268).map(v=>(v-32)*5/9),powerW=f(260);
  if(travel.some(v=>!finite(v,-.25,1.25))||slip.some(v=>!finite(v,-100,100))||temps.some(v=>!finite(v,-100,350))||!finite(powerW,-2000000,5000000))throw new Error('Packet failed tire/suspension/power plausibility checks.');
  const lap=o=>{const v=f(o);return finite(v,0,10800)?v:null;};
  return {timestampMs:buffer.readUInt32LE(4),isRaceOn:race===1,carOrdinal:buffer.readInt32LE(212),drivetrain:buffer.readInt32LE(224),speedKph:speed*3.6,rpm,engineMaxRpm:maxRpm,powerW,gear:buffer[319],throttle:buffer[315]/255,brake:buffer[316]/255,steer:buffer.readInt8(320)/127,suspensionTravel:travel,tireSlipRatio:slip,tireTempC:temps,onRumbleStrip:[116,120,124,128].map(o=>buffer.readInt32LE(o)!==0),lapNumber:buffer.readUInt16LE(312),lastLapS:lap(300),currentLapS:lap(304)};
}
