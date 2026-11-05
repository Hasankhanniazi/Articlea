const PAGE_SIZE=30;
const cats=["All","World News","Sports","Entertainment","Technology","Gaming"];
let data=[],topic="All",query="",order="newest",currentCountry=window.articleaCountry||"GLOBAL";
let page=0,totalPages=0,archiveLoaded=false,loading=false,displayLimit=30,updatedAt="";
const $=id=>document.getElementById(id);
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function date(s){const d=new Date(s);return isNaN(d)?"Recently":d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}
function visibleData(){return data.filter(a=>!Array.isArray(a.regions)||a.regions.includes("GLOBAL")||a.regions.includes(currentCountry))}
const stopWords=new Set(["the","and","for","with","from","that","this","after","before","into","over","under","about","says","said","news","report","reports","latest","what","when","where","how","why","who","has","have","will","could","would","should","their","your","our","new","more","than","its","are","was","were","is","to","of","in","on","at","by","as","an","a"]);
function storyTokens(a){return (String(a.title||"").toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(w=>!stopWords.has(w))}
function groupRelatedStories(items){
 const groups=[],ordered=[...items].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
 for(const item of ordered){
  const tokens=storyTokens(item);let target=null;
  for(const group of groups){
   if(group.items.some(x=>x.publisher===item.publisher))continue;
   const age=Math.abs((Date.parse(item.publishedAt)||0)-(Date.parse(group.items[0].publishedAt)||0));
   if(age>48*3600000)continue;
   const shared=tokens.filter(w=>group.tokens.has(w)).length,score=shared/Math.max(1,Math.min(tokens.length,group.tokens.size));
   if(shared>=3&&score>=0.62){target=group;break}
  }
  if(target){target.items.push(item);for(const t of tokens)target.tokens.add(t)}
  else groups.push({items:[item],tokens:new Set(tokens)});
 }
 return groups;
}
function skeletonMarkup(count){return Array.from({length:count},()=>'<article class="card skeleton-card" aria-hidden="true"><div class="skeleton-thumb"></div><div class="skeleton-body"><i class="skeleton-line short"></i><i class="skeleton-line"></i><i class="skeleton-line medium"></i><i class="skeleton-line tiny"></i></div></article>').join("")}
function currentGroups(){
 let rows=visibleData().filter(a=>(topic==="All"||a.category===topic)&&[a.title,a.summary,a.publisher,a.category,a.subcategory].join(" ").toLowerCase().includes(query));
 rows.sort((a,b)=>(order==="newest"?-1:1)*((Date.parse(a.publishedAt)||0)-(Date.parse(b.publishedAt)||0)));
 return groupRelatedStories(rows);
}
function render(){
 const grouped=currentGroups(),shown=grouped.slice(0,displayLimit);
 $("cards").innerHTML=shown.map((group,index)=>{
  const a=group.items[0],sources=group.items;
  return `<article class="card"><a class="thumb story-link" href="article.html?url=${encodeURIComponent(a.url)}" aria-label="Preview: ${esc(a.title)}">${a.image?`<img src="${esc(a.image)}" alt="" width="640" height="360" loading="${index===0?"eager":"lazy"}" decoding="async" fetchpriority="${index===0?"high":"low"}" onerror="this.remove()">`:"A"}</a><div class="body"><div class="meta"><a class="pill" href="topic.html?category=${encodeURIComponent(a.category)}">${esc(a.category)}</a>${a.subcategory?`<a class="sub-pill" href="topic.html?category=${encodeURIComponent(a.category)}&subcategory=${encodeURIComponent(a.subcategory)}">${esc(a.subcategory)}</a>`:""}${date(a.publishedAt)}</div><h3><a class="story-link" href="article.html?url=${encodeURIComponent(a.url)}">${esc(a.title)}</a></h3><p>${esc(a.summary||"Open the preview to find the original story.")}</p><div class="bottom"><span class="publisher">${esc(a.publisher||"Publisher")}${sources.length>1?" + "+(sources.length-1):""}</span><a class="read" href="article.html?url=${encodeURIComponent(a.url)}">Read preview →</a></div></div></article>`;
 }).join("");
 $("count").textContent=`${shown.length} stories shown`;
 $("empty").hidden=shown.length>0;
 $("cards").hidden=shown.length===0;
 $("feed-title").textContent=topic==="All"?(query?"Search results":"Latest stories"):topic;
 $("status").textContent=updatedAt?`Feed last updated: ${date(updatedAt)}.`:"";
 const more=page<totalPages&&!archiveLoaded;
 $("load-more").hidden=!more;
 $("end-feed").hidden=more||loading||shown.length===0;
}
async function fetchNextPage(){
 if(loading||archiveLoaded||page>=totalPages)return false;
 loading=true;$("cards").insertAdjacentHTML("beforeend",skeletonMarkup(6));$("load-more-button").textContent="Loading…";
 try{
  const next=page+1,res=await fetch(`data/feed/page-${next}.json`,{cache:"no-cache"});
  if(!res.ok)throw Error("Page unavailable");
  const chunk=await res.json();data.push(...(Array.isArray(chunk.articles)?chunk.articles:[]));
  page=Number(chunk.page)||next;totalPages=Number(chunk.pages)||totalPages;updatedAt=chunk.updatedAt||updatedAt;return true;
 }catch{
  try{
   const res=await fetch("data/articles.json",{cache:"no-cache"});if(!res.ok)throw Error("Archive unavailable");
   const archive=await res.json();data=Array.isArray(archive.articles)?archive.articles:[];updatedAt=archive.updatedAt||updatedAt;archiveLoaded=true;page=totalPages;return true;
  }catch{$("status").textContent="We couldn't load more stories. Please check your connection and try again.";return false}
 }finally{loading=false;$("load-more-button").textContent="Load more stories";render()}
}
async function ensureItems(target){
 while(!archiveLoaded&&page<totalPages&&currentGroups().length<target){if(!await fetchNextPage())break}
}
async function loadArchive(){
 if(archiveLoaded)return;
 if(loading)await new Promise(resolve=>{const timer=setInterval(()=>{if(!loading){clearInterval(timer);resolve()}},80)});
 if(archiveLoaded)return;
 $("cards").innerHTML=skeletonMarkup(6);loading=true;
 try{
  const res=await fetch("data/articles.json",{cache:"no-cache"});if(!res.ok)throw Error();
  const archive=await res.json();data=Array.isArray(archive.articles)?archive.articles:[];updatedAt=archive.updatedAt||updatedAt;archiveLoaded=true;page=totalPages;
 }catch{$("status").textContent="Search is temporarily unavailable. Please try again."}
 finally{loading=false;render()}
}
async function load(){
 $("cards").innerHTML=skeletonMarkup(6);
 try{
  const res=await fetch("data/feed/page-1.json",{cache:"no-cache"});if(!res.ok)throw Error("First page not generated yet");
  const chunk=await res.json();data=Array.isArray(chunk.articles)?chunk.articles:[];page=Number(chunk.page)||1;totalPages=Number(chunk.pages)||1;updatedAt=chunk.updatedAt||"";
  render();await ensureItems(30);
 }catch{
  try{
   const res=await fetch("data/articles.json",{cache:"no-cache"});if(!res.ok)throw Error();
   const archive=await res.json();data=Array.isArray(archive.articles)?archive.articles:[];updatedAt=archive.updatedAt||"";archiveLoaded=true;page=totalPages;render();
  }catch{$("cards").innerHTML="";$("status").textContent="Article data is not available yet. Please try again shortly."}
 }
}
async function applyFilters(){
 displayLimit=30;render();
 if(query||order==="oldest"){await loadArchive();return}
 await ensureItems(30);render();
}
$("search").addEventListener("submit",e=>e.preventDefault());
$("q").addEventListener("input",async e=>{query=e.target.value.trim().toLowerCase();await applyFilters()});
$("sort").addEventListener("change",async e=>{order=e.target.value;await applyFilters()});
$("clear").addEventListener("click",async()=>{topic="All";query="";order="newest";$("q").value="";$("sort").value="newest";document.querySelectorAll(".topic").forEach(x=>x.classList.toggle("active",x.dataset.topic==="All"));displayLimit=30;render();await ensureItems(30);render()});
$("load-more-button").addEventListener("click",async()=>{displayLimit+=30;render();await ensureItems(displayLimit);render()});
$("year").textContent=new Date().getFullYear();
document.addEventListener("articlea:countrychange",async e=>{currentCountry=e.detail?.country||"GLOBAL";displayLimit=30;render();await ensureItems(30);render()});
if("IntersectionObserver"in window){
 const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)&&!loading&&page<totalPages&&!archiveLoaded){displayLimit+=30;render();ensureItems(displayLimit)}},{rootMargin:"700px"});
 observer.observe($("load-more"));
}
load();