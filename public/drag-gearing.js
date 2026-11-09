const round=n=>Math.round(n*1000)/1000;
export function gearingSpeedMph(input,rpm=input.shiftRpm){
 const diameterM=input.rim*.0254+2*input.width*input.aspect/100/1000;
 return rpm*Math.PI*diameterM/(60*input.gears.at(-1)*input.finalDrive)*2.2369362920544;
}
export function suggestDragGearing(input,goalMph,curve=[]){
 if(!Number.isFinite(goalMph)||goalMph<=0||goalMph>600)throw new Error('Enter a top-speed goal above 0 and no more than 600 mph.');
 if(!Array.isArray(input.gears)||input.gears.length<4||input.gears.length>10||input.gears.some((g,i)=>!Number.isFinite(g)||g<.1||g>10||(i&&g>=input.gears[i-1])))throw new Error('Enter 4–10 descending gear ratios first.');
 for(const [key,min,max] of [['width',100,500],['aspect',10,100],['rim',10,30],['finalDrive',.5,10],['shiftRpm',1000,20000],['torquePeakRpm',1000,20000]])if(!Number.isFinite(input[key])||input[key]<min||input[key]>max)throw new Error('Enter valid tire dimensions, final drive, shift RPM and torque-peak RPM first.');
 const eligible=curve.filter(p=>p.rpm<=input.shiftRpm&&Number.isFinite(p.powerW)&&p.powerW>0),peak=eligible.length>=4?eligible.reduce((a,b)=>a.powerW>b.powerW?a:b):null;
 const requested=Number.isFinite(input.powerPeakRpm)&&input.powerPeakRpm>0?input.powerPeakRpm:null;
 const rpm=peak?.rpm??requested??input.shiftRpm,source=peak?'measured power curve':requested?'entered power-peak RPM':'entered shift RPM (power peak unknown)';
 if(rpm>input.shiftRpm||rpm<1000)throw new Error('Power-peak RPM must be between 1,000 RPM and your shift RPM.');
 const diameterM=input.rim*.0254+2*input.width*input.aspect/100/1000,top=input.gears.at(-1);
 const exactFd=rpm*Math.PI*diameterM/(60*top*(goalMph/2.2369362920544)),finalDrive=round(exactFd);
 if(finalDrive<.5||finalDrive>10)throw new Error('This goal needs a final drive outside 0.5–10. Adjust top gear, RPM or the speed goal.');
 // Preserve the launch's first-gear overall ratio, then space the remaining gears.
 const first=input.gears[0]*input.finalDrive/finalDrive;
 if(first<=top||first>10||first<.1)throw new Error('This goal cannot preserve your launch ratio within the gear limits. Adjust the top gear or goal.');
 const gears=Array.from({length:input.gears.length},(_,i)=>round(first*Math.pow(top/first,i/(input.gears.length-1))));
 if(gears.some((g,i)=>g<.1||g>10||(i&&g>=gears[i-1])))throw new Error('Rounded gearing falls outside the adjustment limits. Change the goal or ratios.');
 const candidate={...input,finalDrive,gears},postShiftRpm=gears.slice(1).map((g,i)=>input.shiftRpm*g/gears[i]);
 return {goalMph,rpm,source,finalDrive,gears,theoreticalMph:gearingSpeedMph(candidate,rpm),postShiftRpm,staysAboveTorquePeak:postShiftRpm.every(r=>r>=input.torquePeakRpm),launchRatioChange:gears[0]*finalDrive-input.gears[0]*input.finalDrive};
}

// Create a complete ratio set when the user has not entered existing ratios.
// First/top references are explicit assumptions, never inferred gearbox contents.
export function generateDragGearset(input,goalMph,curve=[]){
 const existing=Array.isArray(input.gears)&&input.gears.length>=4&&input.gears.every((g,i)=>Number.isFinite(g)&&g>=.1&&g<=10&&(!i||g<input.gears[i-1]))?input.gears:null;
 const count=Number.isInteger(input.setupGearCount)&&input.setupGearCount>0?input.setupGearCount:existing?.length;
 if(!Number.isInteger(count)||count<4||count>10)throw new Error('Choose the number of gears in your installed gearbox.');
 const first=Number.isFinite(input.setupFirstGear)?input.setupFirstGear:existing?.[0]??3;
 const top=Number.isFinite(input.setupTopGear)?input.setupTopGear:existing?.at(-1)??.9;
 if(!Number.isFinite(first)||!Number.isFinite(top)||first>10||top<.1||first<=top)throw new Error('First-gear reference must exceed top gear; both must be within 0.1–10.');
 const gears=Array.from({length:count},(_,i)=>round(first*Math.pow(top/first,i/(count-1))));
 const peaks=curve.filter(p=>p.rpm<=input.shiftRpm&&Number.isFinite(p.powerW)&&p.powerW>0);
 const rpm=peaks.length>=4?peaks.reduce((a,b)=>a.powerW>b.powerW?a:b).rpm:Number.isFinite(input.powerPeakRpm)&&input.powerPeakRpm>0?input.powerPeakRpm:input.shiftRpm;
 const finalDrive=round(gearingSpeedMph({...input,gears,finalDrive:1},rpm)/goalMph);
 const result=suggestDragGearing({...input,gears,finalDrive},goalMph,curve);
 return {...result,firstReference:first,topReference:top,generatedFromReferences:true};
}
