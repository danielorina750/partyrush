export const ROOM_PATTERN=/^[A-Z2-9]{8}$/;
export const phases=['lobby','choice','reveal','rush','results'];
export function getOddId(players){
 const votes=players.map(p=>p.vote);
 if(votes.some(v=>!['up','down'].includes(v)))return null;
 const ups=players.filter(p=>p.vote==='up'), downs=players.filter(p=>p.vote==='down');
 if(ups.length===1)return ups[0].id;
 if(downs.length===1)return downs[0].id;
 return null;
}
export function limitName(v){return String(v||'').trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,16)||'Player';}
export function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
export function makePlayer(id,name){return {id,name:limitName(name),score:0,vote:null,roundScore:0,run:0,arrived:false,taps:0,lastTap:0,lastFoot:null};}
export function updateAction(player,type,phase,oddId,now){
 if(phase!=='rush'||!['bite','left','right'].includes(type))return false;
 if(now-player.lastTap<125)return false;
 if(type==='bite'&&player.id!==oddId)return false;
 if(['left','right'].includes(type)&&player.id===oddId)return false;
 if(['left','right'].includes(type)&&player.run>=200)return false;
 if(['left','right'].includes(type)&&player.lastFoot===type)return false;
 player.lastTap=now;player.taps++;
 if(type==='bite')player.roundScore+=10;
 if(type==='left'||type==='right'){
  player.lastFoot=type;player.roundScore+=5;
  player.run=clamp(player.run+5,0,200);
  if(player.run===200&&!player.arrived){player.arrived=true;player.roundScore+=150;}
 }
 return true;
}
export function ranking(players){return [...players].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));}
