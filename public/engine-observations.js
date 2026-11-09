// These are eligible observed maxima, not rated engine peaks or optimal shift points.
export const engineKey=s=>[s.carOrdinal,s.carPerformanceIndex,s.drivetrain,s.engineMaxRpm].join(':');
export function emptyEngineMeasurements(key=null){return {key,eligibleSamples:0,powerSamples:0,torqueSamples:0,peakPowerW:null,peakTorqueNm:null,torquePeakRpm:null};}
export function observeEngine(measured,s){
 if(!s.isRaceOn||s.carOrdinal<0)return measured;
 const key=engineKey(s);
 if(measured.key!==key)measured=emptyEngineMeasurements(key);
 if(s.throttle<.95||s.brake>.02||s.gear<2||s.speedKph<40||Math.abs(s.steer)>=.15||!Array.isArray(s.tireSlipRatio)||s.tireSlipRatio.length!==4||s.tireSlipRatio.some(v=>!Number.isFinite(v)||Math.abs(v)>=.15))return measured;
 const power=Number.isFinite(s.powerW)&&s.powerW>0,torque=Number.isFinite(s.torqueNm)&&s.torqueNm>0;
 if((!power&&!torque)||!Number.isFinite(s.rpm)||s.rpm<=0)return measured;
 measured.eligibleSamples++;
 if(power){measured.powerSamples++;if(measured.peakPowerW===null||s.powerW>measured.peakPowerW)measured.peakPowerW=s.powerW;}
 if(torque){measured.torqueSamples++;if(measured.peakTorqueNm===null||s.torqueNm>measured.peakTorqueNm){measured.peakTorqueNm=s.torqueNm;measured.torquePeakRpm=s.rpm;}}
 return measured;
}
