// ============================================================
// Jaribio la UWAKALA — kivinjari halisi, kurasa halisi
//
// Linajaribu MIANYA YA UPOTEVU WA PESA, si vitufe:
//   1. wakala anaandika kidogo kuliko alivyotoa -> tofauti inakamatwa
//   2. hakuandika kabisa                        -> tofauti inakamatwa
//   3. anataka kufuta muamala                   -> RLS inakataa
//   4. anarejesha muamala mara mbili            -> unique index inakataa
//   5. anaandika kwenye siku iliyofungwa        -> trigger inakataa
//   6. muamala unatumwa mara mbili              -> offline_id inakataa
//   7. kamisheni kubwa kuliko muamala           -> CHECK inakataa
//   8. usajili umeisha                          -> anafunga siku, haandiki
//   9. jedwali halipo                           -> ukurasa hauvunjiki
// ============================================================
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const BIZ='b-1', OWNER='u-owner', SELLER='u-seller';
const L1='ln-mpesa', L2='ln-airtel';

const siku=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString()};
const leo=()=>{const d=new Date();const z=new Date(d.getTime()+3*3600000);return z.toISOString().slice(0,10)};

const baseDB=(o={})=>({
  businesses:[{id:BIZ,name:'Duka la Baruth',owner_id:OWNER,plan:'premium',token_active:true,
    wakala_enabled:o.enabled!==false, wakala_paid_until:o.paidUntil!==undefined?o.paidUntil:siku(20)}],
  users:[{id:OWNER,business_id:BIZ,role:'office',name:'Baruth',email:'o@x.com',is_active:true},
         {id:SELLER,business_id:BIZ,role:'employee',name:'Asha',email:'s@x.com',is_active:true}],
  products:[],sales:[],orders:[],returns:[],stock_history:[],customers:[],expenses:[],credit_transactions:[],
  wakala_lines:[
    {id:L1,business_id:BIZ,name:'M-Pesa',opening_float:500000,active:true,sort_order:0},
    {id:L2,business_id:BIZ,name:'Airtel Money',opening_float:200000,active:true,sort_order:1}],
  wakala_tx:o.tx||[],
  wakala_days:o.days||[],
  wakala_settings:[{business_id:BIZ,cash_opening:100000,threshold:1000}],
});

async function run(name,seed,fn){
  const b=await chromium.launch();
  const p=await (await b.newContext()).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
  await p.addInitScript(s=>{window.__seed=s},seed);
  await p.goto('http://localhost:4500/',{waitUntil:'networkidle'});
  await p.waitForFunction(()=>window.__wk,null,{timeout:9000}).catch(()=>{});
  await p.waitForTimeout(1100);
  let out;
  try{ out=await fn(p) }catch(e){ out={__err:e.message.slice(0,220)} }
  await b.close();
  return {name,out,errs};
}

const andika=(p,tx)=>p.evaluate(async t=>await window.__wk.addTx(t),tx);
const funga=(p,a)=>p.evaluate(async x=>await window.__wk.closeDay(x),a);

