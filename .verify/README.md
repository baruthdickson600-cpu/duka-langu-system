# Jaribio la mzunguko wa mauzo (end-to-end)

Hili linaendesha **AppContext halisi** kwenye kivinjari halisi, dhidi ya
Supabase ya bandia inayofanya kama PostgREST ya kweli:

- inakataa safu zisizopo kwenye schema (PGRST204)
- inakataa jedwali/view zisizopo (PGRST205)
- inakataa RPC zisizopo (PGRST202)
- RLS: UPDATE inasasisha safu **sifuri** bila kutoa kosa (kama Postgres halisi)
- unique index kwenye (business_id, offline_id) → 409

Lingekamata makosa YOTE matatu ya wiki hii.

## Kuendesha

```bash
npx vite build -c .verify/vite.config.js --outDir .verify/dist
npx vite preview -c .verify/vite.config.js --outDir .verify/dist --port 4500 &
node .verify/mauzo.cjs      # hali 5 za kuuza
node .verify/mnyororo.cjs   # mmiliki anaona mauzo ya muuzaji
```

Inahitaji Playwright (`npm i -D playwright && npx playwright install chromium`).

## Hali zinazojaribiwa

| | Hali | Inachotarajiwa |
|---|---|---|
| A | Mmiliki, database ya zamani | mauzo + stock ✅ |
| B | Muuzaji, database ya zamani | mauzo + stock ✅ (safu zisizopo zinaondolewa) |
| C | Muuzaji, database mpya | offline_id inahifadhiwa ✅ |
| D | Muuzaji, RLS + RPC zipo | mauzo + stock ✅ |
| E | Muuzaji, RLS bila RPC | stock haiwezi kuhifadhiwa — **lakini inaonya** ⚠️ |
| F | Mmiliki baada ya muuzaji kuuza | anaona mauzo + faida 1200 ✅ |
| G | Muuzaji anafungua | hakuna faida, gharama wala bei ya kununua ✅ |
