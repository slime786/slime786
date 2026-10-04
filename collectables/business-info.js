const BUSINESS_INFO_URL = "https://cbqtqcnudwnlfxtlrioz.supabase.co/functions/v1/collectables-public-info";

function setBusinessInfo(data){
  document.querySelectorAll("[data-seller-name]").forEach(el=>{
    el.textContent=data.seller_name || "Slime's Collectables";
  });
  document.querySelectorAll("[data-seller-address]").forEach(el=>{
    el.textContent=data.seller_address || "";
  });
  document.querySelectorAll("[data-contact-email]").forEach(el=>{
    el.textContent=data.contact_email || "";
    if(el instanceof HTMLAnchorElement && data.contact_email){
      el.href=`mailto:${data.contact_email}`;
    }
  });
  document.querySelectorAll("[data-business-info-status]").forEach(el=>{
    el.textContent="";
    el.hidden=true;
  });
}

async function loadBusinessInfo(){
  try{
    const res=await fetch(BUSINESS_INFO_URL,{cache:"no-store"});
    if(!res.ok) throw new Error("business_info_unavailable");
    const data=await res.json();
    if(!data.seller_name || !data.seller_address || !data.contact_email){
      throw new Error("business_info_incomplete");
    }
    setBusinessInfo(data);
  }catch{
    document.querySelectorAll("[data-business-info-status]").forEach(el=>{
      el.hidden=false;
      el.textContent="Seller postal details will be published here before live orders are enabled.";
    });
  }
}

loadBusinessInfo();
