// Synthetic test fixtures only. These are not real FH6 captures.
export function packet({speed=20,rpm=4000,timestamp=1000,car=42}={}){
 const b=Buffer.alloc(324);b.writeInt32LE(1,0);b.writeUInt32LE(timestamp,4);b.writeFloatLE(8000,8);b.writeFloatLE(900,12);b.writeFloatLE(rpm,16);b.writeFloatLE(speed,32);b.writeFloatLE(speed,256);b.writeFloatLE(200000,260);b.writeInt32LE(car,212);b.writeInt32LE(1,224);b[315]=255;b[319]=2;[68,72,76,80].forEach(o=>b.writeFloatLE(.5,o));[268,272,276,280].forEach(o=>b.writeFloatLE(212,o));return b;
}
export function dragSession({acceleration=4,seconds=32}={}){
 const samples=[];
 for(let step=0;step<=seconds*10;step++){
  const elapsed=Math.max(0,step/10-1),speed=acceleration*elapsed;
  samples.push({timestampMs:step*100,isRaceOn:true,carOrdinal:42,speedKph:speed*3.6,rpm:3000+speed*25,gear:speed<12?1:speed<25?2:speed<40?3:4,throttle:elapsed?1:0,brake:0,steer:0,engineMaxRpm:8000,powerW:100000+speed*1000,tireSlipRatio:[0,0,0,0],suspensionTravel:[.5,.5,.5,.5],onRumbleStrip:[false,false,false,false],tireTempC:[80,80,80,80]});
 }
 return {schema:'forza-garage-telemetry/v1',source:'Synthetic unit-test fixture',samples};
}