(async()=>{
const R=[];

// ---------- 1. Hesabu za kawaida ----------
R.push(await run('1. Miamala ya kawaida — taslimu na float zinabadilika kinyume',
  {db:baseDB(),uid:SELLER,role:'employee',rpcs:['dl_wakala_close_day'],render:'rekodi'},
  async p=>{
    await andika(p,{type:'deposit',amount:50000,commission:800,line_id:L1});
    await andika(p,{type:'withdraw',amount:30000,commission:500,line_id:L1});
    await p.waitForTimeout(500);
    return p.evaluate(()=>({
      idadi:window.__db.wakala_tx.length,
      taslimu:window.__wk.balances.cash,
      float:window.__wk.balances.lines.find(l=>l.name==='M-Pesa').float,
      kamisheni:window.__wk.balances.commission,
      recordedBy:window.__db.wakala_tx[0].recorded_by,
    }));
  }));

// ---------- 2. Upatanisho: ameandika kidogo ----------
R.push(await run('2. Ametoa 50,000 akaandika 30,000 -> ZIADA ya float inakamatwa',
  {db:baseDB(),uid:SELLER,role:'employee',rpcs:['dl_wakala_close_day'],render:'funga'},
  async p=>{
    await andika(p,{type:'withdraw',amount:30000,commission:500,line_id:L1});
    await p.waitForTimeout(400);
    // Halisi: ametoa 50,000 -> float 550,000 (sio 530,000)
    const r=await funga(p,{day:leo(),counted:{[L1]:550000,[L2]:200000},countedCash:150000-50000+0});
    return p.evaluate(x=>{
      const d=window.__db.wakala_days[0]||{};
      return {ok:x.ok,error:x.error,tofautiFloat:d.variance_float,tofautiTaslimu:d.variance_cash,
              inayotarajiwa:(d.lines||{})[Object.keys(d.lines||{})[0]]};
    },r);
  }));

// ---------- 3. Hakuandika kabisa ----------
R.push(await run('3. Hakuandika muamala kabisa -> UPUNGUFU wa float',
  {db:baseDB(),uid:SELLER,role:'employee',rpcs:['dl_wakala_close_day'],render:'funga'},
  async p=>{
    const r=await funga(p,{day:leo(),counted:{[L1]:460000,[L2]:200000},countedCash:100000});
    return p.evaluate(x=>({ok:x.ok,tofautiFloat:(window.__db.wakala_days[0]||{}).variance_float}),r);
  }));

// ---------- 4. Hawezi KUFUTA ----------
R.push(await run('4. Muuzaji anajaribu KUFUTA muamala -> RLS inakataa',
  {db:baseDB(),uid:SELLER,role:'employee',rls:true,rpcs:['dl_wakala_close_day'],render:'rekodi'},
  async p=>{
    await andika(p,{type:'deposit',amount:50000,commission:800,line_id:L1});
    await p.waitForTimeout(400);
    return p.evaluate(async()=>{
      const id=window.__db.wakala_tx[0].id;
      await window.__app.supabase.from('wakala_tx').delete().eq('id',id);
      await window.__app.supabase.from('wakala_tx').update({amount:1}).eq('id',id);
      return {bakiDB:window.__db.wakala_tx.length,kiasi:window.__db.wakala_tx[0]?.amount};
    });
  }));

// ---------- 5. Rejesho mara MOJA pekee ----------
R.push(await run('5. Anajaribu kurejesha muamala MARA MBILI -> inakataliwa',
  {db:baseDB(),uid:SELLER,role:'employee',rpcs:['dl_wakala_close_day'],render:'rekodi'},
  async p=>{
    await andika(p,{type:'deposit',amount:50000,commission:800,line_id:L1});
    await p.waitForTimeout(400);
    const z=await p.evaluate(async()=>{
      const t=window.__db.wakala_tx[0];
      const a=await window.__wk.reverseTx(t,'kosa');
      const b=await window.__wk.reverseTx(t,'tena');
      return {la1:a.ok,la2:b.ok,kosa:b.error};
    });
    // Subiri React iwe imeonyesha upya kabla ya kusoma salio
    await p.waitForTimeout(600);
    return p.evaluate(x=>({...x,jumlaDB:window.__db.wakala_tx.length,
      taslimu:window.__wk.balances.cash}),z);
  }));

// ---------- 6. Siku iliyofungwa ----------
R.push(await run('6. Anaandika kwenye siku ILIYOFUNGWA -> inakataliwa',
  {db:baseDB({days:[{id:'d1',business_id:BIZ,day:leo(),lines:{},counted_cash:100000,
    expected_cash:100000,variance_cash:0,variance_float:0,commission:0,tx_count:0}]}),
   uid:SELLER,role:'employee',rpcs:['dl_wakala_close_day'],render:'rekodi'},
  async p=>{
    const r=await andika(p,{type:'deposit',amount:50000,commission:800,line_id:L1});
    return p.evaluate(x=>({ok:x.ok,kosa:x.error,idadi:window.__db.wakala_tx.length}),r);
  }));

// ---------- 7. Marudio ----------
R.push(await run('7. Muamala ule ule unatumwa MARA MBILI -> hauingii mara mbili',
  {db:baseDB(),uid:SELLER,role:'employee',rpcs:['dl_wakala_close_day'],render:'rekodi'},
  async p=>p.evaluate(async()=>{
    const t={type:'deposit',amount:50000,commission:800,line_id:'ln-mpesa',offline_id:'same-1'};
    const a=await window.__wk.addTx(t);
    const b=await window.__wk.addTx(t);
    return {la1:a.ok,la2:b.ok,nakala:!!b.duplicate,idadi:window.__db.wakala_tx.length};
  })));

// ---------- 8. Kamisheni ya uongo ----------
R.push(await run('8. Kamisheni KUBWA kuliko muamala -> inakataliwa',
  {db:baseDB(),uid:SELLER,role:'employee',rpcs:['dl_wakala_close_day'],render:'rekodi'},
  async p=>{
    const a=await andika(p,{type:'withdraw',amount:5000,commission:9000,line_id:L1});
    const b=await andika(p,{type:'deposit',amount:0,commission:0,line_id:L1});
    return p.evaluate(([x,y])=>({kamisheni:x.ok,kamisheniKosa:x.error,sifuri:y.ok,
      idadi:window.__db.wakala_tx.length}),[a,b]);
  }));

// ---------- 9. Usajili umeisha ----------
R.push(await run('9. Usajili UMEISHA -> haandiki, LAKINI anafunga siku',
  {db:baseDB({paidUntil:siku(-2)}),uid:SELLER,role:'employee',rpcs:['dl_wakala_close_day'],render:'funga'},
  async p=>{
    const a=await andika(p,{type:'deposit',amount:50000,commission:800,line_id:L1});
    const b=await funga(p,{day:leo(),counted:{[L1]:500000,[L2]:200000},countedCash:100000});
    return p.evaluate(([x,y])=>({andika:x.ok,andikaKosa:x.error,funga:y.ok,
      ruhusa:window.__wk.access}),[a,b]);
  }));

// ---------- 10. Hajalipa kabisa ----------
R.push(await run('10. Amewashiwa lakini HAJALIPA -> vipengele vimefungwa',
  {db:baseDB({paidUntil:null}),uid:SELLER,role:'employee',rpcs:['dl_wakala_close_day'],render:'rekodi'},
  async p=>{
    const a=await andika(p,{type:'deposit',amount:50000,line_id:L1});
    return p.evaluate(x=>({andika:x.ok,ruhusa:window.__wk.access,
      ujumbe:document.body.innerText.includes('Lipia huduma ya uwakala')}),a);
  }));

// ---------- 11. Jedwali halipo ----------
R.push(await run('11. SQL HAIJAENDESHWA (jedwali halipo) -> ukurasa hauvunjiki',
  {db:baseDB(),uid:SELLER,role:'employee',rpcs:['dl_wakala_close_day'],render:'rekodi',dropWakala:true},
  async p=>p.evaluate(()=>({ready:window.__wk.ready,
    ujumbe:document.body.innerText.includes('Huduma haijakamilika')}))));

// ---------- 12. Mmiliki anaona kila kitu ----------
R.push(await run('12. MMILIKI anaona kamisheni, tofauti na float za laini zote',
  {db:baseDB({days:[{id:'d9',business_id:BIZ,day:'2026-11-01',lines:{[L1]:{opening:500000,expected:480000,counted:460000,variance:-20000}},
    counted_cash:90000,expected_cash:100000,variance_cash:-10000,variance_float:-20000,commission:4500,tx_count:12}]}),
   uid:OWNER,role:'office',rpcs:['dl_wakala_close_day'],render:'dash'},
  async p=>{
    await andika(p,{type:'deposit',amount:50000,commission:800,line_id:L1});
    await p.waitForTimeout(600);
    return p.evaluate(()=>({
      kamisheniLeo:window.__wk.summary(window.__wk.today,window.__wk.today).kamisheni,
      laini:window.__wk.balances.lines.length,
      onaTofauti:document.body.innerText.includes('Siku zenye tofauti'),
      onaHesabu:document.body.innerText.includes('Hesabu Kamili'),
    }));
  }));

// ===================== MATOKEO =====================
const ok=(c)=>c?'✅':'❌';
let fails=0;
const T=(label,cond)=>{if(!cond)fails++;console.log('   '+(cond?'✅':'❌')+' '+label)};

for(const r of R){
  console.log('\n'+r.name);
  const o=r.out;
  if(o.__err){console.log('   ❌ jaribio limeshindwa:',o.__err);fails++;continue}

  if(r.name.startsWith('1.')){
    T(`miamala 2 kwenye DB (${o.idadi})`,o.idadi===2);
    T(`taslimu 100,000 +50,000 -30,000 = ${o.taslimu}`,o.taslimu===120000);
    T(`float 500,000 -50,000 +30,000 = ${o.float}`,o.float===480000);
    T(`kamisheni 1,300 (haigusi taslimu) = ${o.kamisheni}`,o.kamisheni===1300);
    T('recorded_by imepigwa chapa na database',o.recordedBy==='u-seller');
  }
  if(r.name.startsWith('2.')){
    T('siku imefungwa',o.ok===true);
    T(`ZIADA ya float +20,000 imekamatwa (${o.tofautiFloat})`,o.tofautiFloat===20000);
  }
  if(r.name.startsWith('3.')){
    T('siku imefungwa',o.ok===true);
    T(`UPUNGUFU wa float -40,000 umekamatwa (${o.tofautiFloat})`,o.tofautiFloat===-40000);
  }
  if(r.name.startsWith('4.')){
    T(`muamala HAUKUFUTIKA (${o.bakiDB} bado DB)`,o.bakiDB===1);
    T(`kiasi HAKIKUBADILIKA (${o.kiasi})`,Number(o.kiasi)===50000);
  }
  if(r.name.startsWith('5.')){
    T('rejesho la kwanza limepita',o.la1===true);
    T('rejesho la PILI limekataliwa',o.la2===false);
    T('kosa linaeleweka: '+(o.kosa||'').slice(0,42),/rekebishwa/.test(o.kosa||''));
    T(`DB ina miamala 2 pekee (${o.jumlaDB})`,o.jumlaDB===2);
    T(`taslimu imerudi 100,000 (${o.taslimu})`,o.taslimu===100000);
  }
  if(r.name.startsWith('6.')){
    T('muamala umekataliwa',o.ok===false);
    T('kosa linataja siku imefungwa',/imefungwa/.test(o.kosa||''));
    T(`hakuna muamala DB (${o.idadi})`,o.idadi===0);
  }
  if(r.name.startsWith('7.')){
    T('la kwanza limepita',o.la1===true);
    T('la pili limetambuliwa kama nakala',o.la2===true&&o.nakala===true);
    T(`DB ina muamala MMOJA (${o.idadi})`,o.idadi===1);
  }
  if(r.name.startsWith('8.')){
    T('kamisheni kubwa imekataliwa',o.kamisheni===false);
    T('kiasi sifuri kimekataliwa',o.sifuri===false);
    T(`hakuna kilichoingia DB (${o.idadi})`,o.idadi===0);
  }
  if(r.name.startsWith('9.')){
    T('HAWEZI kuandika muamala',o.andika===false);
    T('ANAWEZA kufunga siku (pesa ihesabiwe)',o.funga===true);
    T(`siku za neema zimebaki ${o.ruhusa?.graceLeft}`,o.ruhusa?.graceLeft>0&&o.ruhusa?.canClose===true);
  }
  if(r.name.startsWith('10.')){
    T('haandiki',o.andika===false);
    T('ujumbe wa kulipia unaonekana',o.ujumbe===true);
    T('neverPaid=true',o.ruhusa?.neverPaid===true);
  }
  if(r.name.startsWith('11.')){
    T('ready=false (jedwali halipo)',o.ready===false);
    T('ukurasa unaonyesha maelezo, hauvunjiki',o.ujumbe===true);
  }
  if(r.name.startsWith('12.')){
    T(`kamisheni ya leo inaonekana (${o.kamisheniLeo})`,o.kamisheniLeo===800);
    T(`laini zote 2 zinaonekana (${o.laini})`,o.laini===2);
    T('jedwali la Hesabu Kamili lipo',o.onaHesabu===true);
    T('siku zenye tofauti zinaonekana',o.onaTofauti===true);
  }
  if(r.errs.length)console.log('   ⚠️ makosa ya kivinjari:',r.errs.slice(0,2).join(' | '));
}

console.log('\n'+'='.repeat(52));
console.log(fails===0?'✅ YOTE YAMEPITA — mianya yote imezibwa':`❌ ${fails} hayajapita`);
process.exit(fails===0?0:1);
})();
