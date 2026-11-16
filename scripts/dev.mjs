import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname,join } from 'node:path';
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost:3000');
 if(url.pathname==='/api/token') {const {default:handler}=await import('../api/token.js');return handler(req,res);}
 if(url.pathname==='/api/room') {const {default:handler}=await import('../api/room.js');return handler(req,res);}
 const name=url.pathname==='/'||url.pathname==='/screen'?'/index.html':url.pathname==='/join'?'/join.html':url.pathname;
 const base=join(process.cwd(),'public');const path=join(base,name.replace(/^\//,''));
 if(!path.startsWith(base)||!existsSync(path)){res.writeHead(404);return res.end('Not found');}
 res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(readFileSync(path));
}).listen(3000,()=>console.log('Open http://localhost:3000'));
