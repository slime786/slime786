const PAYPAL_CLIENT_ID = ""; // Public browser Client ID only. Add later when PayPal is connected.
const PAYPAL_MODE = "sandbox";
const DEMO_MODE = true;
const CHECKOUT_API_BASE = "https://cbqtqcnudwnlfxtlrioz.supabase.co/functions/v1";
let pendingLocalOrderId = null;
let usingLiveCatalog = false;

const inventory = [
  {
    id:"demo-ygo-blue-eyes-sdk",
    game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"single",typeLabel:"Single",
    name:"Blue-Eyes White Dragon — SDK-001 Unlimited",
    set:"Starter Deck: Kaiba · SDK-001",
    condition:"Raw market guide",
    notes:"Preview example only — not current Slime’s Collectables stock. Vintage Ultra Rare market guide.",
    price:15.17,stock:1,newest:12,tags:["new","picks"],
    marketSource:"PriceCharting + GBP conversion",marketUpdated:"24 Sep 2026",
    imageUrl:"https://cdn.openart.ai/openart-uploads/production/attachment-transfers/94b2dc929192ec4ff720f007f722c3a84dc8dd781d4c537c5f0d997f932dc537.jpg"
  },
  {
    id:"demo-ygo-dmg-mp24",
    game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"single",typeLabel:"Single",
    name:"Dark Magician Girl — MP24-EN053",
    set:"25th Anniversary Tin: Dueling Mirrors",
    condition:"Near Mint guide",
    notes:"Preview example only — not current stock. Recent Cardmarket/TCGGraph guide converted to GBP.",
    price:4.85,stock:1,newest:11,tags:["new"],
    marketSource:"TCGGraph / Cardmarket",marketUpdated:"24 Sep 2026"
  },
  {
    id:"demo-ygo-qcst-box",
    game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"sealed",typeLabel:"Sealed",
    name:"Quarter Century Stampede — Booster Box",
    set:"24 packs · English",
    condition:"Factory Sealed",
    notes:"Preview sealed example only — not current stock. UK retail guide; final price would depend on the exact sealed box condition.",
    price:96.95,stock:1,newest:10,tags:["picks"],
    marketSource:"Chaos Cards UK",marketUpdated:"Sep 2026"
  },
  {
    id:"demo-ygo-rarity2-box",
    game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"sealed",typeLabel:"Sealed",
    name:"25th Anniversary Rarity Collection II — Booster Box",
    set:"Rarity Collection II",
    condition:"Factory Sealed",
    notes:"Preview sealed example only — not current stock. UK retail guide for a sealed booster box.",
    price:109.95,stock:1,newest:9,tags:["new"],
    marketSource:"Romulus Games UK",marketUpdated:"Sep 2026"
  },
  {
    id:"demo-ygo-dmg-psa10",
    game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"graded",typeLabel:"Graded",
    name:"Dark Magician Girl — MP24-EN053 · PSA 10",
    set:"25th Anniversary Tin: Dueling Mirrors",
    condition:"PSA 10 guide",
    notes:"Preview graded example only — not current stock. Actual slab value depends on cert, population and recent sold comps.",
    price:120.92,stock:1,newest:8,tags:["picks"],
    marketSource:"TCGGraph graded index + GBP conversion",marketUpdated:"22 Sep 2026"
  },
  {
    id:"demo-ygo-nostalgia-duo",
    game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"bundle",typeLabel:"Bundle",
    name:"25th Anniversary Nostalgia Duo",
    set:"Blue-Eyes White Dragon + Dark Magician Girl · MP24",
    condition:"Near Mint guide",
    notes:"Preview two-card bundle only — not current stock. Guide combines recent market values for the two MP24 cards.",
    price:23.88,stock:1,newest:7,tags:["picks"],
    marketSource:"TCGGraph / Cardmarket component guides",marketUpdated:"24 Sep 2026",
    imageUrl:"https://cdn.openart.ai/openart-uploads/production/attachment-transfers/94b2dc929192ec4ff720f007f722c3a84dc8dd781d4c537c5f0d997f932dc537.jpg"
  },
  {
    id:"demo-pkm-charizard-151",
    game:"pokemon",gameLabel:"Pokémon",type:"single",typeLabel:"Single",
    name:"Charizard ex — 199/165",
    set:"Scarlet & Violet—151 · Special Illustration Rare",
    condition:"Raw market guide",
    notes:"Preview example only — not current Slime’s Collectables stock. UK raw-card market guide.",
    price:306.02,stock:1,newest:6,tags:["new","picks"],
    marketSource:"CardMetric UK",marketUpdated:"11 Sep 2026",
    imageUrl:"https://cdn.openart.ai/openart-uploads/production/attachment-transfers/342ccb19c84339da5c137aed6e796a1cf029f226cf96ed2250989cefae36dfa0.webp"
  },
  {
    id:"demo-pkm-mew-151",
    game:"pokemon",gameLabel:"Pokémon",type:"single",typeLabel:"Single",
    name:"Mew ex — 205/165",
    set:"Scarlet & Violet—151 · Hyper Rare",
    condition:"Raw market guide",
    notes:"Preview example only — not current stock. UK market snapshot for an English raw copy.",
    price:65.80,stock:1,newest:5,tags:["new"],
    marketSource:"CardMetric UK",marketUpdated:"18 Sep 2026",
  },
  {
    id:"demo-pkm-151-etb",
    game:"pokemon",gameLabel:"Pokémon",type:"sealed",typeLabel:"Sealed",
    name:"Scarlet & Violet—151 Elite Trainer Box",
    set:"151 · Standard ETB",
    condition:"Factory Sealed",
    notes:"Preview sealed example only — not current stock. Market guides move quickly on older sealed Pokémon products.",
    price:420.00,stock:1,newest:4,tags:["picks"],
    marketSource:"HoloHawk UK sealed tracker",marketUpdated:"24 Sep 2026"
  },
  {
    id:"demo-pkm-151-bundle",
    game:"pokemon",gameLabel:"Pokémon",type:"sealed",typeLabel:"Sealed",
    name:"Scarlet & Violet—151 Booster Bundle",
    set:"6 booster packs",
    condition:"Factory Sealed",
    notes:"Preview sealed example only — not current stock. Market guide shown for a single sealed booster bundle.",
    price:130.80,stock:1,newest:3,tags:["new"],
    marketSource:"PokeValues",marketUpdated:"10 Sep 2026"
  },
  {
    id:"demo-pkm-pikachu-psa10",
    game:"pokemon",gameLabel:"Pokémon",type:"graded",typeLabel:"Graded",
    name:"Pikachu — 173/165 · PSA 10",
    set:"Scarlet & Violet—151 · Illustration Rare",
    condition:"PSA 10 guide",
    notes:"Preview graded example only — not current stock. Converted from current graded market guide; exact sold prices vary.",
    price:416.66,stock:1,newest:2,tags:["picks"],
    marketSource:"PriceCharting graded guide + GBP conversion",marketUpdated:"Sep 2026",
    imageUrl:"https://cdn.openart.ai/openart-uploads/production/attachment-transfers/20a81b780943ad269c89d5f69892898de316e81337bd4051c372ee3a7a5e0a94.png"
  },
  {
    id:"demo-pkm-151-starter-trio",
    game:"pokemon",gameLabel:"Pokémon",type:"bundle",typeLabel:"Bundle",
    name:"151 Starter Illustration Rare Trio",
    set:"Bulbasaur 166 · Charmander 168 · Squirtle 170",
    condition:"Raw market guide",
    notes:"Preview three-card bundle only — not current stock. Guide is the combined UK market value of the three raw cards.",
    price:215.14,stock:1,newest:1,tags:["picks"],
    marketSource:"CardMetric UK component guides",marketUpdated:"24 Sep 2026"
  }
];

