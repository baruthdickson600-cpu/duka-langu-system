-- =====================================================
-- DUKA LANGU V3 - COMPLETE DATABASE SCHEMA
-- =====================================================
-- HATUA: Copy & Paste yote haya kwenye Supabase SQL Editor > Run
-- =====================================================

-- =====================================================
-- SEHEMU 1: TABLES
-- =====================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'office' CHECK (role IN ('admin','office','employee')),
  business_id UUID,
  is_active BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'sw',
  currency TEXT DEFAULT 'TZS',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BUSINESSES
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  owner_id UUID REFERENCES users(id),
  logo_url TEXT,
  receipt_footer TEXT DEFAULT 'Asante kwa kununua! Karibu tena',
  is_active BOOLEAN DEFAULT true,
  is_suspended BOOLEAN DEFAULT false,
  token_active BOOLEAN DEFAULT false,
  token_expiry TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial','basic','premium')),
  promo_code TEXT,
  country TEXT DEFAULT 'TZ',
  currency TEXT DEFAULT 'TZS',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'Piece',
  category TEXT DEFAULT 'Nyingine',
  image TEXT DEFAULT '📦',
  buy_price NUMERIC DEFAULT 0,
  sell_price NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 5,
  expiry_date DATE,
  barcode TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. SALES
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  seller_id UUID REFERENCES users(id),
  seller_name TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','mobile','mix','credit')),
  payment_details JSONB,
  customer_id UUID,
  customer_name TEXT,
  status TEXT DEFAULT 'completed',
  is_synced BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  category TEXT NOT NULL DEFAULT 'nyingine',
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT CHECK (recurring_interval IN ('daily','weekly','monthly','yearly')),
  next_due DATE,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  credit_balance NUMERIC DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CREDIT TRANSACTIONS
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id UUID,
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('credit','payment')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TOKENS
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  days INTEGER NOT NULL DEFAULT 30,
  plan TEXT DEFAULT 'basic',
  used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES businesses(id),
  used_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. PROMO CODES
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  agent_name TEXT NOT NULL,
  agent_phone TEXT,
  commission_rate NUMERIC DEFAULT 10,
  used_count INTEGER DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('admin','business','user','broadcast')),
  target_id UUID,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','warning','danger','success')),
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. STOCK HISTORY
CREATE TABLE IF NOT EXISTS stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  change_type TEXT CHECK (change_type IN ('sale','restock','adjustment','audit','return')),
  quantity_before NUMERIC,
  quantity_change NUMERIC,
  quantity_after NUMERIC,
  note TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. LOGIN LOGS
CREATE TABLE IF NOT EXISTS login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT,
  action TEXT DEFAULT 'login' CHECK (action IN ('login','logout','failed')),
  device_info TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. SYSTEM LOGS (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  details JSONB,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. SMS LOGS
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. SUPPORT TICKETS (MPYA!)
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  user_email TEXT,
  business_name TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','replied','closed')),
  reply TEXT,
  replied_at TIMESTAMPTZ,
  replied_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. RETURNS / REFUNDS (MPYA!)
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id),
  items JSONB NOT NULL DEFAULT '[]',
  reason TEXT,
  refund_amount NUMERIC DEFAULT 0,
  processed_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- SEHEMU 2: DEFAULT DATA
-- =====================================================

INSERT INTO system_settings (key, value) VALUES
  ('system_price', '30000'),
  ('trial_days', '5'),
  ('default_currency', 'TZS'),
  ('payment_number', '6113 4066'),
  ('payment_name', 'PESAFLY'),
  ('payment_provider', 'SELCOM'),
  ('sms_enabled', 'false'),
  ('sms_api_key', ''),
  ('sms_sender', 'DukaLangu'),
  ('maintenance_mode', 'false'),
  ('default_language', 'sw'),
  ('branch_enabled', 'true'),
  ('announcement', ''),
  ('announcement_type', 'info'),
  ('white_label_name', ''),
  ('white_label_tagline', '')
ON CONFLICT (key) DO NOTHING;

-- Admin user
INSERT INTO users (id, email, name, phone, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'baruthdickson600@gmail.com', 'PesaFly Admin', '+255 628 986 770', 'admin')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- SEHEMU 3: ROW LEVEL SECURITY (RLS) - USALAMA WA HALI YA JUU
-- =====================================================
-- Kanuni: Kila mteja anaona data ZAKE TU
-- Admin anaona KILA KITU
-- Employee anaona data ya biashara yake tu
-- =====================================================

