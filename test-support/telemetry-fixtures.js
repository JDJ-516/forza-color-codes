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
// Every supported field populated distinctly; entirely synthetic.
export function fullPacket(){
 const b=packet();
 const floats={12:950,20:.125,24:-2.5,28:9.75,32:12,36:3,40:4,44:.125,48:.25,52:-.5,56:.25,60:-.125,64:.5,236:12.5,240:9,244:1234.5,248:25,252:-678.25,256:13,264:500,284:14.5,288:.75,292:12345.5,296:61.25,300:62.5,304:10.25,308:135.75};
 for(const [offset,value] of Object.entries(floats))b.writeFloatLE(value,Number(offset));
 for(const [offset,start] of [[68,.25],[84,.125],[100,10],[132,.125],[148,.25],[164,.125],[180,.25],[196,.125],[268,180]])for(let i=0;i<4;i++)b.writeFloatLE(start+i*.125,offset+i*4);
 [116,120,124,128].forEach((offset,i)=>b.writeInt32LE(i%2,offset));
 for(const [offset,value] of [[216,4],[220,850],[224,2],[228,8],[232,37]])b.writeInt32LE(value,offset);
 b.writeUInt16LE(123,312);b[314]=4;b[315]=128;b[316]=64;b[317]=192;b[318]=255;b[319]=3;b.writeInt8(-64,320);b.writeInt8(-127,321);b.writeInt8(127,322);b[323]=7;
 return b;
}
