import fs from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:"@_",textNodeName:"#text"});
const cfg=JSON.parse(await fs.readFile("sources.json","utf8"));
const path="data/articles.json";
const old=JSON.parse(await fs.readFile(path,"utf8").catch(()=>'{"articles":[]}'));
const map=new Map((old.articles||[]).map(a=>[a.url,a]));
const arr=v=>v==null?[]:Array.isArray(v)?v:[v];
const str=v=>typeof v==="string"?v:v&&typeof v==="object"?String(v["#text"]||""):"";
const clean=v=>str(v).replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
const url=v=>{try{let u=new URL(str(v));if(!["http:","https:"].includes(u.protocol))return "";u.hash="";return u.href}catch{return ""}};
const imageUrl=v=>{let u=url(v);if(!u)return null;try{const p=new URL(u);if(p.hostname==="ichef.bbci.co.uk"){p.pathname=p.pathname.replace(/\/ace\/([^/]+)\/(?:240|320|480|640)\//,"/ace/$1/1024/");p.pathname=p.pathname.replace(/\/images\/ic\/(?:240x135|320x180|480x270)\//,"/images/ic/1024x576/");}return p.href}catch{return u}};

// Classify each story from its own headline, summary and URL, not just its publisher.
const CATEGORY_RULES={
 "Anime & Comics":[
  [/\banime\b|\bmanga\b|\bmanhwa\b|\bwebtoon\b|\bshonen\b|\bshojo\b|\bseinen\b|\bisekai\b/gi,5],
  [/\bcomic(?:s| book| strip)?\b|\bgraphic novel\b|\bcartoonist\b|\bcomic strip\b/gi,5],
  [/\bsuperhero(?:es)?\b|\bmarvel comics\b|\bdc comics\b|\bspider-man\b|\bbatman\b|\bsuperman\b|\bx-men\b|\bavengers\b/gi,3],
  [/\bone piece\b|\bnaruto\b|\bdragon ball\b|\bjujutsu kaisen\b|\bdemon slayer\b|\bmy hero academia\b|\bpokemon\b|\bPokémon\b|\bgundam\b|\bcode geass\b/gi,4]
 ],
 "Gaming":[
  [/\bvideo game(?:s)?\b|\bgameplay\b|\bgaming\b|\bgamer(?:s)?\b|\bgamepad\b|\bgame studio\b|\bgame developer\b/gi,5],
  [/\bxbox\b|\bplaystation\b|\bnintendo\b|\bsteam\b|\bpc gamer\b|\bepic games\b|\bgrand theft auto\b|\bgta\s?\d\b|\bworld of warcraft\b|\bwarcraft\b|\bbethesda\b|\bskyrim\b|\bminecraft\b|\bfortnite\b|\bzelda\b|\bcall of duty\b/gi,4],
  [/\bdlc\b|\bmod(?:s|ding)?\b|\bconsole\b|\bquest walkthrough\b|\bpatch notes\b|\bvideo game adaptation\b/gi,2]
 ],
 "Sports":[
  [/\bfootball\b|\bsoccer\b|\bpremier league\b|\bchampions league\b|\bworld cup\b|\buefa\b|\bfifa\b|\bnfl\b|\bnba\b|\bcricket\b|\brugby\b|\btennis\b|\bgolf\b|\bformula one\b|\bformula 1\b|\bf1\b|\bboxing\b|\bufc\b/gi,5],
  [/\bmatch(?:es)?\b|\bgoal(?:s)?\b|\bscor(?:e|es|ed|ing)\b|\bteam(?:s)?\b|\bclub\b|\bmanager\b|\bcoach\b|\btransfer\b|\bstriker\b|\bgoalkeeper\b|\bpenalty\b|\bfixture\b|\btournament\b|\bchampionship\b/gi,2],
  [/\bcristiano ronaldo\b|\blionel messi\b|\bharry kane\b|\berling haaland\b|\bmanchester united\b|\bliverpool\b|\barsenal\b|\bchelsea\b|\breal madrid\b|\bbarcelona\b/gi,3]
 ],
 "Technology":[
  [/\btechnology\b|\btech\b|\bartificial intelligence\b|\b\bAI\b\b|\bmachine learning\b|\bdata cent(?:er|re)s?\b|\bcybersecurity\b|\bcyber-attack\b|\bhack(?:er|ers|ed|ing)?\b|\bsoftware\b|\bhardware\b/gi,4],
  [/\biphone\b|\bandroid\b|\bsmartphone\b|\bcomputer\b|\blaptop\b|\bchip(?:s)?\b|\bprocessor\b|\bsemiconductor\b|\bgoogle\b|\bapple\b|\bmicrosoft\b|\bintel\b|\bamd\b|\bbinance\b|\bcrypto(?:currency)?\b/gi,2],
  [/\bapp\b|\bapps\b|\bplatform\b|\bsearch engine\b|\bcloud computing\b|\bserver\b|\bsmart device\b|\bcyber\b/gi,1]
 ],
 "Entertainment":[
  [/\bmovie(?:s)?\b|\bfilm(?:s)?\b|\bcinema\b|\bhollywood\b|\bbox office\b|\btelevision\b|\btv series\b|\bnetflix\b|\bstreaming\b|\bdocumentary\b/gi,4],
  [/\bactor(?:s)?\b|\bactress(?:es)?\b|\bcast\b|\bdirector\b|\bfilmmaker\b|\bscreenwriter\b|\btrailer\b|\bseason\s?\d\b|\bepisode\b|\breality show\b|\bsoap opera\b/gi,3],
  [/\bcelebrity\b|\bsinger\b|\bmusician\b|\balbum\b|\bsong\b|\bmusic\b|\bconcert\b|\bcomedian\b|\bcomedy\b|\btheatre\b|\btheater\b|\baward(?:s)?\b|\bgrammy\b|\bbafta\b/gi,3],
  [/\bstar trek\b|\bstar wars\b|\byellowstone\b|\bthe pitt\b|\bthe crown\b|\btraitors\b|\bdoctor who\b|\bgame of thrones\b|\blord of the rings\b/gi,3]
 ],
 "World News":[
  [/\belection(?:s)?\b|\bgovernment\b|\bparliament\b|\bpresident\b|\bprime minister\b|\bpolitic(?:s|al)\b|\bcongress\b|\bsenate\b|\bminister\b|\bprotest(?:s|ers)?\b|\bstrike(?:s)?\b|\bwar\b|\bmilitary\b|\bairstrike\b|\brefugee(?:s)?\b|\bdiplomat(?:ic|s)?\b/gi,4],
  [/\bcountry\b|\bcountries\b|\binternational\b|\bworld\b|\bimmigration\b|\bcourt\b|\bjudge\b|\blawsuit\b|\bclimate\b|\bearthquake\b|\bstorm\b|\bflood(?:s|ing)?\b|\bfire(?:s)?\b|\bpolice\b|\bcrime\b/gi,1]
 ]
};
const CATEGORIES=Object.keys(CATEGORY_RULES);
function classifyCategory(article,fallback="World News"){
 const text=[article.title,article.summary,article.url].filter(Boolean).join(" ").toLowerCase();
 const scores=Object.fromEntries(CATEGORIES.map(c=>[c,0]));
 for(const [category,rules] of Object.entries(CATEGORY_RULES)){
  for(const [pattern,weight] of rules){
   pattern.lastIndex=0;
   const matches=text.match(pattern);
   if(matches)scores[category]+=matches.length*weight;
  }
 }
 const ranked=CATEGORIES.map(category=>({category,score:scores[category]})).sort((a,b)=>b.score-a.score);
 const best=ranked[0],second=ranked[1];
 // Avoid arbitrary guesses when a headline has too little subject information.
 if(best.score<3||(best.score-second.score<2&&best.score<6))return CATEGORIES.includes(fallback)?fallback:"World News";
 return best.category;
}

for(const s of cfg.sources.filter(x=>x.enabled)){try{
 const res=await fetch(s.feed,{headers:{"user-agent":"Articlea RSS reader"},signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error("HTTP "+res.status);
 const xml=parser.parse(await res.text()),feed=xml.rss?.channel||xml.feed||xml["rdf:RDF"]||{};
 for(const it of arr(feed.item||feed.entry||xml["rdf:RDF"]?.item).slice(0,30)){
  const link=url(it.link?.["@_href"]||it.link||it.id||it.guid),title=clean(it.title);
  if(!link||!title)continue;
  const raw=it.pubDate||it.published||it.updated||null,dt=raw&&Date.parse(str(raw))?new Date(str(raw)).toISOString():null;
  const desc=clean(it.description||it.summary||it["content:encoded"]||"").slice(0,360);
  let image=it.enclosure?.["@_url"]||it["media:thumbnail"]?.["@_url"]||it["media:content"]?.["@_url"]||"";
  if(!image)image=desc.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/i)?.[0]||"";
  map.set(link,{title,url:link,summary:desc,publisher:s.name,category:s.category,publishedAt:dt,image:imageUrl(image)});
 }
 console.log("Collected",s.name);
 }catch(e){console.warn("Skipped",s.name,e.message)}}

// Reclassify the complete retained archive as well as newly collected stories.
const articles=[...map.values()].map(a=>({...a,category:classifyCategory(a,a.category)}))
 .sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,500);
await fs.writeFile(path,JSON.stringify({updatedAt:new Date().toISOString(),articles},null,2)+"\n");
console.log("Saved",articles.length,"unique articles with automatic categories.");
