const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const BIZ='b-1',OWNER='u-owner';
const baseDB=()=>({
  businesses:[{id:BIZ,name:'Duka',owner_id:OWNER,plan:'premium',token_active:true}],
  users:[{id:OWNER,business_id:BIZ,role:'office',name:'Baruth',email:'o@x.com',is_active:true}],
  products:[],sales:[],orders:[],returns:[],stock_history:[],customers:[],expenses:[],credit_transactions:[],
});
const PR={name:'Sukari',unit:'Kg',category:'Vyakula',image:'📦',buy_price:1500,sell_price:3000,
  wholesale_price:2800,wholesale_min_qty:5,quantity:20,min_stock:5,expiry_date:null};

async function run(name,seed,fn){
  const b=await chromium.launch();const p=await b.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
  await p.addInitScript(s=>{window.__seed=s},seed);
  await p.goto('http://localhost:4500/',{waitUntil:'networkidle'});
  await p.waitForFunction(()=>window.__app,null,{timeout:8000}).catch(()=>{});
  await p.waitForTimeout(1300);
  let out;try{out=await fn(p)}catch(e){out={__err:e.message.slice(0,180)}}
  await b.close();return {name,out,errs};
}
const ongeza=async p=>{
  await p.evaluate(async pr=>{window.__r=await window.__app.addProduct(pr)},PR);
  await p.waitForTimeout(700);
  return p.evaluate(()=>({
    jibu:window.__r?.success,
    kosa:window.__r?.error||null,
    dbIdadi:(window.__db.products||[]).length,
    safu:Object.keys(window.__db.products[0]||{}).filter(k=>['wholesale_price','expiry_date','image'].includes(k)),
  }));
};
(async()=>{
  const R=[];
  R.push(await run('A. Database inakosa safu 4 (wholesale x2, expiry, image)',
    {db:baseDB(),uid:OWNER,role:'office'}, ongeza));
  R.push(await run('B. Database ina safu zote',
    {db:baseDB(),uid:OWNER,role:'office',
     schemaAdd:[['products','wholesale_price'],['products','wholesale_min_qty'],
                ['products','expiry_date'],['products','image']]}, ongeza));
  R.push(await run('C. RLS inazuia (muuzaji anajaribu kuongeza)',
    {db:baseDB(),uid:OWNER,role:'employee',rls:true,views:true}, ongeza));
  for(const r of R){
    console.log('\n'+r.name);
    if(r.out.__err){console.log('   ❌',r.out.__err);continue}
    console.log('   success     :',r.out.jibu);
    console.log('   bidhaa DB   :',r.out.dbIdadi, r.out.dbIdadi>0?'✅':'(haikuingia)');
    console.log('   safu za hiari zilizohifadhiwa:',r.out.safu.join(', ')||'(hakuna)');
    if(r.out.kosa)console.log('   kosa lililorudishwa:',r.out.kosa.slice(0,90));
    if(r.errs.length)console.log('   page errors:',r.errs[0]);
  }
})();
