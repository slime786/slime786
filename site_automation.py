from pathlib import Path
import re, json, sys
from html import unescape

root=Path(__file__).resolve().parents[1]
base="https://slime786.github.io/slime786/"
pages=[]
errors=[]

def grab(text,pattern,default=""):
    m=re.search(pattern,text,re.I|re.S)
    return unescape(re.sub(r"\s+"," ",m.group(1)).strip()) if m else default

for p in sorted(root.glob("*.html")):
    if p.name=="404.html": continue
    s=p.read_text(encoding="utf-8")
    title=grab(s,r"<title>(.*?)</title>",p.stem)
    desc=grab(s,r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']',"")
    eyebrow=grab(s,r'class=["\'][^"\']*eyebrow[^"\']*["\'][^>]*>(.*?)</', "")
    kind="home" if p.name=="index.html" else "article" if p.name.startswith("article-") else "project" if p.name.startswith("project-") else "page"
    pages.append({"file":p.name,"title":title,"description":desc,"category":re.sub(r"<.*?>","",eyebrow),"kind":kind,"url":base if p.name=="index.html" else base+p.name})
    for href in re.findall(r'href=["\']([^"\']+)["\']',s,re.I):
        if href.startswith(("#","mailto:","tel:","https://","http://","javascript:")): continue
        target=href.split("#",1)[0].split("?",1)[0]
        if target.startswith("/slime786/"): target=target[len("/slime786/"):]
        if not target: target="index.html"
        if target.endswith("/"): target+="index.html"
        if target and not (root/target).exists(): errors.append(f"{p.name}: missing {href}")

(root/"data").mkdir(exist_ok=True)
(root/"data"/"site-index.json").write_text(json.dumps({"pages":pages},indent=2,ensure_ascii=False),encoding="utf-8")
urls="\n".join(f"  <url><loc>{x['url']}</loc></url>" for x in pages)
(root/"sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls+'\n</urlset>\n',encoding="utf-8")
if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"Indexed {len(pages)} pages. Internal links OK.")
