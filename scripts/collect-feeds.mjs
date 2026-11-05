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
  map.set(link,{title,url:link,summary:desc,publisher:s.name,category:s.category,publishedAt:dt,image:url(image)||null});
 }
 console.log("Collected",s.name);
 }catch(e){console.warn("Skipped",s.name,e.message)}}
const articles=[...map.values()].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).slice(0,500);
await fs.writeFile(path,JSON.stringify({updatedAt:new Date().toISOString(),articles},null,2)+"\n");
console.log("Saved",articles.length,"unique articles.");
