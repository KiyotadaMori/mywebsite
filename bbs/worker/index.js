const allowed=(req,env)=>req.headers.get("Origin")===env.PUBLIC_ORIGIN;
const send=(data,status=200,origin="")=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",...(origin?{"Access-Control-Allow-Origin":origin}:{}) ,"Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS"}});
async function check(token,env){if(!env.TURNSTILE_SECRET||!token)return false;const f=new FormData();f.set("secret",env.TURNSTILE_SECRET);f.set("response",token);const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:f});if(!r.ok)return false;const x=await r.json();return x.success===true&&x.hostname===env.ALLOWED_HOSTNAME}
async function quota(req,env,type){if(!env.RATE_LIMIT_SALT) return false;const enc=new TextEncoder();const key=await crypto.subtle.importKey("raw",enc.encode(env.RATE_LIMIT_SALT),"HMAC",{name:"HMAC",hash:"SHA-256"},false,["sign"]);const hour=Math.floor(Date.now()/3600000);const sig=await crypto.subtle.sign("HMAC",key,enc.encode((req.headers.get("cf-connecting-ip")||"unknown")+":"+hour+":"+type));const hash=Array.from(new Uint8Array(sig),v=>v.toString(16).padStart(2,"0")).join("");const result=await env.DB.prepare("INSERT INTO rate_limits (key,count) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count < ?").bind(hash,type==="thread"?3:20).run();return result.meta.changes>0}
const now=()=>Math.floor(Date.now()/1000);
export default {async fetch(req,env){
const path=new URL(req.url).pathname,origin=req.headers.get("Origin")||"",cors=allowed(req,env)?origin:"";
if(req.method==="OPTIONS")return allowed(req,env)?send({},200,cors):send({error:"Forbidden"},403);
if(origin&&!allowed(req,env))return send({error:"Forbidden"},403);
if(!env.DB)return send({error:"Database not configured"},503,cors);
try{
if(req.method==="GET"&&path==="/api/health")return send({ok:true},200,cors);
if(req.method==="GET"&&path==="/api/threads"){const x=await env.DB.prepare("SELECT t.id,t.title,t.created_at,t.last_activity,(SELECT author FROM posts WHERE thread_id=t.id AND number=1) author,(SELECT COUNT(*)-1 FROM posts WHERE thread_id=t.id AND deleted=0) reply_count FROM threads t WHERE deleted=0 ORDER BY last_activity DESC LIMIT 60").all();return send({threads:x.results},200,cors)}
const match=path.match(/^\/api\/threads\/([0-9a-f-]{36})$/i);
if(req.method==="GET"&&match){const t=await env.DB.prepare("SELECT * FROM threads WHERE id=? AND deleted=0").bind(match[1]).first();if(!t)return send({error:"Not found"},404,cors);const p=await env.DB.prepare("SELECT number,author,body,created_at FROM posts WHERE thread_id=? AND deleted=0 ORDER BY number LIMIT 1000").bind(match[1]).all();return send({thread:t,posts:p.results},200,cors)}
const isThread=req.method==="POST"&&path==="/api/threads";
const m=path.match(/^\/api\/threads\/([0-9a-f-]{36})\/posts$/i);
if(isThread||(req.method==="POST"&&m)){
if(!allowed(req,env))return send({error:"Forbidden"},403,cors);
if(Number(req.headers.get("Content-Length")||0)>14000)return send({error:"Too large"},413,cors);
const raw=await req.text();if(raw.length>12000)return send({error:"Too large"},413,cors);
const d=JSON.parse(raw);const title=String(d.title||"").trim(),body=String(d.body||"").trim(),author=String(d.author||"").trim()||"名無しさん";
if(d.website||!body||body.length>3000||author.length>32||(isThread&&(!title||title.length>100)))return send({error:"Invalid content"},400,cors);
if(!await check(d.turnstileToken,env))return send({error:"Verification failed"},403,cors);
if(!await quota(req,env,isThread?"thread":"reply"))return send({error:"Rate limit exceeded"},429,cors);
const stamp=now();
if(isThread){const id=crypto.randomUUID();await env.DB.batch([env.DB.prepare("INSERT INTO threads (id,title,created_at,last_activity) VALUES (?,?,?,?)").bind(id,title,stamp,stamp),env.DB.prepare("INSERT INTO posts (id,thread_id,number,author,body,created_at) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(),id,1,author,body,stamp)]);return send({thread_id:id},201,cors)}
const t=await env.DB.prepare("SELECT id FROM threads WHERE id=? AND deleted=0").bind(m[1]).first();if(!t)return send({error:"Thread not found"},404,cors);
const n=await env.DB.prepare("SELECT COALESCE(MAX(number),0)+1 n FROM posts WHERE thread_id=?").bind(m[1]).first();
await env.DB.batch([env.DB.prepare("INSERT INTO posts (id,thread_id,number,author,body,created_at) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(),m[1],n.n,author,body,stamp),env.DB.prepare("UPDATE threads SET last_activity=? WHERE id=?").bind(stamp,m[1])]);
return send({thread_id:m[1]},201,cors)
}
const del=path.match(/^\/api\/(threads|posts)\/([0-9a-f-]{36})$/i);
if(req.method==="DELETE"&&del){if(!env.ADMIN_TOKEN||req.headers.get("Authorization")!=="Bearer "+env.ADMIN_TOKEN)return send({error:"Unauthorized"},401,cors);await env.DB.prepare("UPDATE "+del[1]+" SET deleted=1 WHERE id=?").bind(del[2]).run();return send({ok:true},200,cors)}
return send({error:"Not found"},404,cors)
}catch(e){return send({error:"Server error"},500,cors)}
}};