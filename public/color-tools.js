import {hsvToHex,colorFamily} from './calculators.js';
export const FEATURE_INTERVAL_MS=10*60*1000;
export const FINISH_TYPES=['Normal','Solid','Metallic','Metal Flake','Matte','Semigloss','Chrome','Aluminum Polished','Aluminum Semigloss','Aluminium Semigloss','Aluminum Brushed','Carbon Fiber Polished','Carbon Fibre Polished','Two-Tone Matte','Two-Tone Polished','Two-Tone Semigloss','Prismacolor White'];
export const needsSecondLayer=finish=>/metal\s*flake|metallic|two[ -]tone|prismacolor/i.test(finish);
export function nextFeaturedColor(colors,previous,now=Date.now(),random=Math.random){
 const eligible=colors.filter(c=>c&&!c.issues?.length&&!c.source?.historical&&/^#[0-9a-f]{6}$/i.test(c.hex));
 if(!eligible.length)return null;
 if(previous&&typeof previous.id==='string'&&Number.isFinite(previous.changedAt)&&previous.changedAt<=now&&now-previous.changedAt<FEATURE_INTERVAL_MS&&eligible.some(c=>c.id===previous.id))return previous;
 const choices=eligible.length>1?eligible.filter(c=>c.id!==previous?.id):eligible;
 return {id:choices[Math.max(0,Math.min(choices.length-1,Math.floor(random()*choices.length)))].id,changedAt:now};
}
export function personalColor(values,{id,secondary=false}={}){
 const name=String(values.name||'').trim(),finish=String(values.finish==='__custom_finish__'?values.customFinish||'':values.finish||'').trim();
 const manufacturer=String(values.manufacturer==='__custom__'?values.customManufacturer||'':values.manufacturer||'').trim();
 if(!name)throw new Error('Enter a color name.');
 if(!finish||finish.length>80)throw new Error('Select a paint finish.');
 if(values.manufacturer==='__custom__'&&!manufacturer)throw new Error('Enter the custom manufacturer or choose No manufacturer.');
 if(needsSecondLayer(finish)&&!secondary)throw new Error('This finish needs both paint layers.');
 const layers=[0,...(secondary?[1]:[])].map(i=>{
  const keys=i?['h2','s2','b2']:['h','s','b'];
  const parsed=keys.map(key=>{const raw=values[key],value=Number(raw);if(raw===''||raw==null||!Number.isFinite(value)||value<0||value>1)throw new Error('Each HSB value must be between 0 and 1.');return value;});
  const raw=keys.map((key,j)=>{const side=values[key+'Side']||'';if(!['','L','R'].includes(side))throw new Error('Slider side must be L, R, or unspecified.');return parsed[j].toFixed(2)+(side?' '+side:'');});
  return {label:`Color ${i+1} (${i?'Y':'X'})`,raw,values:parsed};
 });
 const [h,s,b]=layers[0].values;
 return {id,name,manufacturer,finish,h,s,b,hex:hsvToHex(h,s,b),family:values.family||colorFamily([h,s,b]),layers,notes:String(values.notes||'')};
}

export function paintTextColor(hex){
 if(!/^#[0-9a-f]{6}$/i.test(hex))return '#ffffff';
 const rgb=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
 return luminance>.179?'#000000':'#ffffff';
}
