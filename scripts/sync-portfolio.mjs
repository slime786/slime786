import fs from "node:fs";
import path from "node:path";

// Source of truth: data/portfolio.json. Generated HTML/Markdown stays static and crawlable.
function generate(d, files){
  const e=(s)=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const m=(s)=>String(s).replace(/\\/g,"\\\\").replace(/\|/g,"\\|").replace(/\r?\n/g," ");
  const assert=(condition,message)=>{if(!condition)throw Error(message);};
  assert(d.schemaVersion===1,"Unsupported portfolio manifest version");
  assert(Number.isSafeInteger(d.summary.repositoryCount)&&d.summary.repositoryCount>0,"Invalid repository count");
  assert(Number.isSafeInteger(d.summary.newBuilds)&&d.summary.newBuilds>=0,"Invalid new build count");
  assert(Array.isArray(d.repositories)&&Array.isArray(d.featuredProducts),"Missing manifest arrays");
  assert(d.repositories.length<=d.summary.repositoryCount,"Listed repositories exceed total count");
  const repoIds=new Set();
  for(const r of d.repositories){
    assert(typeof r.id==="string"&&/^[A-Za-z0-9._-]+$/.test(r.id),"Invalid repository ID");
    assert(!repoIds.has(r.id),"Duplicate repository ID: "+r.id);repoIds.add(r.id);
    assert(typeof r.name==="string"&&r.name.trim()!==""&&r.index&&r.index.purpose&&r.index.status,"Incomplete repository: "+r.id);
    if(r.map)assert(r.map.icon&&r.map.status&&r.map.description&&(!r.map.tone||["public"].includes(r.map.tone))&&(!r.map.state||["mvp","private"].includes(r.map.state)),"Invalid map card: "+r.id);
  }
  const productIds=new Set();
  for(const p of d.featuredProducts){
    assert(typeof p.id==="string"&&!productIds.has(p.id),"Duplicate product ID");
    productIds.add(p.id);
    assert(repoIds.has(p.repository),"Unknown product repository: "+p.repository);
    assert(["active","mvp","private","beta"].includes(p.tone),"Invalid product tone: "+p.id);
    assert(/^[a-z]+$/.test(p.art)&&p.name&&p.description&&p.status&&p.cta,"Incomplete product: "+p.id);
    assert(/^#[a-z0-9-]+$|^\/slime786\/[a-z0-9/.-]+$/i.test(p.href),"Unsafe product href: "+p.id);
  }
  const region=(source,key,body)=>{
    const start=`<!-- portfolio:${key}:start -->`,end=`<!-- portfolio:${key}:end -->`;
    const a=source.indexOf(start),b=source.indexOf(end);
    assert(a>=0&&b>a&&source.indexOf(start,a+1)<0&&source.indexOf(end,b+1)<0,"Missing/duplicate region "+key);
    return source.slice(0,a+start.length)+"\n"+body+"\n"+source.slice(b);
  };
  const productCards=d.featuredProducts.map((p,i)=>{
    const classes=["product-card",p.primary?"product-primary":"",p.shop?"product-shop":""].filter(Boolean).join(" ");
    const number=String(i+1).padStart(2,"0");
    return `    <article class="${classes}"><div class="product-card-top"><span class="status-chip ${e(p.tone)}">${e(p.status)}</span><span class="product-code">${number}</span></div><div class="product-art art-${e(p.art)}" aria-hidden="true"><i></i></div><h3>${e(p.name)}</h3><p>${e(p.description)}</p><a href="${e(p.href)}">${e(p.cta)} <span>→</span></a></article>`;
  }).join("\n");
  const repoCards=d.repositories.filter(r=>r.map).map(r=>
    `    <article class="repo-card${r.map.tone?" "+e(r.map.tone):""}"><div class="repo-icon">${e(r.map.icon)}</div><div><span>${e(r.map.status)}</span><h3>${e(r.name)}</h3><p>${e(r.map.description)}</p></div><i class="repo-state${r.map.state?" "+e(r.map.state):""}"></i></article>`
  ).join("\n");
  const repoTable=[
    "| Repository | Purpose | Status |",
    "| --- | --- | --- |",
    ...d.repositories.map(r=>`| [slime786/${m(r.id)}](https://github.com/slime786/${encodeURIComponent(r.id)}) | ${m(r.index.purpose)} | ${m(r.index.status)} |`)
  ].join("\n");
  const metric=(html,label)=>{
    let count=0;
    const next=html.replace(/(<strong data-portfolio-metric="(repositories|newBuilds)">)[^<]*(<\/strong>)/g,(_all,a,key,b)=>{
      count++;return a+(key==="repositories"?d.summary.repositoryCount:d.summary.newBuilds)+b;
    });
    assert((label==="index.html"&&count===2)||(label==="portfolio.html"&&count===3),label+" must expose all metric hooks");
    return next;
  };
  const output={...files};
  output["index.html"]=metric(files["index.html"],"index.html");
  output["portfolio.html"]=metric(region(region(files["portfolio.html"],"featured-products",productCards),"featured-repositories",repoCards),"portfolio.html");
  output["REPOSITORIES.md"]=region(files["REPOSITORIES.md"],"repository-index",repoTable);
  return output;
}

const root=path.resolve(import.meta.dirname,"..");
const data=JSON.parse(fs.readFileSync(path.join(root,"data/portfolio.json"),"utf8"));
const paths=["index.html","portfolio.html","REPOSITORIES.md"];
const files=Object.fromEntries(paths.map(p=>[p,fs.readFileSync(path.join(root,p),"utf8")]));
const output=generate(data,files);
const check=process.argv.includes("--check");
let stale=false;
for(const file of paths){
  if(output[file]===files[file])continue;
  if(check){console.error("Out of sync with data/portfolio.json:",file);stale=true;}
  else{fs.writeFileSync(path.join(root,file),output[file]);console.log("Updated",file);}
}
if(stale){console.error("Run: node scripts/sync-portfolio.mjs");process.exitCode=1;}
else console.log(check?"Portfolio manifest is in sync.":"Portfolio manifest sync complete.");
