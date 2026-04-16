# 🏪 DUKA LANGU - Smart POS SaaS System

**Together for the better**

Mfumo wa kisasa wa Point of Sale (POS) unaotumia SaaS model na token subscription system.

---

## 📁 Muundo wa Mafaili (File Structure)

```
duka-langu/
├── database/
│   └── schema.sql              ← SQL ya database (run kwanza Supabase)
├── index.html                  ← Entry point HTML
├── package.json                ← Dependencies
├── vite.config.js              ← Vite configuration
└── src/
    ├── main.jsx                ← React entry point
    ├── App.jsx                 ← Main app (router + layout)
    ├── styles/
    │   └── globals.css         ← Global CSS styles
    ├── lib/
    │   ├── supabase.js         ← Supabase client config
    │   ├── constants.js        ← App constants
    │   └── helpers.js          ← Utility functions
    ├── hooks/
    │   ├── useAuth.js          ← Authentication hook
    │   └── useSubscription.js  ← Subscription/token check
    └── components/
        ├── auth/
        │   ├── AuthPage.jsx    ← Login & Signup
        │   └── AuthPage.css
        ├── layout/
        │   ├── Sidebar.jsx     ← Navigation sidebar
        │   ├── Sidebar.css
        │   ├── Header.jsx      ← Top bar + notifications
        │   └── Header.css
        ├── shared/
        │   ├── Modal.jsx       ← Reusable modal
        │   ├── LoadingSpinner.jsx
        │   └── SubscriptionLock.jsx  ← Lock screen
        ├── admin/
        │   ├── AdminDashboard.jsx    ← Admin overview
        │   ├── AdminBusinesses.jsx   ← Orodha ya maduka
        │   ├── AdminTokens.jsx       ← Token management
        │   ├── AdminPromo.jsx        ← Promo codes/agents
        │   └── AdminSettings.jsx     ← System settings
        ├── office/
        │   ├── OfficeDashboard.jsx   ← Owner dashboard
        │   ├── Products.jsx          ← CRUD bidhaa
        │   ├── Categories.jsx        ← Makundi ya bidhaa
        │   ├── Sales.jsx             ← POS interface
        │   ├── Expenses.jsx          ← Matumizi
        │   ├── Reports.jsx           ← Ripoti
        │   ├── Workers.jsx           ← Wafanyakazi
        │   ├── Branches.jsx          ← Matawi
        │   ├── StockHistory.jsx      ← Historia stock
        │   ├── TokenPage.jsx         ← Token/usajili
        │   └── OfficeSettings.jsx    ← Mipangilio
        └── worker/
            └── WorkerDashboard.jsx   ← Worker overview
```

---

## 🚀 Jinsi ya Kuanza (Setup)

### Hatua 1: Setup Database (Supabase)

1. Nenda **Supabase Dashboard** → SQL Editor
2. Copy na paste yote ya `database/schema.sql`
3. Run query

### Hatua 2: Sajili Admin

1. Kwenye Supabase Dashboard → Authentication → Users → Add User
2. Weka:
   - Email: `baruthdickson600@gmail.com`
   - Password: `baruth@500`
3. Copy user ID aliyoundwa
4. Nenda SQL Editor, run:

```sql
INSERT INTO users (id, name, email, role)
VALUES ('USER_ID_HAPA', 'Admin', 'baruthdickson600@gmail.com', 'admin');
```

### Hatua 3: Install na Run

```bash
cd duka-langu
npm install
npm run dev
```

Fungua browser: `http://localhost:5173`

### Hatua 4: Login kama Admin

- Email: `baruthdickson600@gmail.com`
- Password: `baruth@500`

---

## 👤 Aina za Watumiaji

| Role    | Anafanya Nini                                              |
| ------- | ---------------------------------------------------------- |
| Admin   | Tokens, Promo codes, Settings, Kusimamia maduka yote       |
| Office  | Bidhaa, Mauzo, Matumizi, Ripoti, Wafanyakazi, Matawi       |
| Worker  | Kuona bidhaa, Kuuza tu (hawezi kuona ripoti/matumizi)      |

---

## 🔑 Token System

- Admin anatengeneza tokens na bei na siku za uhalali
- Office analipa na kupata token code
- Office anaweka token kufungua mfumo
- Mfumo unajifunga ukiisha (auto-lock)
- Trial ya siku 5 bure kwa mtu mpya (admin anaweza kubadilisha)

---

## 💰 Payment Info

Wakati mfumo umefungwa, office ataona:
> **Lipa namba ya malipo SELECOM > 6113 4066 jina BARUTH DICKSON THEO**

Admin anaweza kubadilisha taarifa hii kwenye Settings.

---

## 📱 Responsive

Mfumo unafanya kazi vizuri kwenye:
- Computer / Laptop
- Tablet
- Simu (Mobile)

---

## 🔒 Security

- Row Level Security (RLS) kwenye kila table
- Kila biashara inaona data yake tu
- Workers hawana access kwenye reports/expenses
- Device-based auth kupitia Supabase Auth

---

## 🛠️ Teknolojia

- **Frontend**: React 18 + Vite
- **Backend**: Supabase (Auth + Database + RLS)
- **Database**: PostgreSQL
- **Styling**: Custom CSS (responsive, no framework needed)
- **State**: React Hooks (useState, useEffect)
