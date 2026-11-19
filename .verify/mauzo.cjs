const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const BIZ='b-1', OWNER='u-owner', SELLER='u-seller';

const baseDB=()=>({
  businesses:[{id:BIZ,name:'Duka la Baruth',owner_id:OWNER,plan:'premium',token_active:true}],
  users:[{id:OWNER,business_id:BIZ,role:'office',name:'Baruth',email:'o@x.com',is_active:true},
         {id:SELLER,business_id:BIZ,role:'employee',name:'Asha',email:'s@x.com',is_active:true}],
  products:[{id:'p1',business_id:BIZ,branch_id:null,name:'Sabuni',buy_price:700,sell_price:1000,quantity:40,unit:'Kipande',min_stock:5},
            {id:'p2',business_id:BIZ,branch_id:null,name:'Sukari',buy_price:1500,sell_price:3000,quantity:20,unit:'Kilo',min_stock:5}],
  sales:[],orders:[],returns:[],stock_history:[],customers:[],expenses:[],credit_transactions:[],
});

const cart=[{productId:'p1',name:'Sabuni',qty:4,price:1000,fraction:1,buyPrice:700}];

async function run(name, seed, fn){
  const b=await chromium.launch();
  const ctx=await b.newContext();
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
  await p.addInitScript(s=>{window.__seed=s},seed);
  await p.goto('http://localhost:4500/',{waitUntil:'networkidle'});
  await p.waitForFunction(()=>window.__app,null,{timeout:8000}).catch(()=>{});
  await p.waitForTimeout(1200);
  let out;
  try{ out=await fn(p) }catch(e){ out={__err:e.message.slice(0,200)} }
  await b.close();
  return {name,out,errs};
}

const uza=async p=>{
  await p.evaluate(async c=>{ window.__r=await window.__app.completeSale(c,0,'cash',null,null,null) },cart);
  await p.waitForTimeout(900);
  return p.evaluate(()=>({
    mauzoDB:(window.__db.sales||[]).length,
    faida:(window.__db.sales[0]||{}).profit,
    jumla:(window.__db.sales[0]||{}).total,
    offlineId:'offline_id' in (window.__db.sales[0]||{}),
    stock:(window.__db.products.find(x=>x.id==='p1')||{}).quantity,
    kosa:window.__r&&window.__r.__error?window.__r.message:null,
    onyoStock:window.__app.stockIssueCount||0,
  }));
};

(async()=>{
  const R=[];

  R.push(await run('A. MMILIKI anauza (database ya zamani, bila offline_id)',
    {db:baseDB(),uid:OWNER,role:'office',schemaDrop:[['sales','offline_id']]}, uza));

  R.push(await run('B. MUUZAJI anauza (database ya zamani) — HII NDIYO ILIYOVUNJIKA',
    {db:baseDB(),uid:SELLER,role:'employee',schemaDrop:[['sales','offline_id']]}, uza));

  R.push(await run('C. MUUZAJI anauza (database mpya, offline_id ipo)',
    {db:baseDB(),uid:SELLER,role:'employee',schemaAdd:[['sales','offline_id']]}, uza));

  R.push(await run('D. MUUZAJI, RLS imewashwa + RPC zipo',
    {db:baseDB(),uid:SELLER,role:'employee',rls:true,views:true,schemaAdd:[['sales','offline_id']],
     rpcs:['dl_deduct_stock','dl_restore_stock','dl_order_update']}, uza));

  R.push(await run('E. MUUZAJI, RLS + view zipo LAKINI RPC HAZIPO',
    {db:baseDB(),uid:SELLER,role:'employee',rls:true,views:true,schemaAdd:[['sales','offline_id']]}, uza));

  for(const r of R){
    console.log('\n'+r.name);
    if(r.out.__err){console.log('   ❌ jaribio limeshindwa:',r.out.__err);continue}
    const o=r.out;
    console.log('   mauzo kwenye DB :',o.mauzoDB, o.mauzoDB===1?'✅':'❌');
    console.log('   jumla           :',o.jumla, o.jumla===4000?'✅':'❌');
    console.log('   faida           :',o.faida);
    console.log('   stock 40 -> ',o.stock, o.stock===36?'✅':'❌');
    console.log('   offline_id DB   :',o.offlineId?'imehifadhiwa':'haipo');
    console.log('   onyo la stock   :',o.onyoStock>0?('✅ ndio ('+o.onyoStock+')'):(o.stock===36?'haihitajiki':'❌ hakuna!'));
    if(o.kosa)console.log('   kosa            :',o.kosa);
    if(r.errs.length)console.log('   page errors     :',r.errs.slice(0,2).join(' | '));
  }
})();
