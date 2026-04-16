# 🚀 DEPLOYMENT GUIDE - Duka Langu

**Lengo:** Weka mfumo online kwenye link ya kudumu (mfano: `dukalangu.vercel.app`) ambayo haibadiliki, na kila unapofanya mabadiliko yanafanyika auto-update kwenye link hiyo hiyo.

---

## ⚡ Njia 1: Vercel + GitHub (INAPENDEKEZWA)

### **Sifa:**
- ✅ Bure kabisa kwa miradi ya kibiashara ndogo
- ✅ Auto-deploy kila push kwa GitHub
- ✅ HTTPS (secure) ya ziada
- ✅ Super fast (CDN duniani kote)
- ✅ Custom domain inawezekana (mfano: `www.dukalangu.com`)

---

### **Hatua 1: Tengeneza GitHub Account & Repo**

#### 1.1 Kama hauna GitHub:
1. Nenda https://github.com/signup
2. Jisajili (email yako)

#### 1.2 Tengeneza Repository:
1. Baada ya login → bonyeza **"+"** juu kulia → **"New repository"**
2. Weka:
   - **Repository name:** `duka-langu`
   - **Description:** `Smart POS SaaS System`
   - **Private** (chagua hii ili code yako isiwe public)
3. **USICHAGUE** "Add README" (tutawasiliana file zote kutoka kwa computer yako)
4. Bonyeza **"Create repository"**

---

### **Hatua 2: Install Git kwenye Computer**

**Windows:**
1. Download https://git-scm.com/download/win
2. Install (next, next, next...)
3. Fungua **Command Prompt** au **PowerShell**

**Mac:**
```bash
brew install git
```

**Linux:**
```bash
sudo apt install git
```

#### Configure Git (mara moja tu):
```bash
git config --global user.name "Jina Lako"
git config --global user.email "email@yako.com"
```

---

### **Hatua 3: Upload Code kwa GitHub**

Fungua terminal kwenye folder ya `duka-langu`:

```bash
cd duka-langu

# Initialize git
git init

# Add files
git add .

# First commit
git commit -m "Initial commit - Duka Langu POS System"

# Connect to GitHub (badilisha YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/duka-langu.git

# Push!
git branch -M main
git push -u origin main
```

GitHub itakuuliza login — tumia **Personal Access Token** (sio password):

#### Kupata Token:
1. GitHub → Settings (juu kulia picha yako)
2. Developer settings → Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. Weka:
   - Note: `VS Code`
   - Expiration: `No expiration`
   - Scopes: ✅ check **`repo`** yote
5. Generate → **COPY token** (itaonekana mara moja tu!)
6. Tumia token hii kama "password" wakati unapo-push

---

### **Hatua 4: Deploy kwa Vercel (RAHISI SANA!)**

1. Nenda **https://vercel.com**
2. Bonyeza **"Sign Up"** → chagua **"Continue with GitHub"**
3. Ruhusu Vercel kuona GitHub yako

#### Import Project:
1. Baada ya login → **"Add New..."** → **"Project"**
2. Utaona orodha ya repos zako → chagua **`duka-langu`** → **Import**
3. Configure:
   - **Framework Preset:** `Vite` (detected automatic)
   - **Root Directory:** `.` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
4. Bonyeza **"Deploy"**

**Subiri dakika 1-2...**

✅ **KAZI IMEKWISHA!**

Utapata link kama: **`duka-langu-abc123.vercel.app`**

---

### **Hatua 5: Badilisha Jina la Link (Optional)**

Ukihitaji link fupi kama `dukalangu.vercel.app`:

1. Vercel Dashboard → project yako → **Settings** → **Domains**
2. Ongeza domain: `dukalangu.vercel.app`
3. Save

Sasa link yako ni: **`https://dukalangu.vercel.app`** 🎉

---

## 🔄 Jinsi ya Kufanya Mabadiliko (Update)

**Sasa hivi ndio sehemu ya ajabu!**

Mara moja umesetup hili, kila unapofanya mabadiliko:

```bash
cd duka-langu

# Unafanya mabadiliko kwenye VS Code...

# Save mabadiliko
git add .
git commit -m "Nimeongeza feature ya PDF receipt"
git push
```

