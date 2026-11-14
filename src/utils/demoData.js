// ============================================================
// DEMO DATA — kwa ajili ya video ya maonyesho (TCRA demo)
// Haina athari kwenye database halisi. Inawashwa tu kwa ?demo=full
// ============================================================
const now=new Date();
const iso=(daysAgo,h=10)=>{const d=new Date(now);d.setDate(d.getDate()-daysAgo);d.setHours(h,Math.floor(Math.random()*59),0,0);return d.toISOString();};

export const DEMO={
  user:{id:'demo-user',email:'demo@dukalangu.com',name:'Juma Mwalimu',role:'office',business_id:'demo-biz',phone:'0754000111'},
  biz:{id:'demo-biz',name:'Duka la Mfano — DEMO',owner_id:'demo-user',business_id:'demo-biz',phone:'0754000111',location:'Urambo, Tabora',plan:'basic',token_active:true,token_expiry:new Date(now.getTime()+25*86400000).toISOString(),is_suspended:false,created_at:iso(120,9),email:'demo@dukalangu.com'},
  products:[
    {id:'p1',name:'Sukari (kg)',category:'Vyakula',buy_price:2600,sell_price:3000,quantity:48,min_stock:10,unit:'kg',image:'🍬',business_id:'demo-biz'},
    {id:'p2',name:'Mchele (kg)',category:'Vyakula',buy_price:2800,sell_price:3200,quantity:65,min_stock:10,unit:'kg',image:'🍚',business_id:'demo-biz'},
    {id:'p3',name:'Mafuta (lita)',category:'Vyakula',buy_price:6500,sell_price:7500,quantity:22,min_stock:8,unit:'lita',image:'🛢️',business_id:'demo-biz'},
    {id:'p4',name:'Sabuni',category:'Vipodozi',buy_price:800,sell_price:1200,quantity:90,min_stock:15,unit:'Kipande',image:'🧼',business_id:'demo-biz'},
    {id:'p5',name:'Soda (chupa)',category:'Vinywaji',buy_price:600,sell_price:1000,quantity:7,min_stock:12,unit:'chupa',image:'🥤',business_id:'demo-biz'},
    {id:'p6',name:'Unga wa Dona (kg)',category:'Vyakula',buy_price:1500,sell_price:1900,quantity:54,min_stock:10,unit:'kg',image:'🌽',business_id:'demo-biz'},
    {id:'p7',name:'Maziwa (lita)',category:'Vinywaji',buy_price:1800,sell_price:2300,quantity:18,min_stock:6,unit:'lita',image:'🥛',business_id:'demo-biz'},
    {id:'p8',name:'Daftari',category:'Vifaa',buy_price:1000,sell_price:1500,quantity:120,min_stock:20,unit:'Kipande',image:'📒',business_id:'demo-biz'},
  ],
  // Mauzo ya siku 20 zilizopita — kila siku yana mauzo
  get sales(){
    const items=[
      [{productId:'p1',name:'Sukari (kg)',qty:3,price:3000,buyPrice:2600,fraction:1}],
      [{productId:'p2',name:'Mchele (kg)',qty:5,price:3200,buyPrice:2800,fraction:1}],
      [{productId:'p3',name:'Mafuta (lita)',qty:2,price:7500,buyPrice:6500,fraction:1}],
      [{productId:'p4',name:'Sabuni',qty:4,price:1200,buyPrice:800,fraction:1}],
      [{productId:'p6',name:'Unga wa Dona (kg)',qty:6,price:1900,buyPrice:1500,fraction:1}],
      [{productId:'p5',name:'Soda (chupa)',qty:8,price:1000,buyPrice:600,fraction:1}],
      [{productId:'p7',name:'Maziwa (lita)',qty:3,price:2300,buyPrice:1800,fraction:1}],
    ];
    const pays=['cash','cash','mpesa','cash','tigopesa','cash','mpesa'];
    const sellers=['Juma Mwalimu','Asha (Muuzaji)','Juma Mwalimu','Asha (Muuzaji)'];
    const out=[];
    let n=0;
    for(let d=19;d>=0;d--){
      const perDay=2+((d*7)%3); // 2-4 mauzo kwa siku
      for(let k=0;k<perDay;k++){
        const it=items[n%items.length];
        const total=it.reduce((a,i)=>a+i.qty*i.price*(i.fraction||1),0);
        const profit=it.reduce((a,i)=>a+i.qty*(i.price-i.buyPrice)*(i.fraction||1),0);
        out.push({id:'s'+n,business_id:'demo-biz',items:it,total,profit,payment_method:pays[n%pays.length],seller_name:sellers[n%sellers.length],created_at:iso(d,9+k*2),customer_name:''});
        n++;
      }
    }
    // Hakikisha kuna mauzo ya LEO (saa mbalimbali) ili dashboard/Leo isionyeshe sifuri
    [0,1,2,3,4].forEach((h,idx)=>{
      const it=items[idx%items.length];
      const total=it.reduce((a,i)=>a+i.qty*i.price*(i.fraction||1),0);
      const profit=it.reduce((a,i)=>a+i.qty*(i.price-i.buyPrice)*(i.fraction||1),0);
      out.push({id:'today'+idx,business_id:'demo-biz',items:it,total,profit,payment_method:pays[idx%pays.length],seller_name:sellers[idx%sellers.length],created_at:iso(0,8+h*2),customer_name:''});
    });
    return out;
  },
  expenses:[
    {id:'e1',business_id:'demo-biz',category:'Usafiri',amount:15000,note:'Usafiri wa mzigo',created_at:iso(3,8)},
    {id:'e2',business_id:'demo-biz',category:'Umeme',amount:20000,note:'Bili ya LUKU',created_at:iso(8,8)},
    {id:'e3',business_id:'demo-biz',category:'Kodi',amount:50000,note:'Kodi ya pango',created_at:iso(15,8)},
  ],
  customers:[
    {id:'c1',business_id:'demo-biz',name:'Mama Fatuma',phone:'0713111222',credit_balance:12000,created_at:iso(30)},
    {id:'c2',business_id:'demo-biz',name:'Mzee Rajabu',phone:'0755333444',credit_balance:0,created_at:iso(20)},
    {id:'c3',business_id:'demo-biz',name:'Neema Shop',phone:'0699555666',credit_balance:8500,created_at:iso(10)},
  ],
  employees:[
    {id:'em1',business_id:'demo-biz',name:'Asha (Muuzaji)',email:'asha@demo.com',phone:'0788999000',role:'employee',is_active:true,created_at:iso(60)},
  ],
};
