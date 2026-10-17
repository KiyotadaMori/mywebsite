const now=()=>Math.floor(Date.now()/1000);
function json(data,status=200,origin=""){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization",...(origin?{"Access-Control-Allow-Origin":origin}:{})}})}
async function captcha(token,env){if(!env.TURNSTILE_SECRET||typeof token!=="string"||!token)return false;const f=new FormData();f.set("secret",env.TURNSTILE_SECRET);f.set("response",token);const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:f});if(!r.ok)return false;const v=await r.json();return v.success===true&&v.hostname===env.ALLOWED_HOSTNAME}
async function throttle(req,env){if(!env.RATE_LIMIT_SALT)return false;const enc=new TextEncoder(),k=await crypto.subtle.importKey("raw",enc.encode(env.RATE_LIMIT_SALT),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const bucket=Math.floor(Date.now()/3600000),ip=req.headers.get("cf-connecting-ip")||"unknown";const sig=await crypto.subtle.sign("HMAC",k,enc.encode(ip+"|"+bucket));const hash=Array.from(new Uint8Array(sig),n=>n.toString(16).padStart(2,"0")).join("");const r=await env.DB.prepare("INSERT INTO rate_limits(key,count) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<12").bind(hash).run();return(r.meta?.changes||0)>0}
export default{async fetch(req,env){const path=new URL(req.url).pathname,origin=req.headers.get("Origin")||"",ok=origin===env.PUBLIC_ORIGIN;const cors=ok?origin:"";
if(req.method==="OPTIONS")return ok?json({},200,cors):json({error:"Forbidden"},403);
if(origin&&!ok)return json({error:"Forbidden"},403);
if(!env.DB)return json({error:"Database not configured"},503,cors);
try{
if(req.method==="GET"&&path==="/api/health")return json({ok:true},200,cors);
if(req.method==="GET"&&path==="/api/posts"){const r=await env.DB.prepare("SELECT id,number,author,body,created_at FROM posts WHERE deleted=0 ORDER BY number DESC LIMIT 500").all();return json({posts:r.results.reverse()},200,cors)}
if(req.method==="POST"&&path==="/api/posts"){
if(!ok)return json({error:"Forbidden origin"},403,cors);
if(Number(req.headers.get("content-length")||0)>12000)return json({error:"Too large"},413,cors);
const txt=await req.text();if(txt.length>11000)return json({error:"Too large"},413,cors);
const p=JSON.parse(txt),body=String(p.body||"").trim(),author=String(p.author||"").trim()||"名無しさん";
if(p.website||!body||body.length>2000||author.length>32)return json({error:"Invalid post"},400,cors);
if(!(await captcha(p.turnstileToken,env)))return json({error:"Verification failed"},403,cors);
if(!(await throttle(req,env)))return json({error:"Posting limit reached"},429,cors);
const id=crypto.randomUUID(),time=now();
const result=await env.DB.prepare("INSERT INTO posts(id,number,author,body,created_at) VALUES(?,(SELECT COALESCE(MAX(number),0)+1 FROM posts),?,?,?)").bind(id,author,body,time).run();
if(!result.success)return json({error:"Post failed"},500,cors);
return json({ok:true,id},201,cors);
}
const del=path.match(/^\/api\/posts\/([a-f0-9-]{36})$/i);
if(req.method==="DELETE"&&del){if(!env.ADMIN_TOKEN||req.headers.get("Authorization")!=="Bearer "+env.ADMIN_TOKEN)return json({error:"Unauthorized"},401,cors);await env.DB.prepare("UPDATE posts SET deleted=1 WHERE id=?").bind(del[1]).run();return json({ok:true},200,cors)}
return json({error:"Not found"},404,cors)
}catch(e){return json({error:"Service error"},500,cors)}
}};