import { createHmac, randomUUID } from 'node:crypto';
import {verifyHostProof} from './room.js';
function base64url(value){return Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');}
export function createAblyJwt(apiKey, room, role, clientId) {
  const [keyName,secret] = (apiKey||'').split(':');
  if(!keyName||!secret) throw new Error('Invalid server-side ABLY_API_KEY');
  if(!/^[A-Z2-9]{8}$/.test(room)) throw new Error('Invalid room');
  if(!['host','player'].includes(role)) throw new Error('Invalid role');
  const now=Math.floor(Date.now()/1000);
  const capability = role==='host'
    ? {[`party:${room}:state`]:['publish','subscribe'],[`party:${room}:inputs`]:['subscribe']}
    : {[`party:${room}:state`]:['subscribe'],[`party:${room}:inputs`]:['publish']};
  const head=base64url({alg:'HS256',typ:'JWT',kid:keyName});
  const body=base64url({iat:now,exp:now+3600, jti:randomUUID(),'x-ably-clientId':clientId,'x-ably-capability':JSON.stringify(capability)});
  const mac=createHmac('sha256',Buffer.from(secret,'utf8')).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${mac}`;
}
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.statusCode=405;return res.end('Method not allowed');}
 const url=new URL(req.url,'http://localhost');
 const room=(url.searchParams.get('room')||'').toUpperCase();const role=url.searchParams.get('role')||'';
 const id=(url.searchParams.get('id')||'').slice(0,80);
 if(!/^[A-Z2-9]{8}$/.test(room)||!['host','player'].includes(role)||!/^[a-zA-Z0-9_-]{8,80}$/.test(id)){
  res.statusCode=400;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:'Invalid room, role, or id'}));
 }
 if(!process.env.ABLY_API_KEY){res.statusCode=503;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:'ABLY_API_KEY is not configured in Vercel'}));}
 if(role==='host'&&!verifyHostProof(room,url.searchParams.get('hostKey'),process.env.ABLY_API_KEY)){res.statusCode=403;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:'Invalid host authorization'}));}
 try {const token=createAblyJwt(process.env.ABLY_API_KEY,room,role,id);res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({token}));}
 catch(err){res.statusCode=500;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({error:'Unable to sign token. Check API key format.'}));}
}
