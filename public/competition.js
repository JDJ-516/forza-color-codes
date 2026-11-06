export const median=values=>{const v=[...values].sort((a,b)=>a-b),i=Math.floor(v.length/2);return v.length%2?v[i]:(v[i-1]+v[i])/2;};
const contextKeys=['mode','event','car','className','conditions','assists','distance','launchControl'];
export function validateAttempt(row){
 if(!row||!['drag','track','drift'].includes(row.mode)||!Number.isFinite(row.value)||row.value<=0||row.value>1e9)throw new Error('Enter a positive result in seconds (Drag/Track) or points (Drift).');
 for(const key of ['event','car','className','conditions','assists','setup'])if(typeof row[key]!=='string'||!row[key].trim()||row[key].length>160)throw new Error('Fill in event, car, class, conditions, assists, and setup revision.');
 if(row.mode==='drag'&&(!Number.isFinite(row.distance)||row.distance<18.288||row.distance>5000||!['enabled','disabled','unknown'].includes(row.launchControl)))throw new Error('Record a valid drag distance and launch-control state.');
 if(typeof row.clean!=='boolean')throw new Error('Mark whether the attempt was clean.');
 return row;
}
export function contextMatches(a,b){return contextKeys.every(k=>a[k]===b[k]);}
export function summarizeAttempts(rows,context,target=null){
 const eligible=rows.filter(r=>{try{validateAttempt(r);return r.clean&&contextMatches(r,context);}catch{return false;}}),groups=new Map();
 for(const row of eligible){if(!groups.has(row.setup))groups.set(row.setup,[]);groups.get(row.setup).push(row.value);}
 const high=context.mode==='drift';
 return [...groups].map(([setup,values])=>{const middle=median(values);return {setup,count:values.length,best:high?Math.max(...values):Math.min(...values),median:middle,spread:Math.max(...values)-Math.min(...values),repeatable:values.length>=3,targetGap:Number.isFinite(target)&&target>0?(high?target-middle:middle-target):null};}).sort((a,b)=>high?b.median-a.median:a.median-b.median);
}
export function compareAttempts(groups,baseline,candidate,mode){
 const a=groups.find(g=>g.setup===baseline),b=groups.find(g=>g.setup===candidate);
 if(!a||!b||a===b||!a.repeatable||!b.repeatable)throw new Error('Compare two different revisions with at least three matching clean attempts each.');
 const improvement=mode==='drift'?b.median-a.median:a.median-b.median;
 return {improvement,overlapsSpread:Math.abs(improvement)<=Math.max(a.spread,b.spread)};
}
// Content identity prevents counting the exact same captured evidence as repeat runs.
// This is deduplication, not an authenticity signature or leaderboard validation.
export function captureKey(session){
 const text=JSON.stringify(session.samples);let a=2166136261,b=5381;
 for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
 return `${text.length}-${a>>>0}-${b>>>0}`;
}
