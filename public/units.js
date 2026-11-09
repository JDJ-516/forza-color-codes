// Canonical physics/session units stay SI. UI defaults to US customary units.
export const HP_PER_KW=1.3410220895950277,LBFT_PER_NM=.7375621492772656,LB_PER_KG=2.2046226218487757,MPH_PER_KPH=1/1.609344,FT_PER_M=1/.3048,IN_PER_M=1/.0254;
export const DISPLAY_FACTORS={diameter:1,hp:HP_PER_KW,lbft:LBFT_PER_NM,lb:LB_PER_KG,ft:FT_PER_M,in:IN_PER_M,inchWidth:1/25.4,sqft:1/.09290304,cuin:61.0237440947323,mph:MPH_PER_KPH};
export const toDisplay=(value,kind)=>value*(DISPLAY_FACTORS[kind]??1);
export const fromDisplay=(value,kind)=>value/(DISPLAY_FACTORS[kind]??1);
export function readSI(control){
 if(!control||control.value==='')return NaN;
 if(control.dataset.siText===control.value&&Number.isFinite(Number(control.dataset.siValue)))return Number(control.dataset.siValue);
 return Number(fromDisplay(Number(control.value),control.dataset.siDisplay).toFixed(8));
}
export function writeSI(control,value){
 if(!control)return;
 if(value==null||value===''||!Number.isFinite(Number(value))){control.value='';delete control.dataset.siText;delete control.dataset.siValue;return;}
 const original=Number(value),display=toDisplay(original,control.dataset.siDisplay);
 let text=control.dataset.siDisplay?String(Number(display.toFixed(2))):String(original);
 if((control.min!==''&&Number(text)<Number(control.min))||(control.max!==''&&Number(text)>Number(control.max)))text=String(Number(display.toFixed(12)));
 control.value=text;control.dataset.siText=control.value;control.dataset.siValue=String(original);
}
export const mph=kph=>kph*MPH_PER_KPH;
export function usError(message){
 return String(message).replace(/([A-Za-z /-]+)\((kg|mm|m²|m|km\/h|kW|Nm|N·m)\) must be between ([-\d.]+) and ([-\d.]+)\./g,(_,label,unit,min,max)=>{
  const kind={kg:'lb',mm:'inchWidth','m²':'sqft','km/h':'mph',kW:'hp',Nm:'lbft','N·m':'lbft',m:/Strip/.test(label)?'ft':'in'}[unit];
  const shown={lb:'lb',inchWidth:'in',sqft:'ft²',mph:'mph',hp:'HP',lbft:'ft-lb',ft:'ft',in:'in'}[kind];
  return `${label}(${shown}) must be between ${toDisplay(Number(min),kind).toFixed(2)} and ${toDisplay(Number(max),kind).toFixed(2)}.`;
 }).replaceAll('1 km/h crossing','0.62 mph crossing').replaceAll('0.5 km/h','0.31 mph').replaceAll('5–30 km/h','3–19 mph');
}
if(typeof document!=='undefined')document.addEventListener('input',event=>{
 if(event.isTrusted&&event.target.dataset?.siDisplay){delete event.target.dataset.siText;delete event.target.dataset.siValue;}
},true);