let activeFilter = "all";
let sortMode = "featured";
let searchTerm = "";
const cart = new Map();

const grid = document.querySelector("#product-grid");
const template = document.querySelector("#product-template");
const cartDrawer = document.querySelector("#cart-drawer");
const backdrop = document.querySelector("#drawer-backdrop");
const cartCount = document.querySelector("#cart-count");
const cartItems = document.querySelector("#cart-items");
const cartEmpty = document.querySelector("#cart-empty");
const cartSubtotal = document.querySelector("#cart-subtotal");
const cartTotal = document.querySelector("#cart-total");
const cartShipping = document.querySelector("#cart-shipping");
const shippingMethod = document.querySelector("#shipping-method");
const checkoutButton = document.querySelector("#checkout-button");
const checkoutNote = document.querySelector("#checkout-note");

function money(value){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(value)}
function displayCategory(item){return `${item.gameLabel} · ${item.typeLabel}`}

function matchesFilter(item, filter){
  if(filter === "all") return true;
  const [kind,value] = filter.split(":");
  if(kind === "game") return item.game === value;
  if(kind === "type") return item.type === value;
  if(kind === "tag") return item.tags.includes(value);
  return true;
}

function renderProducts(){
  const filtered = inventory.filter(item=>{
    const match = matchesFilter(item, activeFilter);
    const haystack = `${item.gameLabel} ${item.typeLabel} ${item.name} ${item.set} ${item.condition} ${item.notes} ${item.tags.join(" ")}`.toLowerCase();
    return match && haystack.includes(searchTerm);
  });
  const items=[...filtered].sort((a,b)=>{
    if(sortMode==="price-low") return a.price-b.price;
    if(sortMode==="price-high") return b.price-a.price;
    if(sortMode==="newest") return b.newest-a.newest;
    const ap=a.tags.includes("picks")?1:0,bp=b.tags.includes("picks")?1:0;
    if(ap!==bp) return bp-ap;
    return b.newest-a.newest;
  });

  grid.innerHTML="";
  if(!items.length){
    grid.innerHTML='<div class="no-products">Nothing matches that filter yet. More stock will appear here when your inventory is added.</div>';
    return;
  }

  items.forEach(item=>{
    const node=template.content.firstElementChild.cloneNode(true);
    node.dataset.game=item.game;
    node.dataset.type=item.type;
    node.querySelector(".condition-badge").textContent=item.condition || "See notes";
    const photo=node.querySelector(".product-image");
    if(item.imageUrl){
      photo.style.backgroundImage=`linear-gradient(rgba(5,10,9,.08),rgba(5,10,9,.08)),url("${item.imageUrl}")`;
      photo.style.backgroundSize="cover";
      photo.style.backgroundPosition="center";
      photo.querySelector("span").style.display="none";
    }
    const newBadge=node.querySelector(".new-badge");
    if(item.tags.includes("new")) newBadge.hidden=false;
    node.querySelector(".category").textContent=displayCategory(item);
    node.querySelector(".set").textContent=item.set;
    node.querySelector("h3").textContent=item.name;
    node.querySelector(".card-notes").textContent=item.notes;
    node.querySelector(".price").textContent=money(item.price);
    const marketGuide=node.querySelector(".market-guide");
    if(marketGuide){
      marketGuide.textContent=item.marketSource
        ? `Market guide · ${item.marketSource} · ${item.marketUpdated || "recent"}`
        : "";
      marketGuide.hidden=!item.marketSource;
    }
    const addButton=node.querySelector(".add-button");
    if(DEMO_MODE && !usingLiveCatalog) addButton.textContent="Preview basket";
    if(item.stock<=0){
      addButton.disabled=true;
      addButton.textContent="Sold out";
      node.classList.add("sold-out");
    }else{
      addButton.addEventListener("click",()=>addToCart(item.id));
    }
    grid.append(node);
  });
}

