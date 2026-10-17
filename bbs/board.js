(()=>{"use strict";
const $=id=>document.getElementById(id),cfg=window.BBS_CONFIG||{},api=String(cfg.apiBase||"").replace(/\/+$/,""),key=cfg.turnstileSitekey||"",ready=api.startsWith("https://")&&!!key;
let widget=null,token="";const tr=(ja,en)=>document.body.dataset.lang==="en"?en:ja,el=(tag,text,cls)=>{const x=document.createElement(tag);x.textContent=text;if(cls)x.className=cls;return x};
function language(l){document.body.dataset.lang=l;document.documentElement.lang=l;$("lang-toggle").textContent=l==="ja"?"EN":"JP";$("lang-toggle").setAttribute("aria-label",l==="ja"?"Switch to English":"日本語に切り替える");localStorage.setItem("site-language",l)}
language(localStorage.getItem("site-language")==="en"?"en":"ja");$("year").textContent=new Date().getFullYear();$("lang-toggle").onclick=()=>{language(document.body.dataset.lang==="ja"?"en":"ja");if(latestPosts)display(latestPosts)};
const status=s=>$("feedback").textContent=s,date=x=>new Date(x*1000).toLocaleString("ja-JP",{hour12:false});
let latestPosts=null;
function insertReplyReference(number){
  const input=$("post-body");
  const ref=">>"+number;
  const start=input.selectionStart, end=input.selectionEnd;
  const prefix=start>0&&input.value.charAt(start-1)!=="\n"?"\n":"";
  const suffix=end<input.value.length&&input.value.charAt(end)!=="\n"?"\n":"";
  const insertion=prefix+ref+"\n"+suffix;
  if(input.value.length-(end-start)+insertion.length>input.maxLength){
    status(tr("本文の文字数上限を超えます。","Message character limit exceeded."));return;
  }
  input.setRangeText(insertion,start,end,"end");
  input.dispatchEvent(new Event("input",{bubbles:true}));
  input.focus();
  input.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
}
function updateReplyOptions(posts){
  const select=$("reply-target");select.replaceChildren();
  const placeholder=el("option",tr("返信先を選択（任意）","Select reply target (optional)"));placeholder.value="";
  select.append(placeholder);
  for(const post of posts.slice(-100).reverse()){
    const option=el("option",">>"+post.number+"  "+(post.author||"名無しさん").slice(0,22));
    option.value=String(post.number);select.append(option);
  }
  select.disabled=posts.length===0;
  select.value="";
}
$("reply-target").addEventListener("change",e=>{
  const value=e.target.value;
  if(/^\d+$/.test(value))insertReplyReference(Number(value));
  e.target.value="";
});
async function call(path,options={}){const r=await fetch(api+path,options),data=await r.json();if(!r.ok)throw Error(data.error||"Request failed");return data}
function bodyContent(parent,content){
  const re=/>>([1-9]\d{0,5})/g;
  let idx=0,m;
  while((m=re.exec(content))){
    parent.append(document.createTextNode(content.slice(idx,m.index)));
    const a=el("a",m[0],"post-reference");
    a.href="#res-"+m[1];
    a.setAttribute("aria-label",tr("レス"+m[1]+"に移動","Go to post "+m[1]));
    parent.append(a);
    idx=re.lastIndex;
  }
  parent.append(document.createTextNode(content.slice(idx)));
}
function navigateToPost(number,addHistory=false,animate=true){
  if(!Number.isSafeInteger(number)||number<1)return;
  const target=$("res-"+number);
  if(!target){
    status(tr("レス "+number+" は現在表示されていません。","Post "+number+" is not currently available."));
    return;
  }
  if(addHistory&&location.hash!=="#res-"+number)history.pushState(null,"","#res-"+number);
  document.querySelectorAll(".post.is-referenced").forEach(node=>node.classList.remove("is-referenced"));
  target.classList.add("is-referenced");
  target.setAttribute("tabindex","-1");
  target.scrollIntoView({behavior:animate&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches?"smooth":"auto",block:"start"});
  target.focus({preventScroll:true});
}
function navigateFromHash(animate=false){
  const match=location.hash.match(/^#res-([1-9]\d{0,5})$/);
  if(match)navigateToPost(Number(match[1]),false,animate);
}
$("post-list").addEventListener("click",event=>{
  const anchor=event.target.closest("a.post-reference");
  if(!anchor)return;
  event.preventDefault();
  const match=anchor.getAttribute("href").match(/^#res-(\d+)$/);
  if(match)navigateToPost(Number(match[1]),true);
});
window.addEventListener("hashchange",()=>navigateFromHash(true));
window.addEventListener("popstate",()=>navigateFromHash(true));
function display(posts){
  latestPosts=posts;
  const list=$("post-list");list.replaceChildren();
  for(const p of posts){
    const a=el("article","","post");a.id="res-"+p.number;
    const h=el("div","","post-head");
    const replyButton=el("button",tr("↩ 返信","↩ Reply"),"post-quote");
    replyButton.type="button";
    replyButton.title=tr("レス "+p.number+" に返信","Reply to post "+p.number);
    replyButton.setAttribute("aria-label",replyButton.title);
    replyButton.onclick=()=>insertReplyReference(p.number);
    h.append(el("span",String(p.number),"post-number"),el("b",p.author||"名無しさん","post-author"),el("span",date(p.created_at),"post-date"),replyButton);
    const b=el("p","","post-body");bodyContent(b,p.body);
    a.append(h,b);list.append(a);
  }
  $("post-count").textContent=posts.length+" posts";
  updateReplyOptions(posts);
  if(location.hash.startsWith("#res-")){
    requestAnimationFrame(()=>navigateFromHash(false));
  }
}
async function refresh(){const data=await call("/api/posts");display(data.posts);$("connection-status").textContent=tr("● 投稿受付中","● Online");}
$("refresh-posts").onclick=()=>refresh().catch(e=>status(e.message));
$("post-body").oninput=()=>{$("char-counter").textContent=$("post-body").value.length};
function challenge(){window.bbsChallengeLoaded=()=>{widget=turnstile.render("#turnstile-container",{sitekey:key,callback:t=>{token=t;$("post-button").disabled=false},"expired-callback":()=>{token="";$("post-button").disabled=true},"error-callback":()=>{token="";$("post-button").disabled=true;status(tr("認証を読み込めませんでした。再読み込みしてください。","Verification failed to load. Refresh the page."))}})};const s=document.createElement("script");s.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=bbsChallengeLoaded";s.async=true;document.head.append(s)}
$("post-form").onsubmit=async e=>{e.preventDefault();if(!ready||!token)return;const form=e.target,fd=new FormData(form),payload={author:(fd.get("author")||"").trim()||"名無しさん",body:(fd.get("body")||"").trim(),website:fd.get("website"),turnstileToken:token};
 if(!payload.body)return;$("post-button").disabled=true;try{await call("/api/posts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});form.reset();$("char-counter").textContent="0";status(tr("投稿しました。","Posted."));await refresh()}catch(err){status(err.message)}finally{token="";if(window.turnstile&&widget!==null)turnstile.reset(widget)}};
if(!ready){$("connection-status").textContent=tr("● 接続情報を確認できません","● Connection details unavailable");status(tr("設定が読み込めません。ページを更新してください。","Could not load the site configuration. Refresh the page."));return}challenge();refresh().catch(e=>{$("connection-status").textContent="● 接続エラー";status(tr("投稿の取得に失敗しました：","Could not load posts: ")+e.message)});
})();