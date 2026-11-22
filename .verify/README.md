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

## Uwakala

```bash
node .verify/uwakala.cjs   # hali 12 za upotevu wa pesa
```

| | Hali | Inachotarajiwa |
|---|---|---|
| 1 | Miamala ya kawaida | taslimu na float zinabadilika KINYUME; kamisheni haigusi zote mbili |
| 2 | Ametoa 50,000 akaandika 30,000 | ZIADA ya float inakamatwa |
| 3 | Hakuandika kabisa | UPUNGUFU wa float unakamatwa |
| 4 | Muuzaji anajaribu KUFUTA | RLS inakataa; rekodi inabaki |
| 5 | Rejesho mara mbili | la pili linakataliwa (unique index) |
| 6 | Siku iliyofungwa | muamala mpya haupokelewi |
| 7 | Muamala umetumwa mara mbili | offline_id inazuia nakala |
| 8 | Kamisheni > muamala, au kiasi 0 | CHECK inakataa |
| 9 | Usajili umeisha | haandiki, LAKINI anafunga siku (siku 7) |
| 10 | Amewashiwa hajalipa | vipengele vimefungwa, ujumbe wa malipo |
| 11 | SQL haijaendeshwa | ukurasa hauvunjiki, unaeleza |
| 12 | Mmiliki | anaona kamisheni, laini zote na tofauti |

### Gateway (Abliner, Beem, Snippe)

| | Hali | Inachotarajiwa |
|---|---|---|
| 16 | Abliner: namba kamili | jina linajazwa, limeandikwa "limethibitishwa" |
| 17 | Namba ya Airtel kwenye laini ya M-Pesa | onyo linatolewa kabla ya kutuma |
| 18 | SQL ya sehemu 6 haijaendeshwa | muamala UNAENDELEA (safu hiari zinaondolewa) |
| 19 | Float chini ya kiwango, miamala miwili | SMS MOJA tu kwa siku |
| 20 | Tofauti kwenye upatanisho | SMS ya tofauti na ya hitimisho kwa mmiliki |

### Ukaguzi wa ghafla na uthibitisho

| | Hali | Inachotarajiwa |
|---|---|---|
| 21 | Mmiliki anaomba ukaguzi | wakala anaona banner, anapata SMS, ukaguzi wa pili unazuiwa, tofauti inakamatwa, SIKU HAIFUNGWI |
| 22 | Miamala 12 (8 imethibitishwa) + float_buy | asilimia 67, float_buy imerukwa, kipimo kinaonekana |

### Gharama za wakala na uchambuzi wa asubuhi

| | Hali | Inachotarajiwa |
|---|---|---|
| 23 | Wakala anaandika gharama | inaingia, recorded_by ni yeye, kasheni inapungua, haoni mchanganuo wa mmiliki |
| 24 | Mmiliki anaona gharama zote | ofisini na kibandani zimetenganishwa |

Ujumbe wa asubuhi una majaribio yake: `src/utils/asubuhi.test.js` (urefu wa SMS, hakuna emoji, siku isiyofungwa).