function setFilter(filter,{scroll=true}={}){
  activeFilter=filter;
  document.querySelectorAll("[data-filter]").forEach(button=>button.classList.toggle("active",button.dataset.filter===filter));
  renderProducts();
  if(scroll) document.querySelector("#shop")?.scrollIntoView({behavior:"smooth",block:"start"});
}

function addToCart(id){
  const item=inventory.find(x=>x.id===id); if(!item)return;
  const current=cart.get(id)||0; if(current>=item.stock)return;
  cart.set(id,current+1); renderCart(); openCart();
}
function removeFromCart(id){cart.delete(id);renderCart()}

function renderCart(){
  cartItems.innerHTML="";
  let qty=0,total=0;
  cart.forEach((count,id)=>{
    const item=inventory.find(x=>x.id===id); if(!item)return;
    qty+=count; total+=item.price*count;
    const row=document.createElement("div"); row.className="cart-line";
    row.innerHTML=`<div><strong>${item.name}</strong><small>${displayCategory(item)} · Qty ${count}</small></div><div><strong>${money(item.price*count)}</strong><br><button type="button">Remove</button></div>`;
    row.querySelector("button").addEventListener("click",()=>removeFromCart(id));
    cartItems.append(row);
  });
  cartCount.textContent=qty;
  const hasSealed=[...cart.keys()].some(id=>inventory.find(x=>x.id===id)?.type==="sealed");
  const shipping=qty===0?0:(total>=100?0:(hasSealed?5.49:3.99));
  cartSubtotal.textContent=money(total);
  if(cartShipping) cartShipping.textContent=shipping===0&&qty>0?"FREE":money(shipping);
  if(shippingMethod) shippingMethod.textContent=qty===0?"UK shipping":(total>=100?"UK shipping · free over £100":(hasSealed?"UK sealed shipping":"UK tracked shipping"));
  cartTotal.textContent=money(total+shipping);
  cartEmpty.hidden=qty>0;
  checkoutButton.disabled=true;
}

