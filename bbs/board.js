(()=>{
"use strict";
const $=id=>document.getElementById(id),cfg=window.BBS_CONFIG||{},api=(cfg.apiBase||"").replace(/\/$/,""),key=cfg.turnstileSitekey||"";
const ready=api.startsWith("https://")&&!!key;
let current=null;
const tr=(ja,en)=>document.body.dataset.lang==="en"?en:ja;
const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e};
function language(lang){document.body.dataset.lang=lang;document.documentElement.lang=lang;$("lang-toggle").textContent=lang==="ja"?"EN":"JP";localStorage.setItem("site-language",lang)}
language(localStorage.getItem("site-language")==="en"?"en":"ja");
$("lang-toggle").onclick=()=>language(document.body.dataset.lang==="ja"?"en":"ja");
function message(s){$("feedback").textContent=s}
async function call(path,options={}){const response=await fetch(api+path,options);const data=await response.json();if(!response.ok)throw Error(data.error||"Request failed");return data}
function date(sec){return new Date(sec*1000).toLocaleString(document.body.dataset.lang==="en"?"en-US":"ja-JP")}
function show(detail){$("list-view").hidden=detail;$("detail-view").hidden=!detail}
async function threads(){
 if(!ready)return;
 const data=await call("/api/threads");const container=$("threads");container.replaceChildren();
 if(!data.threads.length){container.append(text("p",tr("まだスレッドはありません。","No threads yet."),"empty"));return}
 data.threads.forEach((t,i)=>{
 const b=text("button","","thread");b.type="button";
 b.append(text("span",String(i+1).padStart(2,"0"),"thread-num"));
 const main=text("span","","thread-main");main.append(text("span",t.title,"thread-title"),text("span",date(t.last_activity)+" · "+t.author,"thread-meta"));
 b.append(main,text("span",tr("返信 ","Replies ")+t.reply_count,"thread-replies"));b.onclick=()=>open(t.id);container.append(b)
 })
}
async function open(id){
 current=id;show(true);history.replaceState(null,"","?thread="+encodeURIComponent(id));
 const d=await call("/api/threads/"+id);$("thread-title").textContent=d.thread.title;$("thread-meta").textContent=date(d.thread.created_at);
 $("posts").replaceChildren();d.posts.forEach((p,i)=>{
 const a=text("article","","post"),head=text("div","","post-meta");
 head.append(text("span",String(i+1)),text("span",p.author,"post-name"),text("span",date(p.created_at)));
 a.append(head,text("p",p.body,"post-message"));$("posts").append(a)
 })
}
$("back").onclick=async()=>{show(false);current=null;history.replaceState(null,"",location.pathname);await threads()};
$("refresh").onclick=()=>threads().catch(e=>message(e.message));
const tokens={thread:"",reply:""};
function initChallenge(){
 window.bbsChallengeLoaded=()=>{for(const type of ["thread","reply"]){
 turnstile.render("#"+type+"-turnstile",{sitekey:key,callback:token=>{tokens[type]=token;$(type+"-submit").disabled=false},"expired-callback":()=>{tokens[type]="";$(type+"-submit").disabled=true}});
 }};
 const s=document.createElement("script");s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=bbsChallengeLoaded";s.async=true;document.head.appendChild(s)
}
async function post(ev,type){
 ev.preventDefault();const form=ev.target,fd=new FormData(form);
 if(!ready||!tokens[type])return;
 const data={title:(fd.get("title")||"").trim(),author:(fd.get("author")||"").trim()||"名無しさん",body:(fd.get("body")||"").trim(),website:fd.get("website")||"",turnstileToken:tokens[type]};
 if(!data.body)return;
 $(type+"-submit").disabled=true;
 try{
 const path=type==="thread"?"/api/threads":"/api/threads/"+current+"/posts";
 const r=await call(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
 form.reset();const id=type==="thread"?r.thread_id:current;await open(id);message(tr("投稿しました。","Posted."));
 }catch(e){message(e.message)}finally{tokens[type]="";if(window.turnstile)turnstile.reset();$(type+"-submit").disabled=true}
}
$("thread-form").onsubmit=e=>post(e,"thread");$("reply-form").onsubmit=e=>post(e,"reply");
if(!ready){$("setup").hidden=false;$("status").textContent=tr("● 公開準備中","● Setup required");$("threads").replaceChildren(text("p",tr("投稿サーバーの設定が必要です。","Backend setup required."),"empty"));return}
initChallenge();call("/api/health").then(async()=>{$("status").textContent=tr("● 匿名投稿可能","● Anonymous posting enabled");const id=new URLSearchParams(location.search).get("thread");if(id&&/^[0-9a-f-]{36}$/i.test(id))await open(id);else await threads()}).catch(e=>message(e.message));
})();