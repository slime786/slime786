const PAYPAL_CLIENT_ID = ""; // Add a real PayPal client ID before enabling checkout.
const DEMO_MODE = true;

const inventory = [
  {id:"ygo-001",game:"Yu-Gi-Oh!",kind:"yugioh-single",type:"Single",name:"Demo Yu-Gi-Oh! Single",set:"Binder demo",condition:"Near Mint",notes:"Replace with the exact card name, set/code, rarity, condition notes and your own photos.",price:12.50,stock:1,newest:4},
  {id:"pkm-001",game:"Pokémon",kind:"pokemon-single",type:"Single",name:"Demo Pokémon Single",set:"Binder demo",condition:"Lightly Played",notes:"Use front/back photos of the exact copy. Add whitening, print line or surface notes where relevant.",price:18.00,stock:1,newest:3},
  {id:"ygo-sealed-001",game:"Yu-Gi-Oh!",kind:"yugioh-sealed",type:"Sealed",name:"Demo Yu-Gi-Oh! Sealed Item",set:"Sealed demo",condition:"Factory Sealed",notes:"For boxes, tins, packs or decks: note seal tears, dents, wrap condition and any shelf wear.",price:44.99,stock:1,newest:2},
  {id:"pkm-sealed-001",game:"Pokémon",kind:"pokemon-sealed",type:"Sealed",name:"Demo Pokémon Sealed Item",set:"Sealed demo",condition:"Factory Sealed",notes:"Ideal for ETBs, booster boxes, tins, collections or packs. Replace with exact product photos and details.",price:54.99,stock:1,newest:1}
];

let activeCategory = "all";
let sortMode = "featured";
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
const checkoutButton = document.querySelector("#checkout-button");
const checkoutNote = document.querySelector("#checkout-note");

function money(value){return new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(value)}

function displayCategory(item){return `${item.game} · ${item.type}`}

function renderProducts(){
  const filtered = inventory.filter(item => activeCategory === "all" || item.kind === activeCategory);
  const items = [...filtered].sort((a,b)=>{
    if(sortMode === "price-low") return a.price-b.price;
    if(sortMode === "price-high") return b.price-a.price;
    if(sortMode === "newest") return b.newest-a.newest;
    return a.newest-b.newest;
  });
  grid.innerHTML = "";
  if(!items.length){grid.innerHTML = '<div class="no-products">Nothing in this category yet. More binder stock is coming.</div>';return}
  items.forEach(item=>{
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.kind = item.kind;
    node.querySelector(".product-image").textContent = item.type === "Sealed" ? "SEALED ITEM PHOTO" : "EXACT CARD PHOTO";
    node.querySelector(".condition-badge").textContent = item.condition;
    node.querySelector(".category").textContent = displayCategory(item);
    node.querySelector(".set").textContent = item.set;
    node.querySelector("h3").textContent = item.name;
    node.querySelector(".card-notes").textContent = item.notes;
    node.querySelector(".price").textContent = money(item.price);
    const add = node.querySelector(".add-button");
    add.addEventListener("click",()=>addToCart(item.id));
    grid.append(node);
  });
}

function addToCart(id){
  const item = inventory.find(x=>x.id===id);
  if(!item) return;
  const current = cart.get(id) || 0;
  if(current >= item.stock) return;
  cart.set(id,current+1);
  renderCart();
  openCart();
}

function removeFromCart(id){cart.delete(id);renderCart()}

function renderCart(){
  cartItems.innerHTML="";
  let qty=0,total=0;
  cart.forEach((count,id)=>{
    const item=inventory.find(x=>x.id===id);if(!item)return;
    qty += count; total += item.price*count;
    const row=document.createElement("div");row.className="cart-line";
    row.innerHTML=`<div><strong>${item.name}</strong><small>${displayCategory(item)} · Qty ${count}</small></div><div><strong>${money(item.price*count)}</strong><br><button type="button">Remove</button></div>`;
    row.querySelector("button").addEventListener("click",()=>removeFromCart(id));
    cartItems.append(row);
  });
  cartCount.textContent=qty;
  cartSubtotal.textContent=money(total);
  cartTotal.textContent=money(total);
  cartEmpty.hidden=qty>0;
  checkoutButton.disabled = qty===0 || DEMO_MODE || !PAYPAL_CLIENT_ID;
}

function openCart(){cartDrawer.classList.add("open");cartDrawer.setAttribute("aria-hidden","false");backdrop.hidden=false;document.querySelector("#cart-open").setAttribute("aria-expanded","true")}
function closeCart(){cartDrawer.classList.remove("open");cartDrawer.setAttribute("aria-hidden","true");backdrop.hidden=true;document.querySelector("#cart-open").setAttribute("aria-expanded","false")}

document.querySelector("#cart-open").addEventListener("click",openCart);
document.querySelector("#cart-close").addEventListener("click",closeCart);
backdrop.addEventListener("click",closeCart);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCart()});

document.querySelectorAll("[data-category]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-category]").forEach(b=>b.classList.remove("active"));
  button.classList.add("active");activeCategory=button.dataset.category;renderProducts();
}));

document.querySelector("#sort-select").addEventListener("change",e=>{sortMode=e.target.value;renderProducts()});

function loadPayPal(){
  if(DEMO_MODE || !PAYPAL_CLIENT_ID){
    checkoutNote.textContent = "Checkout is intentionally disabled until real inventory and a PayPal Client ID are configured.";
    return;
  }
  const script=document.createElement("script");
  script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=GBP`;
  script.onload=()=>{
    if(!window.paypal) return;
    window.paypal.Buttons({
      createOrder(data,actions){
        const total=[...cart].reduce((sum,[id,count])=>{const item=inventory.find(x=>x.id===id);return sum+(item?item.price*count:0)},0);
        return actions.order.create({purchase_units:[{amount:{currency_code:"GBP",value:total.toFixed(2)}}]});
      },
      onApprove(data,actions){return actions.order.capture().then(()=>{cart.clear();renderCart();checkoutNote.textContent="Payment captured. Add your order-confirmation workflow before launch."})}
    }).render("#paypal-button-container");
  };
  document.head.append(script);
}

renderProducts();renderCart();loadPayPal();
