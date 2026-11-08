import {TELEMETRY_GROUPS,telemetryValue} from './telemetry-channels.js';
let cells=[];
function initialize(container){
 for(const group of TELEMETRY_GROUPS){
  const section=document.createElement('section'),heading=document.createElement('h4'),list=document.createElement('dl');
  section.className='telemetry-channel-group';heading.textContent=group.title;section.append(heading,list);
  for(const descriptor of group.fields){
   const row=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');
   label.textContent=descriptor.label;value.textContent='—';
   value.dataset.channel=descriptor.key+(descriptor.index===undefined?'':'.'+descriptor.index);
   row.append(label,value);list.append(row);cells.push({value,descriptor});
  }
  container.append(section);
 }
}
export function renderTelemetryChannels(data,fresh){
 const container=document.querySelector('#telemetry-channels'),status=document.querySelector('#telemetry-readings-status');
 if(!cells.length)initialize(container);
 const readings=Object.hasOwn(data,'readings')?data.readings:data.decodeError?null:data.latest;
 const state=data.state==='offline'?'offline':data.decodeError?'invalid':fresh?'live':readings?'stale':'waiting';
 container.dataset.status=state;
 status.textContent={live:'Live readings',invalid:'Unverified packet values · excluded from tuning',stale:'Last received values · signal lost',waiting:'Waiting for game',offline:'App disconnected · values unavailable'}[state];
 for(const {value,descriptor} of cells)value.textContent=telemetryValue(state==='offline'?null:readings,descriptor);
}
