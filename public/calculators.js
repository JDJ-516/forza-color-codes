const positive = (value, name, min, max) => {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}.`);
  return value;
};
export function hsvToHex(h,s,v) {
  for (const [name,value] of [['Hue',h],['Saturation',s],['Brightness',v]]) positive(value,name,0,1);
  const sector=(h%1)*6, chroma=v*s, x=chroma*(1-Math.abs(sector%2-1)), m=v-chroma;
  const rgb=[[chroma,x,0],[x,chroma,0],[0,chroma,x],[0,x,chroma],[x,0,chroma],[chroma,0,x]][Math.floor(sector)];
  return '#'+rgb.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');
}
export function hexToHsv(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('Enter a six-digit hex color.');
  const [r,g,b]=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255);
  const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
  const h=!delta?0:max===r?((g-b)/delta+6)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;
  return [h/6,max?delta/max:0,max];
}
export function colorFamily([h,s,v]) {
  if(s<.12 || v<.09) return 'Neutral';
  h%=1;
  return h<.04||h>=.96?'Red':h<.12?'Orange':h<.19?'Yellow':h<.47?'Green':h<.69?'Blue':h<.84?'Purple':'Pink';
}
export function gearingEstimate({width,aspect,rim,rpm,finalDrive,gears,targetKph}) {
  positive(width,'Tire width (mm)',100,500); positive(aspect,'Aspect ratio (%)',10,100); positive(rim,'Wheel diameter (inches)',10,30);
  positive(rpm,'Shift RPM',1000,20000); positive(finalDrive,'Final drive',.5,10);
  if(!Array.isArray(gears)||gears.length<4||gears.length>10)throw new Error('Use 4 to 10 gear ratios.');
  gears.forEach((g,i)=>{positive(g,`Gear ${i+1}`, .1,10);if(i&&g>=gears[i-1])throw new Error('Gear ratios must decrease from first gear to top gear.');});
  if(targetKph!==undefined)positive(targetKph,'Target speed (km/h)',20,600);
  const diameterMm=rim*25.4+2*width*aspect/100, circumferenceM=Math.PI*diameterMm/1000;
  return {diameterMm,circumferenceM,
    gears:gears.map((ratio,i)=>{const kph=rpm*circumferenceM*60/(ratio*finalDrive*1000);return {gear:i+1,ratio,kph,mph:kph/1.609344,nextRpm:i<gears.length-1?rpm*gears[i+1]/ratio:null};}),
    suggestedFinalDrive:targetKph===undefined?null:rpm*circumferenceM*60/(gears.at(-1)*targetKph*1000)};
}
export function suspensionEstimate({mass,frontPercent,frontUnsprung,rearUnsprung,frontHz,rearHz,frontMotion,rearMotion,dampingRatio}) {
  positive(mass,'Vehicle mass (kg)',500,5000);positive(frontPercent,'Front weight (%)',20,80);
  positive(dampingRatio,'Damping ratio',.1,1.5);
  return [['Front',frontPercent/100,frontUnsprung,frontHz,frontMotion],['Rear',1-frontPercent/100,rearUnsprung,rearHz,rearMotion]].map(([axle,fraction,unsprung,hz,motion])=>{
    positive(unsprung,`${axle} unsprung mass per wheel (kg)`,0,150);positive(hz,`${axle} frequency (Hz)`,.5,4);positive(motion,`${axle} motion ratio`,.2,1.5);
    const sprungMass=mass*fraction/2-unsprung;
    if(sprungMass<=0)throw new Error(`${axle} sprung corner mass must be positive. Reduce unsprung mass or check weight distribution.`);
    const wheelRate=Math.pow(2*Math.PI*hz,2)*sprungMass,springNmm=wheelRate/(motion*motion)/1000;
    const wheelDamping=2*dampingRatio*Math.sqrt(wheelRate*sprungMass);
    return {axle,sprungMass,wheelRateNmm:wheelRate/1000,springNmm,springLbIn:springNmm*5.71014716277,wheelDamping,damperCoefficient:wheelDamping/(motion*motion)};
  });
}
