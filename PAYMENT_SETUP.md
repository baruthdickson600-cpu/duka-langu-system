# 💳 MFUMO WA MALIPO AUTO-CONFIRM - SETUP GUIDE

## Hatua 1: Run SQL Migration (Muhimu Sana!)

Nenda **Supabase Dashboard → SQL Editor → New Query**, copy yote ya `database/payment_migration.sql`, run.

Hii itatengeneza:
- Jedwali `payment_requests`
- Trigger ya auto-activate token pale admin anapothibitisha
- Trigger ya kutuma notification kwa admin kila malipo mapya yanapokuja

---

## Hatua 2: Enable Realtime (MUHIMU SANA!)

Bila hii, mfumo hautafunguka wenyewe. Una njia mbili:

### Njia A: Kupitia Dashboard (rahisi)
1. Supabase Dashboard → **Database** → **Replication**
2. Pata **"supabase_realtime"** publication
3. Bonyeza **"Manage tables"**
4. Wezesha (check) tables hizi:
   - ✅ `tokens`
   - ✅ `payment_requests`
   - ✅ `notifications`
5. Save

### Njia B: Kupitia SQL (haraka zaidi)
Run hii kwenye SQL Editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

## Hatua 3: Run Mfumo

```bash
cd duka-langu
npm install
npm run dev
```

---

## 🎯 Jinsi ya Ku-test

### Test 1: Office analipa → Admin anathibitisha

1. Fungua browser **mbili**:
   - **Browser 1:** Login kama **Office** (mtu aliyejisajili mpya)
   - **Browser 2:** Login kama **Admin** (baruthdickson600@gmail.com)

2. Kwenye **Office browser:**
   - Nenda "💳 Lipa Usajili"
   - Bonyeza "✅ Nimelipa"
   - Weka:
     - Transaction ID: `TEST123ABC`
     - Simu: `0712345678`
     - Kiasi: `10000`
     - Siku: `30`
   - Submit

3. Kwenye **Admin browser:**
   - Utapata notification **mara moja** 🔔
   - Sidebar itaonyesha badge nyekundu `1` kwenye "💰 Malipo"
   - Bonyeza "Malipo"
   - Utaona ombi la mtumiaji
   - Bonyeza "✅ Thibitisha"

4. Rudi **Office browser** - hakufanya chochote!
   - Utaona popup: "🎉 Malipo yamethibitishwa!"
   - Baada ya sekunde 1-2, mfumo unafunguka wenyewe
   - Sasa anaweza kutumia mfumo kawaida

### Test 2: Wakati mfumo umefungwa (trial imeisha)

1. Kama office trial yake imeisha, anaona **lock screen**
2. Lock screen ina tabs 2:
   - **💳 Nimelipa** - anaweka transaction
   - **🔑 Nina Token** - kama admin amempa token direct
3. Akiwasilisha malipo, atabaki kwenye lock screen lakini ataona status ya "pending"
4. Admin akithibitisha → lock screen inafungwa **wenyewe**

---

## 🔔 Browser Notifications

Mfumo unaomba ruhusa ya kutuma browser notifications. Hii ina maana:
- **Admin** anapata "pop-up" notification kwenye computer kila malipo mapya
- **Office** anapata notification wakati admin anathibitisha/kataa
- Inafanya kazi hata kama tab iko nyuma (background)

---

## 🛡️ Security Features

1. **RLS (Row Level Security)**: Office anaona tu malipo yake mwenyewe
2. **Admin pekee** ndiye anaweza approve/reject
3. **Trigger-based auto-activation**: Haiwezekani kuhack kwa kuunda token moja kwa moja — lazima ipite kwenye approval flow
4. **Transaction ID logging**: Kila malipo yanatracked na anayeyathibitisha

---

## 💡 Tips za Kusimamia Biashara

### Kwa Admin:
- Pin ya SELCOM/M-Pesa yako itumie **namba ya biashara** sio personal (ili transactions zionekane vizuri)
- Weka wewe mwenyewe kwenye "Agents" list ili kufuatilia kila siku
- Tumia filter "⏳ Zinasubiri" kuona tu malipo mapya
- Thibitisha ndani ya **dakika 30** — wateja wasichoke

### Kwa Office:
- Transaction ID inapatikana kwenye **SMS ya uthibitisho** baada ya kulipa
- Weka **exact same number** uliyotumia kulipa (hii inasaidia admin kuthibitisha)
- Kama admin amekataa, angalia "sababu" — mara nyingi ni typo

---

## ❓ Troubleshooting

**Q: Admin amethibitisha lakini mfumo haufunguki office:**
- Hakikisha Realtime imewezeshwa kwa table `tokens` (Hatua 2)
- Reload page mara moja tu — ila kawaida haihitaji

**Q: Notification hazionekani:**
- Hakikisha browser permission imeruhusiwa (check 🔒 kwenye URL bar)
- Reload page

**Q: "Transaction ID haipatikani"** wakati wa kuthibitisha:
- Office ametoa wrong ID
- Admin akatae na andike sababu: "TxID haipatikani kwenye SMS zangu. Tafadhali thibitisha na utume tena."

---

## 🚀 Maboresho ya Baadaye

Unaweza kuongeza:
- **WhatsApp notification** kwa admin (kutumia Twilio/WhatsApp Business API)
- **Auto-verify kupitia SMS reader** (android app inayosoma SMS za Selcom)
- **Multi-currency** (USD, KES, UGX)
- **Invoice PDF** kila baada ya malipo
- **Refund system**
