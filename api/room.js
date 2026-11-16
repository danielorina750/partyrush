import { randomBytes,createHmac,timingSafeEqual } from 'node:crypto';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function roomCode(){const buf=randomBytes(8);return [...buf].map(b=>alphabet[b%alphabet.length]).join('');}
function sign(room,nonce,key){return createHmac('sha256',key).update(`party-host:${room}:${nonce}`).digest('base64url');}
export function createHostProof(room,key){const nonce=randomBytes(20).toString('hex');return `${nonce}.${sign(room,nonce,key)}`;}
export function verifyHostProof(room,proof,key){if(typeof proof!=='string')return false;const [nonce,mac]=proof.split('.');if(!/^[a-f0-9]{40}$/.test(nonce||'')||!mac)return false;const expected=sign(room,nonce,key);const a=Buffer.from(mac);const b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);}
export default function handler(req,res){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 if(req.method!=='POST'){res.statusCode=405;return res.end(JSON.stringify({error:'Method not allowed'}));}
 if(!process.env.ABLY_API_KEY){res.statusCode=503;return res.end(JSON.stringify({error:'Configure ABLY_API_KEY in Vercel first.'}));}
 const room=roomCode();return res.end(JSON.stringify({room,hostKey:createHostProof(room,process.env.ABLY_API_KEY)}));}
