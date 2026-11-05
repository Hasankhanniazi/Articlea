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
const articles=[...map.values()].map(a=>{const category=classifyCategory(a,a.category);return {...a,category,subcategory:classifySubcategory(a,category)}})
 .sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,500);
await fs.writeFile(path,JSON.stringify({updatedAt:new Date().toISOString(),articles},null,2)+"\n");
console.log("Saved",articles.length,"unique articles with automatic categories.");
