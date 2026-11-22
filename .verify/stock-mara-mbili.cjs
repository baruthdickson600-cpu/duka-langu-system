const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const BIZ='b-1',OWNER='u-owner',SELLER='u-seller';
const db=()=>({
  businesses:[{id:BIZ,name:'Duka',owner_id:OWNER,plan:'premium',token_active:true}],
  users:[{id:OWNER,business_id:BIZ,role:'office',name:'Baruth',email:'o@x.com',is_active:true},
         {id:SELLER,business_id:BIZ,role:'employee',name:'Asha',email:'s@x.com',is_active:true}],
  // Stock ILIKWISHA PUNGUZWA jana: 40 -> 36
  products:[{id:'p1',business_id:BIZ,branch_id:null,name:'Sabuni',buy_price:700,sell_price:1000,quantity:36,unit:'Kipande',min_stock:5}],
  sales:[],orders:[],returns:[],stock_history:[],customers:[],expenses:[],credit_transactions:[],
});
async function run(name,seed,stockApplied,who){
  const b=await chromium.launch();const p=await b.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
  await p.addInitScript(s=>{window.__seed=s},seed);
  await p.goto('http://localhost:4500/',{waitUntil:'networkidle'});
  await p.waitForFunction(()=>window.__app&&window.__offlineDB,null,{timeout:9000}).catch(()=>{});
  await p.waitForTimeout(1200);
  // Weka mauzo yaliyokwama kwenye IndexedDB — kama ya jana
  await p.evaluate(async ({BIZ,who,stockApplied})=>{
    await window.__offlineDB.saveSaleOffline({
      business_id:BIZ, seller_id:who, seller_name:'Asha',
      items:[{productId:'p1',name:'Sabuni',qty:4,price:1000,fraction:1}],
      subtotal:4000,discount:0,total:4000,profit:null,payment_method:'cash',
      created_at:new Date(Date.now()-864e5).toISOString(),
      ...(stockApplied?{stock_applied:true}:{}),
    });
  },{BIZ,who,stockApplied});
  await p.evaluate(async()=>{ await window.__app.triggerSync(); });
  await p.waitForTimeout(2500);
  const out=await p.evaluate(()=>({
    mauzoDB:(window.__db.sales||[]).length,
    stock:(window.__db.products.find(x=>x.id==='p1')||{}).quantity,
  }));
  await b.close();return {name,out,errs};
}
(async()=>{
  const R=[];
  R.push(await run('A. MMILIKI: mauzo ya jana yenye stock_applied (stock ilipungua jana)',
    {db:db(),uid:OWNER,role:'office'}, true, OWNER));
  R.push(await run('B. MUUZAJI (RLS+RPC): mauzo yenye stock_applied',
    {db:db(),uid:SELLER,role:'employee',rls:true,views:true,
     schemaAdd:[['sales','offline_id']],rpcs:['dl_deduct_stock','dl_restore_stock']}, true, SELLER));
  R.push(await run('C. MUUZAJI: mauzo ya offline BILA stock_applied (stock haijapungua)',
    {db:db(),uid:SELLER,role:'employee',rls:true,views:true,
     schemaAdd:[['sales','offline_id']],rpcs:['dl_deduct_stock','dl_restore_stock']}, false, SELLER));
  for(const r of R){
    console.log('\n'+r.name);
    console.log('   mauzo yameingia :',r.out.mauzoDB, r.out.mauzoDB===1?'✅':'❌');
    console.log('   stock 36 ->',r.out.stock);
    if(r.errs.length)console.log('   errors:',r.errs[0]);
  }
  console.log('\nInayotarajiwa: A=36 ✅  B=36 ✅  C=32 ✅ (haikuwa imepungua)');
})();