function openCart(){cartDrawer.classList.add("open");cartDrawer.setAttribute("aria-hidden","false");backdrop.hidden=false;document.querySelector("#cart-open").setAttribute("aria-expanded","true")}
function closeCart(){cartDrawer.classList.remove("open");cartDrawer.setAttribute("aria-hidden","true");backdrop.hidden=true;document.querySelector("#cart-open").setAttribute("aria-expanded","false")}

document.querySelector("#cart-open").addEventListener("click",openCart);
document.querySelector("#cart-close").addEventListener("click",closeCart);
backdrop.addEventListener("click",closeCart);
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCart();closeMobileMenu()}});

document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>setFilter(button.dataset.filter)));

document.querySelectorAll("[data-filter-link]").forEach(link=>link.addEventListener("click",()=>{
  setFilter(link.dataset.filter,{scroll:false});
  closeMobileMenu();
  setTimeout(()=>document.querySelector("#shop")?.scrollIntoView({behavior:"smooth",block:"start"}),50);
}));

document.querySelector("#sort-select").addEventListener("change",e=>{sortMode=e.target.value;renderProducts()});

function bindSearch(input){
  if(!input)return;
  input.addEventListener("input",e=>{
    searchTerm=e.target.value.trim().toLowerCase();
    activeFilter="all";
    document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));
    renderProducts();
  });
}
bindSearch(document.querySelector("#site-search"));
bindSearch(document.querySelector("#mobile-site-search"));

const menuToggle=document.querySelector("#menu-toggle");
const mobileMenu=document.querySelector("#mobile-menu");
function closeMobileMenu(){mobileMenu.hidden=true;menuToggle.setAttribute("aria-expanded","false")}
menuToggle.addEventListener("click",()=>{
  const opening=mobileMenu.hidden;
  mobileMenu.hidden=!opening;
  menuToggle.setAttribute("aria-expanded",String(opening));
});
mobileMenu.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeMobileMenu));

const mobileSearchToggle=document.querySelector("#mobile-search-toggle");
const mobileSearchPanel=document.querySelector("#mobile-search-panel");
mobileSearchToggle.addEventListener("click",()=>{
  mobileSearchPanel.hidden=!mobileSearchPanel.hidden;
  if(!mobileSearchPanel.hidden) setTimeout(()=>document.querySelector("#mobile-site-search")?.focus(),0);
});

