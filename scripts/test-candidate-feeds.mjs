import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", processEntities: false });
const candidates = [
  ["ARY News", "https://arynews.tv/feed"],
  ["The Guardian", "https://www.theguardian.com/world/rss"],
  ["The Nation (top stories)", "https://nation.com.pk/rss/top-stories"],
  ["The Nation (newspaper)", "https://nation.com.pk/rss/newspaper"],
  ["Dawn", "https://www.dawn.com/feeds/home"],
  ["Geo News (RSS index)", "https://www.geo.tv/rss"],
  ["Geo News (latest)", "https://www.geo.tv/rss/latest"],
  ["Geo News (Pakistan)", "https://www.geo.tv/rss/pakistan"]
];
const arr = value => value == null ? [] : Array.isArray(value) ? value : [value];
for (const [name, url] of candidates) {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; Articlea feed checker)", "accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(20000)
    });
    const body = await response.text();
    if (!response.ok) throw new Error("HTTP " + response.status);
    const parsed = parser.parse(body);
    const feed = parsed.rss?.channel || parsed.feed || parsed["rdf:RDF"] || {};
    const items = arr(feed.item || feed.entry || parsed["rdf:RDF"]?.item);
    const usable = items.filter(item => {
      const title = item.title?.["#text"] || item.title;
      const link = item.link?.["@_href"] || item.link || item.id || item.guid;
      return Boolean(title && link);
    });
    const images = items.filter(item => item.enclosure?.["@_url"] || item["media:thumbnail"]?.["@_url"] || item["media:content"]?.["@_url"]).length;
    console.log(JSON.stringify({ name, url, status: response.status, contentType: response.headers.get("content-type"), bytes: body.length, items: items.length, usable: usable.length, imageTagged: images, sampleTitle: String(usable[0]?.title?.["#text"] || usable[0]?.title || "").slice(0, 140) }));
  } catch (error) {
    console.log(JSON.stringify({ name, url, error: error.message }));
  }
}