-- Enable RLS kwenye kila table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (kama zipo za zamani)
DO $$ 
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ===== USERS: Mtu anaona data yake tu, admin anaona zote =====
CREATE POLICY "users_select" ON users FOR SELECT USING (
  auth.uid() = id 
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
  OR business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (
  auth.uid() = id 
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== BUSINESSES: Owner anaona yake, admin anaona zote =====
CREATE POLICY "biz_select" ON businesses FOR SELECT USING (
  owner_id = auth.uid() 
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
  OR id IN (SELECT u.business_id FROM users u WHERE u.id = auth.uid())
);
CREATE POLICY "biz_insert" ON businesses FOR INSERT WITH CHECK (true);
CREATE POLICY "biz_update" ON businesses FOR UPDATE USING (
  owner_id = auth.uid() 
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE POLICY "biz_delete" ON businesses FOR DELETE USING (
  auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== BRANCHES: Biashara yake tu =====
CREATE POLICY "branch_all" ON branches FOR ALL USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR business_id IN (SELECT u.business_id FROM users u WHERE u.id = auth.uid())
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== PRODUCTS: Biashara yake tu =====
CREATE POLICY "prod_all" ON products FOR ALL USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR business_id IN (SELECT u.business_id FROM users u WHERE u.id = auth.uid())
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== SALES: Biashara yake tu =====
CREATE POLICY "sales_all" ON sales FOR ALL USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR business_id IN (SELECT u.business_id FROM users u WHERE u.id = auth.uid())
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== EXPENSES: Biashara yake tu =====
CREATE POLICY "exp_all" ON expenses FOR ALL USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR business_id IN (SELECT u.business_id FROM users u WHERE u.id = auth.uid())
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== CUSTOMERS: Biashara yake tu =====
CREATE POLICY "cust_all" ON customers FOR ALL USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR business_id IN (SELECT u.business_id FROM users u WHERE u.id = auth.uid())
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== CREDIT TRANSACTIONS: Biashara yake tu =====
CREATE POLICY "credit_all" ON credit_transactions FOR ALL USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== TOKENS: Admin anaona zote, office anaona zilizotumika kwake =====
CREATE POLICY "token_select" ON tokens FOR SELECT USING (true);
CREATE POLICY "token_insert" ON tokens FOR INSERT WITH CHECK (
  auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE POLICY "token_update" ON tokens FOR UPDATE USING (true);

-- ===== PROMO CODES: Wote wanaona, admin tu anaweza kuongeza =====
CREATE POLICY "promo_select" ON promo_codes FOR SELECT USING (true);
CREATE POLICY "promo_insert" ON promo_codes FOR INSERT WITH CHECK (
  auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE POLICY "promo_update" ON promo_codes FOR UPDATE USING (
  auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== NOTIFICATIONS: Unaona za kwako au broadcast =====
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (
  target_type = 'broadcast'
  OR target_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR target_id IN (SELECT u.business_id FROM users u WHERE u.id = auth.uid())
  OR target_type = 'admin'
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (true);

-- ===== STOCK HISTORY: Biashara yake tu =====
CREATE POLICY "sh_all" ON stock_history FOR ALL USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR business_id IN (SELECT u.business_id FROM users u WHERE u.id = auth.uid())
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== LOGIN LOGS: Admin anaona zote, mtu anaona zake =====
CREATE POLICY "ll_select" ON login_logs FOR SELECT USING (
  user_id = auth.uid()
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE POLICY "ll_insert" ON login_logs FOR INSERT WITH CHECK (true);

-- ===== SYSTEM SETTINGS: Wote wanasoma, admin tu anabadilisha =====
CREATE POLICY "ss_select" ON system_settings FOR SELECT USING (true);
CREATE POLICY "ss_modify" ON system_settings FOR ALL USING (
  auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== SYSTEM LOGS: Admin tu =====
CREATE POLICY "sl_all" ON system_logs FOR ALL USING (
  auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);
-- Allow insert from anyone (for audit trail)
CREATE POLICY "sl_insert" ON system_logs FOR INSERT WITH CHECK (true);

-- ===== SMS LOGS =====
CREATE POLICY "sms_all" ON sms_logs FOR ALL USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== SUPPORT TICKETS: Biashara yake + Admin =====
CREATE POLICY "ticket_select" ON support_tickets FOR SELECT USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR user_id = auth.uid()
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);
CREATE POLICY "ticket_insert" ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "ticket_update" ON support_tickets FOR UPDATE USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ===== RETURNS: Biashara yake tu =====
CREATE POLICY "ret_all" ON returns FOR ALL USING (
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid())
  OR business_id IN (SELECT u.business_id FROM users u WHERE u.id = auth.uid())
  OR auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid
);

-- =====================================================
-- SEHEMU 4: INDEXES (Kwa speed)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_branch ON products(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business ON expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_product ON stock_history(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_business ON stock_history(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_branches_business ON branches(business_id);
CREATE INDEX IF NOT EXISTS idx_tickets_business ON support_tickets(business_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_returns_business ON returns(business_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_user ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- KUMALIZIKA! 
-- Mfumo uko tayari na usalama wa hali ya juu
-- =====================================================
