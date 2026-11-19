const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const BIZ='b-1',OWNER='u-owner',SELLER='u-seller';
const baseDB=()=>({
  businesses:[{id:BIZ,name:'Duka la Baruth',owner_id:OWNER,plan:'premium',token_active:true}],
  users:[{id:OWNER,business_id:BIZ,role:'office',name:'Baruth',email:'o@x.com',is_active:true},
         {id:SELLER,business_id:BIZ,role:'employee',name:'Asha',email:'s@x.com',is_active:true}],
  products:[{id:'p1',business_id:BIZ,branch_id:null,name:'Sabuni',buy_price:700,sell_price:1000,quantity:36,unit:'Kipande',min_stock:5}],
  sales:[],orders:[],returns:[],stock_history:[],customers:[],expenses:[],credit_transactions:[],
});
async function run(seed,fn){
  const b=await chromium.launch();const p=await b.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
  await p.addInitScript(s=>{window.__seed=s},seed);
  await p.goto('http://localhost:4500/',{waitUntil:'networkidle'});
  await p.waitForFunction(()=>window.__app,null,{timeout:8000}).catch(()=>{});
  await p.waitForTimeout(1500);
  let out;try{out=await fn(p)}catch(e){out={__err:e.message.slice(0,200)}}
  await b.close();return {out,errs};
}
(async()=>{
  // ===== F: MAUZO YA MUUZAJI YANAONEKANA KWA MMILIKI? =====
  const db=baseDB();
  db.sales=[{id:'s-asha',business_id:BIZ,seller_id:SELLER,seller_name:'Asha',
    items:[{productId:'p1',name:'Sabuni',qty:4,price:1000,fraction:1}],
    subtotal:4000,discount:0,total:4000,profit:null,payment_method:'cash',
    created_at:new Date().toISOString(),is_synced:true}];
  const F=await run({db,uid:OWNER,role:'office'},async p=>p.evaluate(()=>{
    const s=(window.__app.sales||[])[0]||{};
    return {idadi:(window.__app.sales||[]).length,muuzaji:s.seller_name,
            jumla:s.total,faida:s.profit};
  }));
  console.log('F. MMILIKI anafungua baada ya MUUZAJI kuuza');
  const f=F.out;
  console.log('   mauzo anayoyaona :',f.idadi, f.idadi===1?'✅':'❌');
  console.log('   jina la muuzaji  :',f.muuzaji, f.muuzaji==='Asha'?'✅':'❌');
  console.log('   jumla            :',f.jumla, f.jumla===4000?'✅':'❌');
  console.log('   FAIDA            :',f.faida, f.faida===1200?'✅ (imehesabiwa 4x(1000-700))':'❌');
  if(F.errs.length)console.log('   errors:',F.errs[0]);

  // ===== G: MUUZAJI anaona faida? (HAIPASWI) =====
  const G=await run({db:JSON.parse(JSON.stringify(db)),uid:SELLER,role:'employee',rls:true,views:true,
    rpcs:['dl_deduct_stock','dl_restore_stock']},async p=>p.evaluate(()=>{
    const s=(window.__app.sales||[])[0]||{};
    const pr=(window.__app.products||[])[0]||{};
    return {idadi:(window.__app.sales||[]).length,faida:s.profit,
            itemCost:(s.items||[]).some(i=>'cost'in i||'lineProfit'in i||'buyPrice'in i),
            buyPrice:'buy_price'in pr};
  }));
  const g=G.out;
  console.log('\nG. MUUZAJI anafungua (RLS + view)');
  console.log('   mauzo anayoyaona :',g.idadi, g.idadi===1?'✅':'❌');
  console.log('   faida ya mauzo   :',g.faida===undefined?'haipo ✅':('IPO ❌ '+g.faida));
  console.log('   gharama kwenye items:',g.itemCost?'IPO ❌':'haipo ✅');
  console.log('   bei ya kununua   :',g.buyPrice?'IPO ❌':'haipo ✅');
  if(G.errs.length)console.log('   errors:',G.errs[0]);
})();
