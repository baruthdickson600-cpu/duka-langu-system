// ============================================================
// Jaribio la HISTORIA YA MAUZO
//
// Mteja alilalamika: "nikiangalia mauzo kwanzia tarehe 1, mfumo
// unanionyesha kwanzia tarehe 4. Kesho utanionyesha kwanzia
// tarehe 5."
//
// Sababu: Supabase inarudisha safu 1000 PEKEE kwa kila ombi,
// bila kosa lolote. Mauzo yanapangwa mapya-kwanza, kwa hiyo
// yanapozidi 1000, ya zamani yanakatwa. Kila siku mpya ya mauzo
// inasukuma siku moja ya zamani nje ya historia.
//
// Jaribio hili linaunda mauzo ya siku 30 — zaidi ya 1000 — na
// kuhakikisha SIKU ZOTE zinaonekana.
// ============================================================
const {chromium}=require('/opt/npm-tools/node_modules/playwright');

const SIKU=30, KWA_SIKU=50;          // 1,500 — zaidi ya kikomo cha 1000
const BIZ='b-1', OWNER='u-owner';

const tarehe=(n)=>{                   // n=0 ni leo, n=29 ni siku 29 zilizopita
  const d=new Date(); d.setUTCHours(10,0,0,0); d.setUTCDate(d.getUTCDate()-n);
  return d.toISOString();
};
const siku=(n)=>tarehe(n).slice(0,10);

const mauzo=[];
for(let n=0;n<SIKU;n++)
  for(let i=0;i<KWA_SIKU;i++)
    mauzo.push({id:`s-${n}-${i}`,business_id:BIZ,seller_id:OWNER,seller_name:'Baruth',
      items:[{name:'Sukari',qty:1,price:2000}],subtotal:2000,discount:0,total:2000,profit:600,
      payment_method:'cash',created_at:tarehe(n)});

const db={
  businesses:[{id:BIZ,name:'Duka la Baruth',owner_id:OWNER,plan:'premium',token_active:true,
    token_expiry:'2027-01-01'}],
  users:[{id:OWNER,business_id:BIZ,role:'office',name:'Baruth',email:'o@x.com',is_active:true}],
  sales:mauzo,
  products:[],orders:[],returns:[],stock_history:[],customers:[],expenses:[],
  credit_transactions:[],wakala_lines:[],wakala_tx:[],wakala_days:[],wakala_settings:[],
  support_tickets:[],ticket_messages:[],settings:[],
};

async function run(jina,fn){
  const b=await chromium.launch();
  const p=await (await b.newContext()).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
  await p.addInitScript(s=>{window.__seed=s},{db,uid:OWNER,role:'office'});
  let ok=true,ujumbe='';
  try{
    await p.goto('http://localhost:4500/',{waitUntil:'domcontentloaded'});
    await p.waitForSelector('#ready',{timeout:20000});
    await p.waitForTimeout(1200);
    const r=await fn(p);
    if(r&&r.bad){ok=false;ujumbe=r.bad}
  }catch(e){ok=false;ujumbe=e.message.slice(0,160)}
  if(errs.length){ok=false;ujumbe=(ujumbe?ujumbe+' | ':'')+'JS: '+errs.slice(0,2).join(' ; ')}
  console.log((ok?'  OK   ':'  FAIL ')+jina+(ujumbe?' -> '+ujumbe:''));
  await b.close();
  return ok;
}

(async()=>{
  const m=[];

  m.push(await run('1. mauzo YOTE yanapakiwa, si 1000 ya mwisho',async p=>{
    const n=await p.evaluate(()=>(window.__app.sales||[]).length);
    if(n<SIKU*KWA_SIKU)return{bad:`yamepakiwa ${n} kati ya ${SIKU*KWA_SIKU} — historia imekatwa`};
    return{};
  }));

  m.push(await run('2. kila siku ya mwezi ina mauzo yake',async p=>{
    const zilizopo=await p.evaluate(()=>{
      const s=new Set();(window.__app.sales||[]).forEach(x=>s.add(String(x.created_at).slice(0,10)));
      return [...s];
    });
    const tarajiwa=[...Array(SIKU).keys()].map(siku);
    const pungufu=tarajiwa.filter(d=>!zilizopo.includes(d));
    if(pungufu.length)
      return{bad:`siku ${pungufu.length} hazina mauzo kabisa: ${pungufu.slice(0,3).join(', ')}…`};
    return{};
  }));

  m.push(await run('3. siku ya kwanza kabisa inaonekana',async p=>{
    const kuukuu=siku(SIKU-1);
    const ipo=await p.evaluate(d=>(window.__app.sales||[]).some(x=>String(x.created_at).startsWith(d)),kuukuu);
    if(!ipo)return{bad:`mauzo ya ${kuukuu} hayapo — ndiyo yaliyokatwa kwanza`};
    return{};
  }));

  m.push(await run('4. jumla ya mwezi ni sahihi',async p=>{
    const j=await p.evaluate(()=>(window.__app.sales||[]).reduce((n,s)=>n+(s.total||0),0));
    const sahihi=SIKU*KWA_SIKU*2000;
    if(j!==sahihi)return{bad:`jumla ${j.toLocaleString()} badala ya ${sahihi.toLocaleString()}`};
    return{};
  }));

  m.push(await run('5. mfumo unajua kama historia imekatwa',async p=>{
    const k=await p.evaluate(()=>window.__app.historiaImekatwa);
    if(k===undefined)return{bad:'hakuna alama ya kuonyesha historia imekatwa'};
    if(k===true)return{bad:'inasema imekatwa ingawa mauzo yote yamepakiwa'};
    return{};
  }));

  const bad=m.filter(x=>!x).length;
  console.log(bad?`\n${bad}/${m.length} zimeshindwa`:`\nZote ${m.length} ni sawa`);
  process.exit(bad?1:0);
})();
