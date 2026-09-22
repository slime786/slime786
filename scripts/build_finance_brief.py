#!/usr/bin/env python3
import json,re,urllib.request,xml.etree.ElementTree as ET
from datetime import datetime,timezone
from html import unescape
FEEDS=[("BBC Business","https://feeds.bbci.co.uk/news/business/rss.xml")]
def clean(s):
 s=re.sub(r"<[^>]+>"," ",s or "")
 return re.sub(r"\s+"," ",unescape(s)).strip()
def fetch(name,url):
 req=urllib.request.Request(url,headers={"User-Agent":"slime786-weekly-finance-brief/1.0"})
 with urllib.request.urlopen(req,timeout=20) as r: root=ET.fromstring(r.read())
 out=[]
 for item in root.findall(".//item")[:12]:
  title=clean(item.findtext("title"));link=clean(item.findtext("link"));summary=clean(item.findtext("description"))
  if title and link: out.append({"source":name,"title":title,"link":link,"summary":summary[:280]})
 return out
stories=[]
for name,url in FEEDS:
 try: stories.extend(fetch(name,url))
 except Exception as e: print(f"{name}: {e}")
with open("newsletter-latest.json","w",encoding="utf-8") as f: json.dump({"generated_at":datetime.now(timezone.utc).isoformat(),"stories":stories[:8]},f,ensure_ascii=False,indent=2)
