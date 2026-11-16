import {useState,useEffect} from 'react';
import {useApp} from '../context/AppContext';

// ============================================================
// MAPATO HALISI YA DUKALANGU
// Chanzo kimoja tu: malipo yaliyothibitishwa kuingia kwenye
// akaunti ya malipo (jedwali payment_transactions, status='paid').
//
// ⚠️ USITUMIE makadirio (mf. tokens × bei, au biashara active × bei).
//    Hayo si pesa halisi na yanapotosha mhasibu na admin.
// ============================================================

// Majina rafiki ya chaneli za malipo
export const CH_LABEL={
  mpesa:'M-Pesa',vodacom:'M-Pesa',
  tigopesa:'Mixx by Yas',tigo:'Mixx by Yas',
  airtelmoney:'Airtel Money',airtel:'Airtel Money',
  halopesa:'HaloPesa',halotel:'HaloPesa',
};
export const chName=c=>CH_LABEL[c]||c||'Nyingine';

export const txAmt=t=>+t.amount||0;
export const txMonth=t=>(t.paid_at||t.created_at||'').slice(0,7);
export const txDate=t=>(t.paid_at||t.created_at||'').slice(0,10);
export const sumTx=list=>(list||[]).reduce((a,t)=>a+txAmt(t),0);

export function usePaidTx(){
  const{supabase}=useApp();
  const[tx,setTx]=useState([]);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    let on=true;
    if(!supabase){setLoading(false);return}
    supabase.from('payment_transactions').select('*').eq('status','paid')
      .order('created_at',{ascending:false}).limit(2000)
      .then(({data})=>{if(on){setTx(data||[]);setLoading(false)}},()=>{if(on)setLoading(false)});
    return()=>{on=false};
  },[supabase]);
  return{tx,loading};
}
