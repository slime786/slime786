const PAYPAL_CLIENT_ID = ""; // Public browser Client ID only. Add later when PayPal is connected.
const PAYPAL_MODE = "sandbox";
const DEMO_MODE = true;
const CHECKOUT_API_BASE = "https://cbqtqcnudwnlfxtlrioz.supabase.co/functions/v1";
let pendingLocalOrderId = null;
let usingLiveCatalog = false;

const inventory = [
  {
    id:"demo-ygo-blue-eyes-sdk",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"single",typeLabel:"Single",
    name:"Blue-Eyes White Dragon — SDK-001 Unlimited",set:"Starter Deck: Kaiba · Ultra Rare",
    condition:"Near Mint guide",notes:"Preview stock only. Vintage starter-deck Blue-Eyes market guide; exact copy/condition would change the value.",
    price:55.98,stock:1,newest:24,tags:["new","picks"],marketSource:"PriceCharting / TCGPlayer + GBP conversion",marketUpdated:"24 Sep 2026",
    imageUrl:"https://cdn.openart.ai/openart-uploads/production/attachment-transfers/94b2dc929192ec4ff720f007f722c3a84dc8dd781d4c537c5f0d997f932dc537.jpg"
  },
  {
    id:"demo-ygo-dark-magician-sdy",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"single",typeLabel:"Single",
    name:"Dark Magician — SDY-006 Unlimited",set:"Starter Deck: Yugi · Ultra Rare",
    condition:"Near Mint guide",notes:"Preview stock only. Classic Starter Deck: Yugi printing; condition has a large effect on vintage value.",
    price:18.11,stock:1,newest:23,tags:["new"],marketSource:"PriceCharting / TCGPlayer + GBP conversion",marketUpdated:"24 Sep 2026",
    imageUrl:"https://cdn.openart.ai/openart-uploads/production/attachment-transfers/a04782a1cc080b1bfbf8382b65b2c1f6a874b23bbd526a2597676cc19661fc11.jpg"
  },
  {
    id:"demo-ygo-red-eyes-sdj",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"single",typeLabel:"Single",
    name:"Red-Eyes Black Dragon — SDJ-001 1st Edition",set:"Starter Deck: Joey · Ultra Rare",
    condition:"Raw market guide",notes:"Preview stock only. Representative 1st Edition guide based on recent sold-market data.",
    price:18.12,stock:1,newest:22,tags:["picks"],marketSource:"PriceCharting sold comps + GBP conversion",marketUpdated:"24 Sep 2026",
    imageUrl:"https://cdn.openart.ai/openart-uploads/production/attachment-transfers/35aa5f3c475f3207116f512e3a7f3b4f8c5c68d7c5cd11b60afc073189bbff30.jpg"
  },
  {
    id:"demo-ygo-dmg-mp24",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"single",typeLabel:"Single",
    name:"Dark Magician Girl — MP24-EN053",set:"25th Anniversary Tin: Dueling Mirrors · Prismatic Secret Rare",
    condition:"Near Mint guide",notes:"Preview stock only. Alternate-art Dark Magician Girl market guide.",
    price:12.69,stock:1,newest:21,tags:["new","picks"],marketSource:"PriceCharting / TCGPlayer + GBP conversion",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.ygoprodeck.com/images/cards/38033121.jpg"
  },
  {
    id:"demo-ygo-stardust-tdgs",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"single",typeLabel:"Single",
    name:"Stardust Dragon — TDGS-EN040",set:"The Duelist Genesis · Ultra Rare",
    condition:"Raw market guide",notes:"Preview stock only. Unlimited Ultra Rare guide; 1st Edition and Ultimate Rare copies are much higher.",
    price:25.12,stock:1,newest:20,tags:["picks"],marketSource:"PriceCharting + GBP conversion",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.ygoprodeck.com/images/cards/44508094.jpg"
  },
  {
    id:"demo-ygo-black-rose-csoc",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"single",typeLabel:"Single",
    name:"Black Rose Dragon — CSOC-EN039",set:"Crossroads of Chaos · Ultra Rare",
    condition:"Raw market guide",notes:"Preview stock only. Original-set Ultra Rare market guide.",
    price:7.71,stock:1,newest:19,tags:["new"],marketSource:"PriceCharting + GBP conversion",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.ygoprodeck.com/images/cards/73580471.jpg"
  },
  {
    id:"demo-ygo-qcst-box",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"sealed",typeLabel:"Sealed",
    name:"Quarter Century Stampede — Booster Box",set:"24 packs · 5 cards per pack",
    condition:"Factory Sealed",notes:"Preview stock only. UK sealed retail guide for a full booster box.",
    price:94.95,stock:1,newest:18,tags:["new","picks"],marketSource:"Gathering Games / Romulus Games UK",marketUpdated:"Sep 2026",
    imageUrl:"https://www.tcgstars.nl/cdn/shop/files/Yu-Gi-OhQuarterCenturyStampedeBoosterBox.webp?v=1771928437&width=1200"
  },
  {
    id:"demo-ygo-rarity2-box",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"sealed",typeLabel:"Sealed",
    name:"25th Anniversary Rarity Collection II — Booster Box",set:"24 packs · all-foil set",
    condition:"Factory Sealed",notes:"Preview stock only. UK sealed retail guide; retailer pricing varies.",
    price:109.95,stock:1,newest:17,tags:["picks"],marketSource:"Romulus Games UK",marketUpdated:"Sep 2026",
    imageUrl:"https://levelupstore.co.za/cdn/shop/files/YGO-183991_1_2048x.jpg?v=1715003069"
  },
  {
    id:"demo-ygo-blue-eyes-destiny",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"sealed",typeLabel:"Sealed",
    name:"Blue-Eyes White Destiny — Structure Deck",set:"English 1st Edition Structure Deck",
    condition:"Factory Sealed",notes:"Preview stock only. Current UK comparison-price guide for a sealed deck.",
    price:13.53,stock:1,newest:16,tags:["new"],marketSource:"Idealo UK comparison",marketUpdated:"Sep 2026",
    imageUrl:"https://media.gamestop.com/i/gamestop/20018883/Yu-Gi-Oh-Trading-Card-Game-Blue-Eyes-White-Destiny-Structure-Deck?fmt=auto&h=900&w=900"
  },
  {
    id:"demo-ygo-dmg-psa10",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"graded",typeLabel:"Graded",
    name:"Dark Magician Girl — MP24-EN053 · PSA 10",set:"25th Anniversary Tin: Dueling Mirrors",
    condition:"PSA 10 guide",notes:"Preview slab only. Guide based on current graded market index; cert/population can change realised value.",
    price:117.03,stock:1,newest:15,tags:["picks"],marketSource:"PriceCharting PSA 10 + GBP conversion",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.ygoprodeck.com/images/cards/38033121.jpg"
  },
  {
    id:"demo-ygo-stardust-psa10",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"graded",typeLabel:"Graded",
    name:"Stardust Dragon — TDGS-EN040 · PSA 10",set:"The Duelist Genesis · Ultra Rare",
    condition:"PSA 10 guide",notes:"Preview slab only. This guide is for the standard Ultra Rare, not the far more valuable 1st Edition Ultimate Rare.",
    price:131.86,stock:1,newest:14,tags:["new"],marketSource:"PriceCharting PSA 10 + GBP conversion",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.ygoprodeck.com/images/cards/44508094.jpg"
  },
  {
    id:"demo-ygo-starter-trio",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"bundle",typeLabel:"Bundle",
    name:"Starter Deck Nostalgia Trio",set:"Blue-Eyes SDK · Dark Magician SDY · Red-Eyes SDJ",
    condition:"Mixed raw guide",notes:"Preview three-card bundle only. Guide combines the three representative raw market values shown in this demo catalogue.",
    price:92.21,stock:1,newest:13,tags:["picks"],marketSource:"Combined demo market guides",marketUpdated:"24 Sep 2026",
    imageUrl:"https://cdn.openart.ai/openart-uploads/production/attachment-transfers/94b2dc929192ec4ff720f007f722c3a84dc8dd781d4c537c5f0d997f932dc537.jpg"
  },

  {
    id:"demo-pkm-charizard-199",game:"pokemon",gameLabel:"Pokémon",type:"single",typeLabel:"Single",
    name:"Charizard ex — 199/165",set:"Scarlet & Violet—151 · Special Illustration Rare",
    condition:"Raw market guide",notes:"Preview stock only. Current UK raw-card market snapshot.",
    price:306.02,stock:1,newest:12,tags:["new","picks"],marketSource:"CardMetric UK",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.pokemontcg.io/sv3pt5/199_hires.png"
  },
  {
    id:"demo-pkm-blastoise-200",game:"pokemon",gameLabel:"Pokémon",type:"single",typeLabel:"Single",
    name:"Blastoise ex — 200/165",set:"Scarlet & Violet—151 · Special Illustration Rare",
    condition:"Raw market guide",notes:"Preview stock only. UK market guide based on live listing/comps data.",
    price:113.46,stock:1,newest:11,tags:["picks"],marketSource:"CardMetric UK",marketUpdated:"16 Sep 2026",
    imageUrl:"https://images.pokemontcg.io/sv3pt5/200_hires.png"
  },
  {
    id:"demo-pkm-venusaur-198",game:"pokemon",gameLabel:"Pokémon",type:"single",typeLabel:"Single",
    name:"Venusaur ex — 198/165",set:"Scarlet & Violet—151 · Special Illustration Rare",
    condition:"Raw market guide",notes:"Preview stock only. Current UK market snapshot.",
    price:92.23,stock:1,newest:10,tags:["new"],marketSource:"CardMetric UK",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.pokemontcg.io/sv3pt5/198_hires.png"
  },
  {
    id:"demo-pkm-zapdos-202",game:"pokemon",gameLabel:"Pokémon",type:"single",typeLabel:"Single",
    name:"Zapdos ex — 202/165",set:"Scarlet & Violet—151 · Special Illustration Rare",
    condition:"Raw market guide",notes:"Preview stock only. Current UK market snapshot.",
    price:92.99,stock:1,newest:9,tags:["picks"],marketSource:"CardMetric UK",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.pokemontcg.io/sv3pt5/202_hires.png"
  },
  {
    id:"demo-pkm-pikachu-173",game:"pokemon",gameLabel:"Pokémon",type:"single",typeLabel:"Single",
    name:"Pikachu — 173/165",set:"Scarlet & Violet—151 · Illustration Rare",
    condition:"Raw market guide",notes:"Preview stock only. Current UK Illustration Rare market guide.",
    price:72.94,stock:1,newest:8,tags:["new","picks"],marketSource:"CardMetric UK",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.pokemontcg.io/sv3pt5/173_hires.png"
  },
  {
    id:"demo-pkm-mew-205",game:"pokemon",gameLabel:"Pokémon",type:"single",typeLabel:"Single",
    name:"Mew ex — 205/165",set:"Scarlet & Violet—151 · Hyper Rare",
    condition:"Raw market guide",notes:"Preview stock only. Gold Hyper Rare market snapshot; values can move quickly.",
    price:65.80,stock:1,newest:7,tags:["new"],marketSource:"CardMetric UK",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.pokemontcg.io/sv3pt5/205_hires.png"
  },
  {
    id:"demo-pkm-151-etb",game:"pokemon",gameLabel:"Pokémon",type:"sealed",typeLabel:"Sealed",
    name:"Scarlet & Violet—151 Elite Trainer Box",set:"9 booster packs · Snorlax promo",
    condition:"Factory Sealed",notes:"Preview stock only. Current sealed-market guide; individual UK shop asks can differ widely.",
    price:372.83,stock:1,newest:6,tags:["picks"],marketSource:"PokeValues sealed market",marketUpdated:"23 Sep 2026",
    imageUrl:"https://common-lands.com/cdn/shop/files/151-elite-trainer-box_a9dbb9e4-3d83-4a8a-a1f2-e28c264bd910.png?v=1778432473"
  },
  {
    id:"demo-pkm-151-booster-bundle",game:"pokemon",gameLabel:"Pokémon",type:"sealed",typeLabel:"Sealed",
    name:"Scarlet & Violet—151 Booster Bundle",set:"6 booster packs",
    condition:"Factory Sealed",notes:"Preview stock only. Current sealed-market guide for a single booster bundle.",
    price:124.02,stock:1,newest:5,tags:["new"],marketSource:"PokeValues sealed market",marketUpdated:"23 Sep 2026",
    imageUrl:"https://www.stompinggroundstcg.com/cdn/shop/files/Scarlet_Violet151BoosterBundle.webp?v=1689626358"
  },
  {
    id:"demo-pkm-151-upc",game:"pokemon",gameLabel:"Pokémon",type:"sealed",typeLabel:"Sealed",
    name:"Scarlet & Violet—151 Ultra-Premium Collection",set:"Mew UPC · premium sealed collection",
    condition:"Factory Sealed",notes:"Preview stock only. Current sealed-market guide; retailer stock and asking prices vary.",
    price:690.12,stock:1,newest:4,tags:["picks"],marketSource:"PokeValues sealed market",marketUpdated:"20 Sep 2026",
    imageUrl:"https://cdn.shopify.com/s/files/1/0892/8631/2299/files/151UltraPremiumCollection.png?format=webp&v=1738988277"
  },
  {
    id:"demo-pkm-charizard-psa10",game:"pokemon",gameLabel:"Pokémon",type:"graded",typeLabel:"Graded",
    name:"Charizard ex — 199/165 · PSA 10",set:"Scarlet & Violet—151 · Special Illustration Rare",
    condition:"PSA 10 estimate",notes:"Preview slab only. Indicative CardMetric graded estimate, not a guaranteed sold price.",
    price:955.50,stock:1,newest:3,tags:["new","picks"],marketSource:"CardMetric UK graded estimate",marketUpdated:"11 Sep 2026",
    imageUrl:"https://images.pokemontcg.io/sv3pt5/199_hires.png"
  },
  {
    id:"demo-pkm-blastoise-psa10",game:"pokemon",gameLabel:"Pokémon",type:"graded",typeLabel:"Graded",
    name:"Blastoise ex — 200/165 · PSA 10",set:"Scarlet & Violet—151 · Special Illustration Rare",
    condition:"PSA 10 estimate",notes:"Preview slab only. Indicative graded estimate before fees/condition considerations.",
    price:340.38,stock:1,newest:2,tags:["picks"],marketSource:"CardMetric UK graded estimate",marketUpdated:"16 Sep 2026",
    imageUrl:"https://images.pokemontcg.io/sv3pt5/200_hires.png"
  },
  {
    id:"demo-pkm-kanto-ir-trio",game:"pokemon",gameLabel:"Pokémon",type:"bundle",typeLabel:"Bundle",
    name:"151 Kanto Starter Illustration Rare Trio",set:"Bulbasaur 166 · Charmander 168 · Squirtle 170",
    condition:"Raw market guide",notes:"Preview three-card bundle only. Guide combines current UK component values.",
    price:215.14,stock:1,newest:1,tags:["picks"],marketSource:"CardMetric UK component guides",marketUpdated:"24 Sep 2026",
    imageUrl:"https://images.pokemontcg.io/sv3pt5/168_hires.png"
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
const productDialog = document.querySelector("#product-dialog");
const productDialogClose = document.querySelector("#product-dialog-close");
let productDialogReturnFocus = null;

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
    const productImg=node.querySelector(".product-photo");
    const photoFallback=photo.querySelector("span");
    if(item.imageUrl && productImg){
      productImg.src=item.imageUrl;
      productImg.alt=item.name;
      productImg.hidden=false;
      productImg.style.objectFit=item.imageFit||"contain";
      productImg.style.objectPosition=item.imagePosition||"center";
      photoFallback.hidden=true;
      productImg.addEventListener("error",()=>{
        productImg.hidden=true;
        photoFallback.hidden=false;
        photo.classList.add("image-failed");
      },{once:true});
    }
    const demoBadge=node.querySelector(".demo-badge");
    if(demoBadge) demoBadge.hidden=usingLiveCatalog;
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
    const detailsButton=node.querySelector(".details-button");
    if(detailsButton) detailsButton.addEventListener("click",()=>openProductDetails(item,detailsButton));
    const addButton=node.querySelector(".add-button");
    addButton.textContent=(DEMO_MODE || !usingLiveCatalog)?"Preview basket":"Add to basket";
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

function openProductDetails(item,trigger){
  if(!productDialog)return;
  productDialogReturnFocus=trigger || document.activeElement;
  const image=productDialog.querySelector("#product-dialog-image");
  image.src=item.imageUrl || "";
  image.alt=item.name;
  image.hidden=!item.imageUrl;
  productDialog.querySelector("#product-dialog-category").textContent=displayCategory(item);
  productDialog.querySelector("#product-dialog-title").textContent=item.name;
  productDialog.querySelector("#product-dialog-set").textContent=item.set || "";
  productDialog.querySelector("#product-dialog-condition").textContent=item.condition || "See listing notes";
  productDialog.querySelector("#product-dialog-notes").textContent=item.notes || "";
  const market=productDialog.querySelector("#product-dialog-market");
  market.textContent=item.marketSource
    ? `Market guide · ${item.marketSource} · ${item.marketUpdated || "recent"}`
    : "";
  market.hidden=!item.marketSource;
  productDialog.querySelector("#product-dialog-price").textContent=money(item.price);
  productDialog.querySelector("#product-dialog-preview").hidden=usingLiveCatalog;
  if(typeof productDialog.showModal==="function") productDialog.showModal();
  else productDialog.setAttribute("open","");
}

function closeProductDetails(){
  if(!productDialog)return;
  if(typeof productDialog.close==="function" && productDialog.open) productDialog.close();
  else productDialog.removeAttribute("open");
  productDialogReturnFocus?.focus?.();
  productDialogReturnFocus=null;
}

productDialogClose?.addEventListener("click",closeProductDetails);
productDialog?.addEventListener("click",event=>{
  const rect=productDialog.getBoundingClientRect();
  const inside=event.clientX>=rect.left && event.clientX<=rect.right && event.clientY>=rect.top && event.clientY<=rect.bottom;
  if(!inside) closeProductDetails();
});
productDialog?.addEventListener("cancel",event=>{
  event.preventDefault();
  closeProductDetails();
});

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

function isLocalSandboxCheckout(){
  return DEMO_MODE
    && PAYPAL_MODE==="sandbox"
    && ["localhost","127.0.0.1"].includes(window.location.hostname);
}

function updateCheckoutState(qty=0){
  const paypalContainer=document.querySelector("#paypal-button-container");
  const localSandbox=isLocalSandboxCheckout();
  const readyForPayPal=usingLiveCatalog
    && Boolean(PAYPAL_CLIENT_ID)
    && qty>0
    && (!DEMO_MODE || localSandbox);

  checkoutButton.hidden=readyForPayPal;
  checkoutButton.disabled=true;
  if(paypalContainer) paypalContainer.hidden=!readyForPayPal;

  if(DEMO_MODE && !localSandbox){
    checkoutButton.textContent="Preview checkout";
    checkoutNote.textContent="Preview mode only — no payment will be taken.";
  }else if(localSandbox && !usingLiveCatalog){
    checkoutButton.textContent="Sandbox waiting for test stock";
    checkoutNote.textContent="Local PayPal sandbox testing waits for secure catalog test stock.";
  }else if(!usingLiveCatalog){
    checkoutButton.textContent="Checkout unavailable";
    checkoutNote.textContent="Checkout waits for verified live inventory.";
  }else if(!PAYPAL_CLIENT_ID){
    checkoutButton.textContent="PayPal not configured";
    checkoutNote.textContent="PayPal Client ID still needs to be connected.";
  }else if(qty===0){
    checkoutButton.textContent="Pay with PayPal";
    checkoutNote.textContent="Add an item to your basket to continue.";
  }else{
    checkoutNote.textContent=PAYPAL_MODE==="sandbox"
      ?"PayPal sandbox checkout is ready for testing."
      :"Secure PayPal checkout is ready.";
  }
}

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
  updateCheckoutState(qty);
}

function openCart(){cartDrawer.classList.add("open");cartDrawer.setAttribute("aria-hidden","false");backdrop.hidden=false;document.querySelector("#cart-open").setAttribute("aria-expanded","true")}
function closeCart(){cartDrawer.classList.remove("open");cartDrawer.setAttribute("aria-hidden","true");backdrop.hidden=true;document.querySelector("#cart-open").setAttribute("aria-expanded","false")}

document.querySelector("#cart-open").addEventListener("click",openCart);
document.querySelector("#cart-close").addEventListener("click",closeCart);
backdrop.addEventListener("click",closeCart);
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCart();closeMobileMenu();closeProductDetails()}});

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
  if(!PAYPAL_CLIENT_ID){updateCheckoutState(cartCount ? Number(cartCount.textContent||0) : 0);return}
  if(PAYPAL_MODE==="sandbox" && (!DEMO_MODE || isLocalSandboxCheckout())) checkoutNote.textContent="PayPal sandbox is prepared for testing.";
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
    updateCheckoutState(cartCount ? Number(cartCount.textContent||0) : 0);
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
