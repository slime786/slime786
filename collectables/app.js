const PAYPAL_CLIENT_ID = "test";
const PAYPAL_MODE = "sandbox";
const DEMO_MODE = true;

const inventory = [
  {id:"ygo-001",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"single",typeLabel:"Single",name:"Demo Yu-Gi-Oh! Single",set:"Binder demo",condition:"Near Mint",notes:"Replace with the exact card name, set/code, rarity, condition notes and your own photos.",price:12.50,stock:1,newest:8,tags:["new","picks"]},
  {id:"pkm-001",game:"pokemon",gameLabel:"Pokémon",type:"single",typeLabel:"Single",name:"Demo Pokémon Single",set:"Binder demo",condition:"Lightly Played",notes:"Use front/back photos of the exact copy. Add whitening, print line or surface notes where relevant.",price:18.00,stock:1,newest:7,tags:["new"]},
  {id:"ygo-sealed-001",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"sealed",typeLabel:"Sealed",name:"Demo Yu-Gi-Oh! Sealed Item",set:"Sealed demo",condition:"Factory Sealed",notes:"Boxes, tins, packs or decks: note seal tears, dents, wrap condition and shelf wear.",price:44.99,stock:1,newest:6,tags:["picks"]},
  {id:"pkm-sealed-001",game:"pokemon",gameLabel:"Pokémon",type:"sealed",typeLabel:"Sealed",name:"Demo Pokémon Sealed Item",set:"Sealed demo",condition:"Factory Sealed",notes:"Ideal for ETBs, booster boxes, tins, collections or packs. Replace with exact product photos and details.",price:54.99,stock:1,newest:5,tags:["new","picks"]},
  {id:"ygo-graded-001",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"graded",typeLabel:"Graded",name:"Demo Graded Yu-Gi-Oh! Card",set:"Slab demo",condition:"PSA / CGC / BGS",notes:"Use the exact grader, grade, certification number and slab photos when you add real stock.",price:79.99,stock:1,newest:4,tags:["picks"]},
  {id:"pkm-graded-001",game:"pokemon",gameLabel:"Pokémon",type:"graded",typeLabel:"Graded",name:"Demo Graded Pokémon Card",set:"Slab demo",condition:"PSA / CGC / BGS",notes:"Show the exact slab front/back and note scratches or case marks separately from the card grade.",price:89.99,stock:1,newest:3,tags:["new"]},
  {id:"ygo-bundle-001",game:"yugioh",gameLabel:"Yu-Gi-Oh!",type:"bundle",typeLabel:"Bundle",name:"Demo Yu-Gi-Oh! Bundle",set:"Bundle demo",condition:"Mixed",notes:"Useful for playsets, archetype bundles, bulk rares or small collector lots.",price:24.99,stock:1,newest:2,tags:[]},
  {id:"pkm-bundle-001",game:"pokemon",gameLabel:"Pokémon",type:"bundle",typeLabel:"Bundle",name:"Demo Pokémon Bundle",set:"Bundle demo",condition:"Mixed",notes:"Ideal for duplicate holos, themed bundles, collection lots or starter bundles.",price:29.99,stock:1,newest:1,tags:[]}
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
    node.querySelector(".condition-badge").textContent=item.condition;
    const newBadge=node.querySelector(".new-badge");
    if(item.tags.includes("new")) newBadge.hidden=false;
    node.querySelector(".category").textContent=displayCategory(item);
    node.querySelector(".set").textContent=item.set;
    node.querySelector("h3").textContent=item.name;
    node.querySelector(".card-notes").textContent=item.notes;
    node.querySelector(".price").textContent=money(item.price);
    node.querySelector(".add-button").addEventListener("click",()=>addToCart(item.id));
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
      createOrder(data,actions){
        const subtotal=[...cart].reduce((sum,[id,count])=>{const item=inventory.find(x=>x.id===id);return sum+(item?item.price*count:0)},0);
        const hasSealed=[...cart.keys()].some(id=>inventory.find(x=>x.id===id)?.type==="sealed");
        const shipping=subtotal>=100?0:(hasSealed?5.49:3.99);
        return actions.order.create({purchase_units:[{amount:{currency_code:"GBP",value:(subtotal+shipping).toFixed(2)}}]});
      },
      onApprove(data,actions){return actions.order.capture().then(()=>{cart.clear();renderCart();checkoutNote.textContent="Payment captured. Add your order-confirmation workflow before launch."})}
    });
    paypalButtons.render("#paypal-button-container");
    if(DEMO_MODE){const container=document.querySelector("#paypal-button-container");if(container)container.style.opacity=".72"}
  };
  document.head.append(script);
}

renderProducts();renderCart();loadPayPal();