**MARA MOJA!**
- Vercel inagundua mabadiliko
- Inabuild toleo jipya
- Inadeploy kwenye link **ile ile**
- Wateja wako **hawajui** lolote limefanyika — wanaona tu mabadiliko mapya!

**Link yao haibadiliki kamwe.** Dakika 1-2 baadaye wanaona feature mpya.

---

## 🌐 Custom Domain (Optional - Professional Zaidi)

Kama unataka link kama `www.dukalangu.co.tz`:

### Hatua 1: Nunua Domain
- **Afrihost** (Tanzania): ~30,000 TZS/mwaka
- **Namecheap** (International): ~$10/mwaka
- **Cloudflare** (bei nzuri): ~$8/mwaka

### Hatua 2: Connect kwa Vercel
1. Vercel Dashboard → Project → **Domains**
2. Add: `dukalangu.co.tz`
3. Vercel itakupa DNS records — ongeza kwenye domain provider yako
4. Subiri dakika 5-30 → inaanza kufanya kazi

---

## 📱 Mobile App (PWA) - Bonus

Mfumo uliotengenezwa tayari ni **responsive** (inafanya kazi vizuri kwenye simu). Lakini unaweza kuongeza PWA ili wateja wa-**install** kama app!

Ongeza kwenye `index.html`:

```html
<link rel="manifest" href="/manifest.json">
```

Tengeneza `public/manifest.json`:

```json
{
  "name": "Duka Langu",
  "short_name": "Duka Langu",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B7A3B",
  "theme_color": "#0B7A3B",
  "icons": [
    {
      "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0i...",
      "sizes": "192x192",
      "type": "image/svg+xml"
    }
  ]
}
```

Wateja watapata option ya **"Add to Home Screen"** kwenye simu — kama app halisi!

---

## 🎯 Workflow Bora Kwa Muda Mrefu

```
1. Wateja: wanatumia link ileile daima (mfano: dukalangu.vercel.app)
   ↓
2. Wewe: unafanya mabadiliko VS Code
   ↓
3. git push
   ↓
4. Vercel: auto-build + auto-deploy (dakika 1)
   ↓
5. Wateja: wanapata feature mpya mara moja (bila ku-download tena)
```

**Faida kuu:** Hata wakati umefanya mabadiliko makubwa, wateja wanaendelea kutumia mfumo bila interruption.

---

## 🆘 Troubleshooting

### Q: "Build failed" kwenye Vercel
- Angalia error logs kwenye Vercel Dashboard
- Kawaida ni typo kwenye code au missing dependency
- Fix → push tena

### Q: "Git push rejected"
```bash
git pull origin main
# solve any conflicts
git push
```

### Q: Supabase haikunekani kwenye Vercel
- Hakuna env variables zinazohitajika (Supabase keys ziko ndani ya code yako)
- Lakini ikama unataka kuficha keys, tumia Vercel environment variables (advanced)

### Q: Nataka kurudi version ya nyuma (rollback)
- Vercel Dashboard → Project → **Deployments** → chagua deployment ya zamani → **"Promote to Production"**
- Wateja wanarudi haraka kwenye toleo la nyuma

---

## 💰 Gharama Halisi

| Kitu | Bei |
|------|-----|
| GitHub (private repo) | **Bure** |
| Vercel (hobby plan) | **Bure** (100GB bandwidth/mwezi) |
| Supabase (free tier) | **Bure** (hadi users 50,000) |
| Custom domain | ~$10-30/mwaka (optional) |

**Jumla: $0/mwezi** kuanza!

Ukifikia wateja 500+ ndipo unaweza kuhitaji upgrade (~$20/mwezi).

---

## ✅ Checklist ya Mwisho

- [ ] GitHub account imeundwa
- [ ] Repository `duka-langu` imeundwa (private)
- [ ] Git imeinstall kwa computer
- [ ] Code imepush kwa GitHub
- [ ] Vercel account imeundwa (na GitHub)
- [ ] Project imedeploy Vercel
- [ ] Link inafanya kazi (kufungua inaonyesha mfumo)
- [ ] Supabase schema imerun
- [ ] Payment migration imerun
- [ ] Realtime imewezeshwa (tokens, payment_requests, notifications)

**Baada ya checklist hii, wateja wako watakuwa na link ya kudumu na wewe unaweza kuboresha mfumo milele bila kuwasumbua!**