function loadPayPal(){
  if(!PAYPAL_CLIENT_ID){checkoutNote.textContent="PayPal is not configured yet.";return}
  if(PAYPAL_MODE==="sandbox") checkoutNote.textContent="PayPal sandbox is prepared for testing. Real payments stay disabled until live inventory and your live PayPal Client ID are added.";
  const script=document.createElement("script");
  script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=GBP&components=buttons`;
  script.onload=()=>{
    if(!window.paypal)return;
    const paypalButtons=window.paypal.Buttons({
      style:{layout:"vertical",shape:"rect",label:"paypal"},
      async createOrder(){
        const payload=[...cart].map(([id,quantity])=>({id,quantity}));
        if(!payload.length) throw new Error("Your basket is empty.");
        checkoutNote.textContent="Checking stock and creating your secure PayPal order…";
        const res=await fetch(`${CHECKOUT_API_BASE}/collectables-create-order`,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({cart:payload})
        });
        const data=await res.json();
        if(!res.ok){
          const message=data?.error==="paypal_not_configured"
            ?"PayPal sandbox credentials still need to be connected."
            : "Checkout could not be started. Stock may have changed.";
          checkoutNote.textContent=message;
          throw new Error(message);
        }
        pendingLocalOrderId=data.order_number ? data.id || null : null;
        // The backend returns the PayPal order id as id. Store the local order id separately below.
        pendingLocalOrderId=data.local_order_id || pendingLocalOrderId;
        window.__slimeLocalOrderId=data.local_order_id || null;
        return data.id;
      },
      async onApprove(data){
        const localOrderId=window.__slimeLocalOrderId || pendingLocalOrderId;
        checkoutNote.textContent="Confirming your payment…";
        const res=await fetch(`${CHECKOUT_API_BASE}/collectables-capture-order`,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            paypal_order_id:data.orderID,
            local_order_id:localOrderId
          })
        });
        const result=await res.json();
        if(!res.ok){
          checkoutNote.textContent="Payment needs checking. Please do not retry repeatedly — contact me if PayPal shows a charge.";
          throw new Error(result?.error || "capture_failed");
        }
        cart.clear();
        pendingLocalOrderId=null;
        window.__slimeLocalOrderId=null;
        renderCart();
        checkoutNote.textContent=`Payment confirmed. Your order number is ${result.order_number}. Thank you! 💚`;
      },
      onCancel(){
        checkoutNote.textContent="Checkout cancelled. Your basket is still here.";
      },
      onError(){
        checkoutNote.textContent="PayPal checkout hit an error. No order has been marked paid.";
      }
    });
    paypalButtons.render("#paypal-button-container");
    if(DEMO_MODE){const container=document.querySelector("#paypal-button-container");if(container)container.style.opacity=".72"}
  };
  document.head.append(script);
}

async function loadCatalog(){
  try{
    const res=await fetch(`${CHECKOUT_API_BASE}/collectables-catalog`,{cache:"no-store"});
    if(!res.ok) throw new Error("catalog_fetch_failed");
    const data=await res.json();
    if(!Array.isArray(data.products) || !data.products.length) return;

    const mapped=data.products.map((p,index)=>({
      id:p.id,
      game:p.game,
      gameLabel:p.game==="pokemon"?"Pokémon":"Yu-Gi-Oh!",
      type:p.product_type,
      typeLabel:p.product_type.charAt(0).toUpperCase()+p.product_type.slice(1),
      name:p.name,
      set:p.set_name||"",
      condition:p.condition||"",
      notes:p.notes||"",
      price:Number(p.price_pence||0)/100,
      stock:Number(p.available_stock||0),
      newest:1000-index,
      imageUrl:p.image_url||"",
      marketSource:"",
      marketUpdated:"",
      tags:[
        ...(p.is_new?["new"]:[]),
        ...(p.is_slime_pick?["picks"]:[])
      ]
    }));

    inventory.splice(0,inventory.length,...mapped);
    usingLiveCatalog=true;
    renderProducts();
    renderCart();
  }catch(err){
    console.warn("Using demo catalogue until live inventory is available.");
  }
}

renderProducts();renderCart();loadCatalog();loadPayPal();


function applyUrlFilter(){
  const params=new URLSearchParams(window.location.search);
  const filter=params.get("filter");
  if(!filter) return;
  const allowed=new Set([
    "all",
    "game:yugioh","game:pokemon",
    "type:single","type:sealed","type:graded","type:bundle",
    "tag:new","tag:picks"
  ]);
  if(!allowed.has(filter)) return;
  activeFilter=filter;
  document.querySelectorAll("[data-filter]").forEach(button=>{
    button.classList.toggle("active",button.dataset.filter===filter);
  });
  renderProducts();
  if(window.location.hash==="#shop"){
    setTimeout(()=>document.querySelector("#shop")?.scrollIntoView({block:"start"}),80);
  }
}
applyUrlFilter();
