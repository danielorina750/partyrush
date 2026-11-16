const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),storedName=localStorage.getItem('odd_name')||'';
let room=(params.get('room')||'').toUpperCase(),name='',id=sessionStorage.getItem('odd_player_id')||crypto.randomUUID().replaceAll('-','').slice(0,16),client=null,inputChannel=null,stateChannel=null,state=null,lastPhase='',lastRound=-1,lastVote=false,lastTap=0;
sessionStorage.setItem('odd_player_id',id);$('roomInput').value=room;$('nameInput').value=storedName;
const html=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const nick=x=>String(x).trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,16);
function status(txt,online){$('phoneStatus').textContent='● '+txt;$('phoneStatus').classList.toggle('online',online);$('latency').textContent=txt;}
function error(txt){$('joinError').textContent=txt;status('ERROR',false);}
function buzz(ms=20){if(navigator.vibrate)navigator.vibrate(ms);}
async function token(){const r=await fetch(`/api/token?room=${room}&role=player&id=${id}`,{cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Authentication error ${r.status}`);return data.token;}
async function send(data){if(!inputChannel)return;try{await inputChannel.publish('input',{...data,id});}catch(e){$('phoneFeedback').textContent='Connection issue: '+e.message;}}
async function connect(){room=$('roomInput').value.trim().toUpperCase();name=nick($('nameInput').value);
 if(!/^[A-Z2-9]{8}$/.test(room))return error('Enter a valid 8-character room code.');if(!name)return error('Enter a nickname to join.');if(!window.Ably)return error('Could not load Ably. Check your internet connection.');
 $('joinBtn').disabled=true;status('CONNECTING',false);
 try{await token();client=new Ably.Realtime({authCallback:async(_p,cb)=>{try{cb(null,await token());}catch(e){cb(e,null);}}});
 client.connection.on('connected',async()=>{status('CONNECTED',true);await send({type:'join',name});await send({type:'sync'});});
 client.connection.on('disconnected',()=>status('RECONNECTING',false));
 client.connection.on('failed',change=>{status('FAILED',false);$('phoneFeedback').textContent='Connection failed: '+(change.reason?.message||'Check Ably key and room');});
 inputChannel=client.channels.get(`party:${room}:inputs`);stateChannel=client.channels.get(`party:${room}:state`);
 await stateChannel.subscribe('state',message=>receive(message.data));await inputChannel.attach();
 $('joinPanel').classList.add('hidden');$('playPanel').classList.remove('hidden');$('playerName').textContent=name;$('playerRoom').textContent=room;
 localStorage.setItem('odd_name',name);history.replaceState({},'',`/join?room=${room}`);await send({type:'join',name});await send({type:'sync'});}
 catch(e){error('Unable to connect: '+e.message);$('joinBtn').disabled=false;client?.close();}}
function button(label,glyph,cls,fn,disabled=false){const b=document.createElement('button');b.className='control-btn '+cls;b.disabled=disabled;const span=document.createElement('span');span.className='glyph';span.textContent=glyph;b.append(span,document.createTextNode(label));b.addEventListener('click',fn);return b;}
async function vote(v){if(lastVote||state?.phase!=='choice')return;lastVote=true;const panel=$('phoneButtons');for(const b of panel.querySelectorAll('button'))b.disabled=true;$('phoneFeedback').textContent='Choice sent! Waiting for the reveal…';buzz(30);await send({type:'vote',value:v});}
function action(type){if(state?.phase!=='rush')return;const now=Date.now();if(now-lastTap<130)return;lastTap=now;send({type:'action',action:type});buzz(8);}
function receive(s){if(!s||s.room!==room||!Array.isArray(s.players))return;
 state=s;const self=s.players.find(p=>p.id===id);const change=lastPhase!==s.phase||lastRound!==s.round;
 if(change){lastPhase=s.phase;lastRound=s.round;lastVote=!!self?.voted;renderControls(self);buzz(60);}
 else if(s.phase==='choice'&&self?.voted&&!lastVote){lastVote=true;renderControls(self);}
 updateStats(self);}
function renderControls(self){const s=state,box=$('phoneButtons');box.replaceChildren();const titles={lobby:['YOU\'RE IN!','Wait for the host to start the round.'],choice:['UP OR DOWN?','Make your secret choice before the timer ends.'],reveal:[s.oddId?(s.oddId===id?'YOU ARE THE ODD ONE!':'RUNNER MODE!'):'NO ODD ONE!','Look at the TV for the reveal.'],rush:[s.oddId===id?(s.mode==='cocktail'?'MIX VIRTUAL COCKTAILS!':'COLLECT THE FEAST!'):'RUN AND RETURN!',s.oddId===id?(s.mode==='cocktail'?'Tap to mix virtual cocktails for points.':'Tap to collect virtual food points.'):'Alternate LEFT and RIGHT steps to reach the checkpoint and return.'],results:['ROUND COMPLETE!','Check the TV leaderboard. Next round coming soon.']};
 $('phonePhase').textContent=`ROUND ${s.round} • ${s.phase.toUpperCase()}`;$('phoneHeadline').textContent=titles[s.phase]?.[0]||'PLAY';$('phoneInstructions').textContent=titles[s.phase]?.[1]||'';
 $('progressWrap').classList.toggle('hidden',s.phase!=='rush');$('phoneFeedback').textContent='';
 if(s.phase==='choice'){box.append(button('HANDS UP','🙌','up',()=>vote('up'),lastVote),button('HANDS DOWN','👇','down',()=>vote('down'),lastVote));if(lastVote)$('phoneFeedback').textContent='Your choice is locked in.';}
 else if(s.phase==='rush'&&s.oddId===id){box.append(button(s.mode==='cocktail'?'MIX COCKTAIL':'COLLECT FOOD',s.mode==='cocktail'?'🍹':'🍕','tap',()=>action('bite')));}
 else if(s.phase==='rush'){box.append(button('LEFT STEP','👟','down',()=>action('left'),!!self?.arrived),button('RIGHT STEP','👟','up',()=>action('right'),!!self?.arrived));}
 else{const text=document.createElement('div');text.style.cssText='grid-column:1/-1;text-align:center;align-self:center;font-size:75px;';text.textContent=s.phase==='results'?'🏆':s.phase==='reveal'?'🎉':'🎮';box.append(text);}
}
function updateStats(self){if(!state)return;const s=state;if(s.phase==='choice'){
 const rem=Math.max(0,Math.ceil((s.deadline-Date.now())/1000));$('phoneInstructions').textContent=`Choose before the countdown ends · ${rem}s remaining`;}
 if(s.phase==='rush'){
 const eating=s.oddId===id;const progress=eating?Math.min(100,(self?.roundScore||0)/4):(self?.run||0)/2;
 $('progressFill').style.width=progress+'%';$('progressLabel').textContent=eating?(s.mode==='cocktail'?'COCKTAIL POINTS':'FOOD POINTS'):'CHECKPOINT + RETURN';$('progressValue').textContent=eating?`${self?.roundScore||0} PTS`:`${Math.floor(progress)}%`;
 if(!eating&&self?.arrived){$('phoneFeedback').textContent='YOU MADE IT BACK! 🎉';for(const b of $('phoneButtons').querySelectorAll('button'))b.disabled=true;}
 }
 if(s.phase==='results'&&self){$('phoneFeedback').textContent=`Your total: ${self.score} points`;}}
$('joinBtn').addEventListener('click',connect);$('nameInput').addEventListener('keydown',e=>{if(e.key==='Enter')connect();});$('roomInput').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase());
setInterval(()=>{if(state?.phase==='choice')updateStats(state.players.find(p=>p.id===id));},1000);
window.addEventListener('pageshow',()=>{if(client?.connection.state==='connected')send({type:'join',name});});
