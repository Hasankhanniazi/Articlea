import fs from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:"@_",textNodeName:"#text",processEntities:false});
const cfg=JSON.parse(await fs.readFile("sources.json","utf8"));
const path="data/articles.json";
const old=JSON.parse(await fs.readFile(path,"utf8").catch(()=>'{"articles":[]}'));

const arr=v=>v==null?[]:Array.isArray(v)?v:[v];
const str=v=>typeof v==="string"?v:v&&typeof v==="object"?String(v["#text"]||""):"";
const clean=v=>{let value=str(v);const decode=s=>s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|ldquo|rdquo|ndash|mdash|hellip);/gi,(match,entity)=>{const key=entity.toLowerCase();if(key==="amp")return "&";if(key==="lt")return "<";if(key==="gt")return ">";if(key==="quot")return '"';if(key==="apos")return "'";if(key==="rsquo")return "’";if(key==="lsquo")return "‘";if(key==="ldquo")return "“";if(key==="rdquo")return "”";if(key==="ndash")return "–";if(key==="mdash")return "—";if(key==="hellip")return "…";if(key==="nbsp")return " ";try{return key.startsWith("#x")?String.fromCodePoint(parseInt(key.slice(2),16)):key.startsWith("#")?String.fromCodePoint(parseInt(key.slice(1),10)):match}catch{return " "}});for(let i=0;i<2;i++)value=decode(value);value=value.replace(/<!--[\s\S]*?-->/g," ").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ");value=decode(value);return value.replace(/<[^>]*>/g," ").replace(/https?:\/\/[^\s]+/gi," ").replace(/\s+/g," ").trim()};
const url=v=>{try{let raw=str(v).replace(/&amp;amp;/g,"&").replace(/&amp;/g,"&").replace(/&#38;|&#x26;/gi,"&").trim();let u=new URL(raw);if(!["http:","https:"].includes(u.protocol))return "";u.hash="";for(const key of [...u.searchParams.keys()])if(/^(at_medium|at_campaign|utm_.+|fbclid|gclid|ref|source)$/i.test(key))u.searchParams.delete(key);return u.href}catch{return ""}};
const titleKey=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const map=new Map();
for(const a of (old.articles||[])){const canonical=url(a.url);if(!canonical)continue;const key=canonical;const prev=map.get(key);if(!prev||Date.parse(a.publishedAt)>Date.parse(prev.publishedAt))map.set(key,{...a,url:canonical,image:/no-image|placeholder|badge|google-play|app-store|play-store|apple\.png|android\.png|logo|favicon|sprite|avatar|banner/i.test(a.image||"")?null:a.image});}
const imageUrl=v=>{let u=url(v);if(!u||/no-image|placeholder|badge|google-play|app-store|play-store|apple\.png|android\.png|logo|favicon|sprite|avatar|banner/i.test(u))return null;try{const p=new URL(u);if(p.hostname==="ichef.bbci.co.uk"){p.pathname=p.pathname.replace(/\/ace\/([^/]+)\/(?:240|320|480|640)\//,"/ace/$1/1024/");p.pathname=p.pathname.replace(/\/images\/ic\/(?:240x135|320x180|480x270)\//,"/images/ic/1024x576/");}return p.href}catch{return u}};

// Classify each story from its own headline, summary and URL, not just its publisher.
const CATEGORY_RULES={
 "World News":[
  [/\bpolitic(?:s|al)\b|\belection(?:s)?\b|\bgovernment\b|\bparliament\b|\bpresident\b|\bprime minister\b|\bcongress\b|\bsenate\b|\bminister\b|\bprotest(?:s|ers)?\b/gi,4],
  [/\bbusiness\b|\beconom(?:y|ic|ics)\b|\bcompany\b|\bcompanies\b|\bmarket(?:s)?\b|\bstock(?:s)?\b|\btrade\b|\binflation\b|\bjobs\b|\binterest rates?\b/gi,4],
  [/\binternational\b|\bworld affairs\b|\bdiplomat(?:ic|s)?\b|\bforeign policy\b|\bglobal\b|\bcountry\b|\bcountries\b|\bworld\b/gi,2],
  [/\benvironment\b|\bclimate\b|\bglobal warming\b|\bpollution\b|\bwildlife\b|\bconservation\b|\bearthquake\b|\bstorm\b|\bflood(?:s|ing)?\b|\bwildfire\b/gi,4],
  [/\bconflict\b|\bconflicts\b|\bwar\b|\bmilitary\b|\bairstrike\b|\bmissile\b|\barmed forces\b|\bceasefire\b|\binvasion\b|\brefugee(?:s)?\b/gi,4],
  [/\bcourt\b|\bjudge\b|\blawsuit\b|\bpolice\b|\bcrime\b|\bimmigration\b|\bstrike(?:s)?\b/gi,1]
 ],
 "Sports":[
  [/\bfootball\b|\bsoccer\b|\bpremier league\b|\bchampions league\b|\bworld cup\b|\buefa\b|\bfifa\b|\bnfl\b|\bcricket\b|\brugby\b|\btennis\b|\bgolf\b|\bformula one\b|\bformula 1\b|\bf1\b|\bboxing\b|\bufc\b|\bnba\b|\bbasketball\b/gi,5],
  [/\bmatch(?:es)?\b|\bgoal(?:s)?\b|\bscor(?:e|es|ed|ing)\b|\bteam(?:s)?\b|\bclub\b|\bmanager\b|\bcoach\b|\btransfer\b|\bstriker\b|\bgoalkeeper\b|\bpenalty\b|\bfixture\b|\btournament\b|\bchampionship\b/gi,2],
  [/\bcristiano ronaldo\b|\blionel messi\b|\bharry kane\b|\berling haaland\b|\bmanchester united\b|\bliverpool\b|\barsenal\b|\bchelsea\b|\breal madrid\b|\bbarcelona\b/gi,3]
 ],
 "Technology":[
  [/\btechnology\b|\btech\b|\bartificial intelligence\b|\bmachine learning\b|\bAI\b|\bdata cent(?:er|re)s?\b|\bcybersecurity\b|\bcyber-attack\b|\bhack(?:er|ers|ed|ing)?\b|\bsoftware\b|\bhardware\b/gi,4],
  [/\biphone\b|\bandroid\b|\bsmartphone\b|\bcomputer\b|\blaptop\b|\bchip(?:s)?\b|\bprocessor\b|\bsemiconductor\b|\bgoogle\b|\bapple\b|\bmicrosoft\b|\bintel\b|\bamd\b|\bbinance\b|\bcrypto(?:currency)?\b/gi,2],
  [/\bapp\b|\bapps\b|\bplatform\b|\bsearch engine\b|\bcloud computing\b|\bserver\b|\bsmart device\b|\bcyber\b/gi,1]
 ],
 "Gaming":[
  [/\bvideo game(?:s)?\b|\bgameplay\b|\bgaming\b|\bgamer(?:s)?\b|\bgamepad\b|\bgame studio\b|\bgame developer\b|\bgame release\b/gi,5],
  [/\bxbox\b|\bplaystation\b|\bnintendo\b|\bsteam\b|\bpc gamer\b|\bepic games\b|\bgrand theft auto\b|\bgta\s?\d\b|\bworld of warcraft\b|\bwarcraft\b|\bbethesda\b|\bskyrim\b|\bminecraft\b|\bfortnite\b|\bzelda\b|\bcall of duty\b/gi,4],
  [/\bdlc\b|\bmod(?:s|ding)?\b|\bconsole\b|\bquest walkthrough\b|\bpatch notes\b|\bvideo game adaptation\b/gi,2]
 ],
 "Entertainment":[
  [/\banime\b|\bmanga\b|\bmanhwa\b|\bwebtoon\b|\bshonen\b|\bshojo\b|\bseinen\b|\bisekai\b|\bcomic(?:s| book| strip)?\b|\bgraphic novel\b|\bcartoonist\b|\bsuperhero(?:es)?\b|\bmarvel comics\b|\bdc comics\b|\bspider-man\b|\bbatman\b|\bsuperman\b|\bx-men\b|\bavengers\b/gi,5],
  [/\bone piece\b|\bnaruto\b|\bdragon ball\b|\bjujutsu kaisen\b|\bdemon slayer\b|\bmy hero academia\b|\bpokemon\b|\bgundam\b|\bcode geass\b/gi,4],
  [/\bmovie(?:s)?\b|\bfilm(?:s)?\b|\bcinema\b|\bhollywood\b|\bbox office\b|\btelevision\b|\btv series\b|\bnetflix\b|\bstreaming\b|\bdocumentary\b|\bactor(?:s)?\b|\bactress(?:es)?\b|\bcast\b|\bdirector\b|\bfilmmaker\b|\bscreenwriter\b|\btrailer\b|\bseason\s?\d\b|\bepisode\b|\breality show\b/gi,4],
  [/\bcelebrity\b|\bsinger\b|\bmusician\b|\balbum\b|\bsong\b|\bmusic\b|\bconcert\b|\bcomedian\b|\bcomedy\b|\btheatre\b|\btheater\b|\baward(?:s)?\b|\bgrammy\b|\bbafta\b/gi,3]
 ]
};
const SUBCATEGORY_RULES={
 "World News":{
  "Politics":[[/\bpolitic(?:s|al)\b|\belection(?:s)?\b|\bgovernment\b|\bparliament\b|\bpresident\b|\bprime minister\b|\bcongress\b|\bsenate\b|\bminister\b|\bvote(?:r|rs|s|d)?\b|\bcampaign\b/gi,4]],
  "Business":[[/\bbusiness\b|\beconom(?:y|ic|ics)\b|\bcompany\b|\bcompanies\b|\bmarket(?:s)?\b|\bstock(?:s)?\b|\btrade\b|\binflation\b|\bjobs\b|\binterest rates?\b|\bprofit(?:s)?\b|\bceo\b/gi,4]],
  "World Affairs":[[/\binternational\b|\bworld affairs\b|\bdiplomat(?:ic|s)?\b|\bforeign policy\b|\bglobal\b|\bcountry\b|\bcountries\b|\bworld\b|\bUnited Nations\b|\bUN\b/gi,3]],
  "Environment":[[/\benvironment\b|\bclimate\b|\bglobal warming\b|\bpollution\b|\bwildlife\b|\bconservation\b|\bearthquake\b|\bstorm\b|\bflood(?:s|ing)?\b|\bwildfire\b|\bdrought\b/gi,4]],
  "Conflicts":[[/\bconflict\b|\bconflicts\b|\bwar\b|\bmilitary\b|\bairstrike\b|\bmissile\b|\barmed forces\b|\bceasefire\b|\binvasion\b|\brefugee(?:s)?\b|\bbattle\b/gi,4]]
 },
 "Sports":{
  "Football":[[/\bfootball\b|\bsoccer\b|\bpremier league\b|\bchampions league\b|\buefa\b|\bfifa\b|\bgoalkeeper\b|\bstriker\b|\bgoal(?:s)?\b|\btransfer\b/gi,4]],
  "Cricket":[[/\bcricket\b|\btest match\b|\bone-day international\b|\bodi\b|\bt20\b|\bwicket\b|\bbowler\b|\bbatsman\b|\binnings\b/gi,5]],
  "Basketball":[[/\bbasketball\b|\bnba\b|\bwnba\b|\bncaa basketball\b|\bslam dunk\b|\bthree-pointer\b/gi,5]],
  "Tennis":[[/\btennis\b|\bgrand slam\b|\bwimbledon\b|\bus open\b|\bfrench open\b|\baustralian open\b|\batp\b|\bwta\b/gi,5]],
  "Formula 1":[[/\bformula one\b|\bformula 1\b|\bf1\b|\bgrand prix\b|\bfia\b|\bferrari\b|\bmercedes f1\b|\bred bull racing\b/gi,5]],
  "Boxing & MMA":[[/\bboxing\b|\bufc\b|\bmma\b|\bknockout\b|\btitle fight\b|\bheavyweight\b|\bwelterweight\b|\bchampionship bout\b/gi,5]]
 },
 "Entertainment":{
  "TV Shows":[[/\btv\b|\btelevision\b|\bseries\b|\bseason\b|\bepisode\b|\bshow\b|\bstreaming\b|\bnetflix\b|\bdisney\+\b|\bhbo\b|\bprime video\b|\bfinale\b|\brenewed\b|\bcancelled\b/gi,3]],
  "Movies":[[/\bmovie(?:s)?\b|\bfilm(?:s)?\b|\bcinema\b|\bbox office\b|\bmovie trailer\b|\bfilm trailer\b|\bfeature film\b|\bfilmmaker\b|\bfilm director\b/gi,4]],
  "Anime":[[/\banime\b|\bone piece\b|\bnaruto\b|\bdragon ball\b|\bjujutsu kaisen\b|\bdemon slayer\b|\bmy hero academia\b|\bpokemon\b|\bgundam\b|\bcode geass\b|\bshonen\b|\bshojo\b|\bseinen\b|\bisekai\b/gi,5]],
  "Comics":[[/\bcomic(?:s| book| strip)?\b|\bgraphic novel\b|\bcartoonist\b|\bsuperhero(?:es)?\b|\bmarvel comics\b|\bdc comics\b|\bspider-man\b|\bbatman\b|\bsuperman\b|\bx-men\b|\bavengers\b/gi,5]],
  "Manga":[[/\bmanga\b|\bmanhwa\b|\bwebtoon\b|\bmanga chapter\b|\bchapter\s?\d+\b|\bvolume\s?\d+\b/gi,5]]
 },
 "Technology":{
  "Artificial Intelligence":[[/\bartificial intelligence\b|\bAI\b|\bmachine learning\b|\bchatgpt\b|\bopenai\b|\bchatbot\b|\bgenerative AI\b|\bllm(?:s)?\b|\bneural network\b/gi,5]],
  "Smartphones":[[/\bsmartphone\b|\biphone\b|\bandroid phone\b|\bmobile phone\b|\bgalaxy phone\b|\bpixel phone\b|\bfoldable phone\b|\bhandset\b/gi,5]],
  "Computers":[[/\bcomputer\b|\blaptop\b|\bdesktop pc\b|\bprocessor\b|\bcpu\b|\bgpu\b|\bchip(?:s)?\b|\bsemiconductor\b|\bmacbook\b|\bwindows pc\b/gi,4]],
  "Apps & Software":[[/\bapp\b|\bapps\b|\bapplication\b|\bsoftware\b|\boperating system\b|\bplatform\b|\bgoogle search\b|\bcloud computing\b|\bweb browser\b/gi,4]],
  "Cybersecurity":[[/\bcybersecurity\b|\bcyber-attack\b|\bcyber attack\b|\bhack(?:er|ers|ed|ing)?\b|\bdata breach\b|\bmalware\b|\bransomware\b|\bphishing\b|\bsecurity flaw\b/gi,5]]
 },
 "Gaming":{
  "PlayStation":[[/\bplaystation\b|\bps[345]\b|\bps5\b|\bsony console\b/gi,5]],
  "Xbox":[[/\bxbox\b|\bxbox series\b|\bmicrosoft console\b/gi,5]],
  "Nintendo":[[/\bnintendo\b|\bswitch\b|\bzelda\b|\bmario\b|\bpokemon\b/gi,4]],
  "PC Gaming":[[/\bpc gaming\b|\bpc gamer\b|\bsteam\b|\bepic games store\b|\bpc game\b|\bgraphics card\b|\bsteam deck\b/gi,4]],
  "Mobile Gaming":[[/\bmobile game\b|\bmobile gaming\b|\bandroid game\b|\bios game\b|\bapp store game\b|\bgoogle play game\b/gi,5]],
  "Game Releases":[[/\bgame release\b|\blaunch(?:es|ed)?\b|\brelease date\b|\bcoming to\b|\blaunch date\b|\bnew game\b|\bgame announced\b|\blaunches today\b/gi,3]]
 }
};
const CATEGORIES=Object.keys(CATEGORY_RULES);
function scoreRules(text,rules){
 let score=0;
 for(const [pattern,weight] of rules){pattern.lastIndex=0;const matches=text.match(pattern);if(matches)score+=matches.length*weight;}
 return score;
}
function classifyCategory(article,fallback="Entertainment"){
 const text=[article.title,article.summary,article.url].filter(Boolean).join(" ").toLowerCase();
 const scores=Object.fromEntries(CATEGORIES.map(c=>[c,scoreRules(text,CATEGORY_RULES[c])]));
 const ranked=CATEGORIES.map(category=>({category,score:scores[category]})).sort((a,b)=>b.score-a.score);
 const best=ranked[0],second=ranked[1];
 if(best.score<3||(best.score-second.score<2&&best.score<6)){
  if(fallback==="Anime & Comics")return "Entertainment";
  return CATEGORIES.includes(fallback)?fallback:"Entertainment";
 }
 return best.category;
}
const PAKISTAN_MENTION=/\bpakistan(?:i)?\b|\bislamabad\b|\bkarachi\b|\blahore\b|\brawalpindi\b|\bpeshawar\b|\bquetta\b|\bmultan\b|\bfaisalabad\b|\bsialkot\b|\bgujranwala\b|\bhyderabad\b|\bsukkur\b|\bpunjab\b|\bsindh\b|\bbalochistan\b|\bkhyber pakhtunkhwa\b|\bkp province\b|\bgilgit(?:-baltistan)?\b|\bmuzaffarabad\b|\brahim yar khan\b|\bry khan\b/i;
const INTERNATIONAL_MENTION=/\binternational\b|\bworldwide\b|\bglobal\b|\bforeign\b|\boverseas\b|\bdiplomac(?:y|ies)\b|\bdiplomatic\b|\bUnited Nations\b|\bUN Security Council\b|\bNATO\b|\bEuropean Union\b|\bG7\b|\bG20\b|\bUnited States\b|\bAmerican\b|\bUK\b|\bBritain\b|\bBritish\b|\bChina\b|\bChinese\b|\bIndia\b|\bIndian\b|\bRussia\b|\bRussian\b|\bUkraine\b|\bIran\b|\bIsrael\b|\bPalestine\b|\bGaza\b|\bTurkey\b|\bTurkish\b|\bSaudi Arabia\b|\bUnited Arab Emirates\b|\bUAE\b|\bFrance\b|\bFrench\b|\bGermany\b|\bGerman\b|\bJapan\b|\bJapanese\b|\bSouth Korea\b|\bNorth Korea\b|\bAustralia\b|\bCanada\b|\bAfrica\b|\bEurope\b|\bMiddle East\b|\bLatin America\b/i;
function classifyRegions(article,source={}){
 const text=[article.title,article.summary,article.url].filter(Boolean).join(" ");
 const pakistan=PAKISTAN_MENTION.test(text);
 const international=INTERNATIONAL_MENTION.test(text);
 const base=source.region||"GLOBAL";
 if(base==="PK"){
  if(pakistan)return international?["PK","GLOBAL"]:["PK"];
  return international?["GLOBAL"]:["PK"];
 }
 if(base==="GLOBAL"&&pakistan)return ["GLOBAL","PK"];
 return [base];
}
function classifySubcategory(article,category){
 const rules=SUBCATEGORY_RULES[category];if(!rules)return null;
 const text=[article.title,article.summary,article.url].filter(Boolean).join(" ").toLowerCase();
 const ranked=Object.entries(rules).map(([subcategory,patterns])=>({subcategory,score:scoreRules(text,patterns)})).sort((a,b)=>b.score-a.score);
 const best=ranked[0],second=ranked[1];
 if(!best||best.score<3||(second&&best.score-second.score<2))return null;
 return best.subcategory;
}

for(const s of cfg.sources.filter(x=>x.enabled)){try{
 const res=await fetch(s.feed,{headers:{"user-agent":"Articlea RSS reader"},signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error("HTTP "+res.status);
 const xml=parser.parse(await res.text()),feed=xml.rss?.channel||xml.feed||xml["rdf:RDF"]||{};
 for(const it of arr(feed.item||feed.entry||xml["rdf:RDF"]?.item).slice(0,50)){
  const link=url(it.link?.["@_href"]||it.link||it.id||it.guid),title=clean(it.title);
  if(!link||!title)continue;
  const raw=it.pubDate||it.published||it.updated||null,dt=raw&&Date.parse(str(raw))?new Date(str(raw)).toISOString():null;
  const desc=clean(it.description||it.summary||it["content:encoded"]||"").slice(0,360);
  const mediaValues=[...arr(it.enclosure),...arr(it["media:thumbnail"]),...arr(it["media:content"])];
  let image=mediaValues.map(value=>value?.["@_url"]||value?.url||"").find(Boolean)||"";
  if(!image){const rawMedia=[it["content:encoded"],it.description,it.summary].map(str).join(" ");image=rawMedia.match(/<img\b[^>]*(?:src|data-src|data-original)=["']([^"']+)/i)?.[1]||rawMedia.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/i)?.[0]||"";}
  const canonical=url(link);if(!canonical)continue;const key=canonical;const existing=map.get(key);const item={title,url:canonical,summary:desc,publisher:s.name,category:s.category,publishedAt:dt,image:imageUrl(image),regions:classifyRegions({title,summary:desc,url:canonical},s)};if(!existing||Date.parse(dt)>Date.parse(existing.publishedAt)||(!existing.image&&item.image))map.set(key,{...existing,...item,image:item.image||existing?.image});
 }
 console.log("Collected",s.name);
 }catch(e){console.warn("Skipped",s.name,e.message)}}

// Anime News Network's RSS feed omits per-article thumbnails. Recover the
// publisher's Open Graph image from each article page when the feed has none.
function metaContent(html,property){
 const tags=html.match(/<meta\b[^>]*>/gi)||[];
 for(const tag of tags){
  const prop=tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1];
  if(prop!==property)continue;
  return tag.match(/content=["']([^"']+)["']/i)?.[1]||"";
 }
 return "";
}
function pageImage(html,base){
 const meta=metaContent(html,"og:image")||metaContent(html,"twitter:image");
 const tags=html.match(/<img\b[^>]*>/gi)||[];
 const candidates=[meta,...tags.map(tag=>tag.match(/(?:src|data-src|data-original)=["']([^"']+)/i)?.[1]||tag.match(/srcset=["']([^"']+)/i)?.[1]?.split(",")[0]?.trim().split(/\s+/)[0]||"")];
 for(const candidate of candidates){
  if(!candidate)continue;
  try{
   const absolute=new URL(candidate,base).href;
   if(/no-image|placeholder|logo|favicon|sprite|avatar|banner|badge|google-play|app-store|play-store|apple\.png|android\.png|social|icon|advert|doubleclick/i.test(absolute))continue;
   if(!/\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(absolute))continue;
   const normalized=imageUrl(absolute);
   if(normalized)return normalized;
  }catch{}
 }
 return null;
}
async function recoverMissingImages(){
 const publishers=["Anime News Network","The Guardian","The Nation","Dawn"];
 for(const publisher of publishers){
  const missing=[...map.values()].filter(a=>a.publisher===publisher&&!a.image&&a.url).slice(0,60);
  for(let i=0;i<missing.length;i+=5){
   await Promise.all(missing.slice(i,i+5).map(async article=>{
    try{
     const response=await fetch(article.url,{headers:{"user-agent":"Mozilla/5.0 (compatible; Articlea RSS reader)","accept":"text/html"},signal:AbortSignal.timeout(10000)});
     if(!response.ok)return;
     const html=await response.text();
     const image=pageImage(html,article.url);
     if(image)map.set(article.url,{...article,image});
    }catch(e){console.warn("Image lookup skipped",article.url,e.message)}
   }));
  }
  console.log("Recovered",publisher,"thumbnails",missing.filter(a=>map.get(a.url)?.image).length,"of",missing.length);
 }
}
await recoverMissingImages();

// Reclassify the complete retained archive as well as newly collected stories.
const sourceByName=new Map(cfg.sources.map(source=>[source.name,source]));
const byStory=new Map();
for(const a of map.values()){
 const category=classifyCategory(a,a.category);
 const item={...a,summary:clean(a.summary).slice(0,360),category,subcategory:classifySubcategory(a,category),regions:classifyRegions(a,sourceByName.get(a.publisher)||{region:"GLOBAL"})};
 const key=(item.publisher||"").toLowerCase()+"|"+titleKey(item.title);
 const prev=byStory.get(key);
 if(!prev||Date.parse(item.publishedAt)>Date.parse(prev.publishedAt))byStory.set(key,{...prev,...item,image:item.image||prev?.image});
 else if(!prev.image&&item.image)byStory.set(key,{...prev,image:item.image});
}
const articles=[...byStory.values()].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,5000);
const updatedAt=new Date().toISOString();
await fs.writeFile(path,JSON.stringify({updatedAt,articles},null,2)+"\n");
const pageSize=30,feedDir="data/feed";
await fs.mkdir(feedDir,{recursive:true});
const pages=Math.ceil(articles.length/pageSize);
for(let i=0;i<pages;i++){
 const payload={updatedAt,page:i+1,pages,total:articles.length,articles:articles.slice(i*pageSize,(i+1)*pageSize)};
 await fs.writeFile(`${feedDir}/page-${i+1}.json`,JSON.stringify(payload)+"\n");
}
for(let i=pages+1;i<=Math.ceil(5000/pageSize);i++)await fs.rm(`${feedDir}/page-${i}.json`,{force:true});
console.log("Saved",articles.length,"unique articles with automatic categories.");
