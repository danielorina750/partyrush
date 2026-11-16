import {getOddId,makePlayer,updateAction,ranking} from './logic.js';
const $=id=>document.getElementById(id);
const themes={lobby:1,choice:1,reveal:2,rush:3,results:4};
let mode='cocktail',room='',hostKey='',client=null,inputChannel=null,stateChannel=null,players=[],phase='lobby',round=0,oddId=null,deadline=0,demo=false,attempt=0,toastTimer=null,renderKey='',lastSecond=0,sound=true;
const faces=['😎','🤩','😈','🥳','🤠','😻','😎','🤖'];
const me=crypto.randomUUID().replaceAll('-','').slice(0,14);
const html=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function toast(t){$('toast').textContent=t;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3500);}
function beep(freq=500,duration=.12){if(!sound)return;try{const C=window.AudioContext||window.webkitAudioContext;const ac=new C(),o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=.045;o.connect(g);g.connect(ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);o.stop(ac.currentTime+duration);setTimeout(()=>ac.close(),500);}catch{}}
function roomLink(){return `${location.origin}/join?room=${encodeURIComponent(room)}`;}
function showQR(){if(demo){toast('Demo is local only. Create an online room to pair phones.');return;}if(!room)return;const z=$('qrCanvas');z.replaceChildren();if(window.QRCode){new window.QRCode(z,{text:roomLink(),width:192,height:192,colorDark:'#140a2a',colorLight:'#ffffff'});}else{const a=document.createElement('a');a.href=roomLink();a.textContent='Open invite link';z.append(a);}$('qrRoom').textContent=room;$('qrOverlay').classList.remove('hidden');}
function persist(){sessionStorage.setItem('oddHost',JSON.stringify({room,hostKey}));}
async function token(){const url=`/api/token?room=${room}&role=host&id=${me}&hostKey=${encodeURIComponent(hostKey)}`;const r=await fetch(url,{cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Token service HTTP ${r.status}`);return data.token;}
async function connect(){if(!window.Ably)throw new Error('Ably script failed to load. Check connection or blockers.');await token();client=new Ably.Realtime({authCallback:async(_p,cb)=>{try{cb(null,await token());}catch(e){cb(e,null);}},autoConnect:true});
 client.connection.on('connected',()=>{$('connectBadge').textContent='● LIVE MULTIPLAYER';$('connectBadge').classList.add('online');toast('Party room connected. Invite your friends!');});
 client.connection.on('failed',change=>{toast('Connection failed: '+(change.reason?.message||'check API key permissions'));$('connectBadge').textContent='● CONNECTION FAILED';});
 client.connection.on('disconnected',()=>{$('connectBadge').textContent='● RECONNECTING';});
 inputChannel=client.channels.get(`party:${room}:inputs`);stateChannel=client.channels.get(`party:${room}:state`);
 await inputChannel.subscribe('input',message=>handleInput(message.data)); await stateChannel.attach();broadcast();}
async function makeRoom(){try{const r=await fetch('/api/room',{method:'POST'}),d=await r.json();if(!r.ok)throw new Error(d.error||'Cannot create room');room=d.room;hostKey=d.hostKey;persist();$('createRoom').disabled=true;await connect();enterLobby();showQR();}catch(e){toast(e.message);$('createRoom').disabled=false;}}
function enterLobby(){phase='lobby';$('roomTools').classList.remove('hidden');$('roomLabel').textContent=room||'DEMO';$('nextRound').classList.remove('hidden');$('nextRound').textContent='START ROUND →';render(true);broadcast();}
function handleInput(d){if(!d||typeof d!=='object'||!['join','vote','action','sync'].includes(d.type))return;
 if(!/^[a-z0-9_-]{8,80}$/i.test(String(d.id||'')))return;
 if(d.type==='join'){
  let p=players.find(x=>x.id===d.id);
  if(!p){if(phase!=='lobby'&&phase!=='results')return;if(players.length>=12){toast('Maximum 12 players');return;}p=makePlayer(d.id,d.name);players.push(p);beep(630);toast(`${p.name} joined!`);}else p.name=String(d.name||p.name).slice(0,16);
  broadcast();render(true);return;
 }
 if(d.type==='sync'){broadcast();return;}
 const p=players.find(x=>x.id===d.id);if(!p)return;
 if(d.type==='vote'&&phase==='choice'&&!p.vote&&['up','down'].includes(d.value)){
  p.vote=d.value;beep(490);render();broadcast();
  if(players.length>=3&&players.every(x=>x.vote))setTimeout(resolveChoice,650);
 }
 if(d.type==='action'&&updateAction(p,d.action,phase,oddId,Date.now())){if(p.arrived&&p.run===200)beep(760);render();broadcast();if(phase==='rush'&&players.filter(x=>x.id!==oddId).every(x=>x.arrived))finishRound();}
}
function addDemo(){demo=true;room='DEMO2026';$('showQR').classList.add('hidden');$('copyJoin').classList.add('hidden');players=['Zuri','Kevin','Nia','Brian'].map((n,i)=>makePlayer(`demo_${i+1}000`,n));$('connectBadge').textContent='● LOCAL DEMO';enterLobby();toast('Demo mode: virtual players will compete automatically');}
function startRound(){if(players.length<3){toast('At least 3 players required. Use demo for an instant preview.');return;}
 round++;attempt=0;players.forEach(p=>{p.vote=null;p.roundScore=0;p.run=0;p.arrived=false;p.taps=0;p.lastTap=0;p.lastFoot=null;});phase='choice';oddId=null;deadline=Date.now()+10000;
 $('nextRound').classList.add('hidden');beep(840);render(true);broadcast();}
function resolveChoice(){if(phase!=='choice')return;const incomplete=players.some(x=>!x.vote);if(incomplete){if(Date.now()<deadline)return;}
 let unique=null;if(!incomplete)unique=getOddId(players);
 if(unique){oddId=unique;phase='reveal';deadline=Date.now()+3000;beep(1000,.3);render(true);broadcast();return;}
 attempt++;phase='reveal';oddId=null;deadline=Date.now()+2500;render(true);broadcast();}
function startRush(){if(phase!=='reveal')return;if(!oddId){phase='choice';players.forEach(p=>p.vote=null);deadline=Date.now()+9000;render(true);broadcast();return;}
 phase='rush';deadline=Date.now()+30000;render(true);broadcast();beep(680,.25);}
function finishRound(){if(phase!=='rush')return;phase='results';deadline=0;for(const p of players)p.score+=p.roundScore;beep(980,.4);$('nextRound').classList.remove('hidden');$('nextRound').textContent='NEXT ROUND →';render(true);broadcast();}
function snapshot(){return {version:1,phase,round,room,oddId,deadline,attempt,mode,players:players.map(p=>({id:p.id,name:p.name,score:p.score,vote:phase==='choice'?null:p.vote,voted:!!p.vote,roundScore:p.roundScore,run:p.run,arrived:p.arrived,taps:p.taps})),time:Date.now()};}
let lastBroadcast=0;function broadcast(){if(demo||!stateChannel)return;lastBroadcast=Date.now();stateChannel.publish('state',snapshot()).catch(e=>console.warn('Broadcast failed:',e));}
function render(force=false){const key=phase+':'+round+':'+attempt+':'+players.length+':'+oddId;if(key!==renderKey||force){renderKey=key;$('arenaBg').style.backgroundImage=`url('/assets/scene${themes[phase]}.webp')`;}
 const tag={lobby:'WELCOME TO THE PARTY',choice:'SECRET HANDS • ROUND '+round,reveal:'THE BIG REVEAL',rush:'THE RUSH IS ON!',results:'THE PARTY LEADERBOARD'};
 const titles={lobby:'WHO\'S THE <span>ODD ONE?</span>',choice:'UP OR <span>DOWN?</span>',reveal:oddId?'ODD ONE <span>OUT!</span>':'NO ODD <span>PLAYER!</span>',rush:'RACE VS <span>THE FEAST!</span>',results:'ROUND <span>COMPLETE!</span>'};
 const desc={lobby:'Connect your phones. One player gets the feast, everyone else runs!',choice:'Players are choosing secretly. Pick UP or DOWN on your phones!',reveal:oddId?'One player collects virtual food. Everyone else races to stop them!':'Tie or missing choices — get ready to vote again.',rush:mode==='cocktail'?'Mix virtual cocktails before runners reach the target and return!':'Collect virtual food before runners reach the target and return!',results:'The champion is whoever scores the most across the party.'};
 $('phaseTag').textContent=tag[phase];$('headline').innerHTML=titles[phase];$('subtitle').textContent=desc[phase];
 const center=$('stageCenter');if(phase==='lobby')center.innerHTML=`<div class="game-panel"><div class="phase-icon">🎮</div><h2>THE LOBBY IS OPEN</h2><p>${players.length} player${players.length===1?'':'s'} joined. Scan the QR code on the main screen to enter the party.</p><div class="players-count">${players.length>=3?'✅ READY TO START':'At least 3 players required'}</div><div class="lobby-actions" style="justify-content:center"><button id="lobbyInvite" class="btn secondary">SHOW QR CODE ◻</button><button id="modeToggle" class="btn secondary">${mode==='cocktail'?'🍹 COCKTAIL MODE':'🍕 FOOD MODE'} ↻</button></div></div>`;
 if(phase==='choice')center.innerHTML=`<div class="game-panel"><div class="phase-icon">🙌</div><h2>EVERYONE, MAKE YOUR PICK!</h2><p>All answers stay hidden until the reveal.</p><div class="activity-list"><div class="activity"><small>CHOICES RECEIVED</small><strong>${players.filter(p=>p.vote).length} / ${players.length}</strong></div><div class="activity"><small>VOTE CLOSES IN</small><strong id="clock">${Math.max(0,Math.ceil((deadline-Date.now())/1000))}s</strong></div></div></div>`;
 if(phase==='reveal')center.innerHTML=`<div class="game-panel"><div class="phase-icon">${oddId?'👑':'🔁'}</div><h2>${oddId?html(players.find(p=>p.id===oddId)?.name||'Someone')+' IS THE ODD ONE!':'ALL SAME / NO UNIQUE PICK'}</h2><div class="choice-chips">${players.map(p=>`<div class="choice-chip ${p.vote||''}"><span class="big">${p.vote==='up'?'🙌':p.vote==='down'?'👇':'❓'}</span>${html(p.name)}<br>${p.vote||'NO VOTE'}</div>`).join('')}</div><p>${oddId?'FOOD RUSH STARTS NOW':'New countdown incoming…'}</p></div>`;
 if(phase==='rush')center.innerHTML=`<div class="game-panel"><div class="phase-icon">${mode==='cocktail'?'🍹':'🍕'} 🏃</div><h2>${html(players.find(p=>p.id===oddId)?.name||'ODD')} vs THE RUNNERS</h2><div class="timer" id="clock">${Math.max(0,Math.ceil((deadline-Date.now())/1000))}s</div><div class="activity-list">${players.map(p=>`<div class="activity"><small>${html(p.name)} ${p.id===oddId?(mode==='cocktail'?'🍹 MIX':'🍕 FEAST'):'🏃 RUN'}</small><strong>${p.id===oddId?p.roundScore+' PTS':p.run+' / 200'}</strong></div>`).join('')}</div></div>`;
 if(phase==='results'){const sorted=ranking(players);center.innerHTML=`<div class="game-panel"><div class="phase-icon">🏆</div><h2>${html(sorted[0]?.name||'THE PARTY')} LEADS THE PARTY!</h2><div class="activity-list">${sorted.slice(0,6).map((p,i)=>`<div class="activity"><small>#${i+1} ${html(p.name)}</small><strong>${p.score} PTS</strong></div>`).join('')}</div><p>Round ${round} completed. Keep going for the party crown.</p></div>`;}
 $('scoreStrip').innerHTML=ranking(players).map((p,i)=>`<div class="player-tile"><span class="face">${faces[i%faces.length]}</span><div><strong>${html(p.name)}</strong><small>${p.score} PTS</small></div></div>`).join('');
 const invite=$('lobbyInvite');if(invite)invite.addEventListener('click',showQR);const toggle=$('modeToggle');if(toggle)toggle.addEventListener('click',()=>{mode=mode==='cocktail'?'food':'cocktail';render(true);broadcast();});
}
function updateTicks(){const now=Date.now();if(phase==='choice'&&now>=deadline)resolveChoice();if(phase==='reveal'&&now>=deadline)startRush();if(phase==='rush'&&now>=deadline)finishRound();
 if(phase==='choice'||phase==='rush'){const remaining=Math.max(0,Math.ceil((deadline-now)/1000));if(lastSecond!==remaining){lastSecond=remaining;const c=$('clock');if(c)c.textContent=remaining+'s';if(remaining<=3&&remaining>0)beep(480+remaining*70,.08);}}
 if(demo){if(phase==='choice'&&now>deadline-8000){players.forEach((p,i)=>{if(!p.vote)p.vote=attempt%2===0?(i===0?'up':'down'):(i===1?'down':'up');});resolveChoice();}if(phase==='rush'){for(const p of players){if(p.id===oddId){if(Math.random()<.8)updateAction(p,'bite',phase,oddId,now);}else updateAction(p,p.lastFoot==='left'?'right':'left',phase,oddId,now);}if(players.filter(p=>p.id!==oddId).every(p=>p.arrived))finishRound();else render();}}
 if(!demo&&now-lastBroadcast>2500&&room&&stateChannel)broadcast();}
function sparks(){for(let i=0;i<24;i++){const s=document.createElement('span');s.className='spark';s.style.left=Math.random()*100+'%';s.style.animationDelay=-Math.random()*5+'s';s.style.animationDuration=3+Math.random()*6+'s';$('particles').append(s);}}
$('createRoom').addEventListener('click',makeRoom);$('demo').addEventListener('click',addDemo);$('showQR').addEventListener('click',showQR);$('qrClose').addEventListener('click',()=>$('qrOverlay').classList.add('hidden'));$('nextRound').addEventListener('click',startRound);
$('copyJoin').addEventListener('click',()=>navigator.clipboard.writeText(roomLink()).then(()=>toast('Join link copied')).catch(()=>toast(roomLink())));$('qrCopy').addEventListener('click',()=>navigator.clipboard.writeText(roomLink()).then(()=>toast('Invite copied')).catch(()=>toast(roomLink())));
$('fullscreen').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>toast('Fullscreen is unavailable'));});$('soundToggle').addEventListener('click',()=>{sound=!sound;$('soundToggle').style.opacity=sound?1:.35;});
window.addEventListener('beforeunload',()=>{client?.close();});setInterval(updateTicks,180);sparks();render();
let saved=null;try{saved=JSON.parse(sessionStorage.getItem('oddHost')||'null');}catch{sessionStorage.removeItem('oddHost');}if(saved?.room&&saved?.hostKey){room=saved.room;hostKey=saved.hostKey;connect().then(()=>enterLobby()).catch(e=>toast('Previous room unavailable: '+e.message));}
