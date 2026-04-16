-- ============================================
-- DUKA LANGU - POS SaaS System
-- Database Schema (Run in Supabase SQL Editor)
-- ============================================

-- 1. SYSTEM SETTINGS (Admin controls pricing & trial days)
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_settings (setting_key, setting_value) VALUES
  ('subscription_price', '10000'),
  ('trial_days', '5'),
  ('currency', 'TZS'),
  ('payment_info', 'SELECOM > 6113 4066 jina BARUTH DICKSON THEO')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'office', 'worker')),
  business_id UUID,
  branch_id UUID,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. BUSINESSES TABLE
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  owner_id UUID REFERENCES users(id),
  promo_code TEXT,
  trial_ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key back to users
ALTER TABLE users ADD CONSTRAINT fk_users_business
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

-- 4. BRANCHES TABLE
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ADD CONSTRAINT fk_users_branch
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- 5. TOKENS (SUBSCRIPTION)
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_code TEXT UNIQUE NOT NULL,
  business_id UUID REFERENCES businesses(id),
  days_valid INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'unused' CHECK (status IN ('unused', 'active', 'expired')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. PROMO CODES (AGENT SYSTEM)
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  agent_name TEXT NOT NULL,
  agent_phone TEXT,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  max_uses INTEGER DEFAULT 100,
  times_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  category_id UUID REFERENCES categories(id),
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'piece' CHECK (unit IN ('piece', 'kg', 'g', 'litre', 'ml', 'dozen', 'pack', 'box', 'metre')),
  image_url TEXT,
  buying_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12,2) DEFAULT 5,
  barcode TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. SALES
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID REFERENCES branches(id),
  sold_by UUID REFERENCES users(id),
  customer_name TEXT,
  customer_phone TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mobile', 'card', 'credit')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'refunded', 'pending')),
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. SALE ITEMS
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  buying_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL,
  profit NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID REFERENCES branches(id),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  recorded_by UUID REFERENCES users(id),
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. STOCK HISTORY
CREATE TABLE IF NOT EXISTS stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id UUID REFERENCES branches(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('sale', 'restock', 'adjustment', 'return', 'transfer')),
  quantity_change NUMERIC(12,2) NOT NULL,
  quantity_before NUMERIC(12,2) NOT NULL,
  quantity_after NUMERIC(12,2) NOT NULL,
  reference_id UUID,
  notes TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success', 'stock_alert', 'token_expiry')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- System settings: Everyone can read, only admin can write
CREATE POLICY "Anyone can read settings" ON system_settings FOR SELECT USING (true);
CREATE POLICY "Admin can update settings" ON system_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Users policies
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (
  id = auth.uid() OR
  business_id IN (SELECT b.id FROM businesses b WHERE b.owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
CREATE POLICY "Users can insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own" ON users FOR UPDATE USING (
  id = auth.uid() OR
  EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- Businesses policies
CREATE POLICY "Business read" ON businesses FOR SELECT USING (
  owner_id = auth.uid() OR
  id IN (SELECT business_id FROM users WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Business insert" ON businesses FOR INSERT WITH CHECK (true);
CREATE POLICY "Business update" ON businesses FOR UPDATE USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Branches policies
CREATE POLICY "Branch read" ON branches FOR SELECT USING (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Branch insert" ON branches FOR INSERT WITH CHECK (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "Branch update" ON branches FOR UPDATE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);

-- Products policies
CREATE POLICY "Product read" ON products FOR SELECT USING (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Product insert" ON products FOR INSERT WITH CHECK (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "Product update" ON products FOR UPDATE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "Product delete" ON products FOR DELETE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);

-- Sales policies
CREATE POLICY "Sales read" ON sales FOR SELECT USING (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Sales insert" ON sales FOR INSERT WITH CHECK (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
);

-- Sale items policies
CREATE POLICY "Sale items read" ON sale_items FOR SELECT USING (
  sale_id IN (SELECT id FROM sales WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))
);
CREATE POLICY "Sale items insert" ON sale_items FOR INSERT WITH CHECK (true);

-- Expenses policies
CREATE POLICY "Expenses read" ON expenses FOR SELECT USING (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Expenses insert" ON expenses FOR INSERT WITH CHECK (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "Expenses update" ON expenses FOR UPDATE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "Expenses delete" ON expenses FOR DELETE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);

-- Tokens policies
CREATE POLICY "Tokens read" ON tokens FOR SELECT USING (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid()) OR
  business_id IS NULL OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Tokens insert" ON tokens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Tokens update" ON tokens FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
);

-- Promo codes policies
CREATE POLICY "Promo read" ON promo_codes FOR SELECT USING (true);
CREATE POLICY "Promo insert" ON promo_codes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Promo update" ON promo_codes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Stock history policies
CREATE POLICY "Stock history read" ON stock_history FOR SELECT USING (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Stock history insert" ON stock_history FOR INSERT WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Notifications read" ON notifications FOR SELECT USING (
  user_id = auth.uid() OR
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Notifications insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Notifications update" ON notifications FOR UPDATE USING (
  user_id = auth.uid() OR
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
);

-- Categories policies
CREATE POLICY "Categories read" ON categories FOR SELECT USING (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Categories insert" ON categories FOR INSERT WITH CHECK (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);
CREATE POLICY "Categories update" ON categories FOR UPDATE USING (
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.receipt_number := 'DL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_receipt_number
  BEFORE INSERT ON sales
  FOR EACH ROW
  WHEN (NEW.receipt_number IS NULL)
  EXECUTE FUNCTION generate_receipt_number();

-- Auto-update stock on sale
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET quantity = quantity - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.product_id;
  
  INSERT INTO stock_history (product_id, business_id, branch_id, change_type, quantity_change, quantity_before, quantity_after, reference_id)
  SELECT NEW.product_id, s.business_id, s.branch_id, 'sale', -NEW.quantity,
    p.quantity + NEW.quantity, p.quantity, NEW.sale_id
  FROM sales s, products p
  WHERE s.id = NEW.sale_id AND p.id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_sale();

-- Check low stock and create notification
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= NEW.min_stock THEN
    INSERT INTO notifications (business_id, title, message, type)
    VALUES (
      NEW.business_id,
      'Stock Alert: ' || NEW.name,
      'Bidhaa "' || NEW.name || '" imebaki ' || NEW.quantity || ' ' || NEW.unit || '. Kiwango cha chini: ' || NEW.min_stock,
      'stock_alert'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_low_stock
  AFTER UPDATE OF quantity ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();

-- Auto set trial period on business creation
CREATE OR REPLACE FUNCTION set_trial_period()
RETURNS TRIGGER AS $$
DECLARE
  trial_d INTEGER;
BEGIN
  SELECT COALESCE(setting_value::INTEGER, 5) INTO trial_d
  FROM system_settings WHERE setting_key = 'trial_days';
  
  NEW.trial_ends_at := NOW() + (trial_d || ' days')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_trial
  BEFORE INSERT ON businesses
  FOR EACH ROW
  WHEN (NEW.trial_ends_at IS NULL)
  EXECUTE FUNCTION set_trial_period();

-- ============================================
-- SEED ADMIN USER (Run after auth signup)
-- After creating admin via Supabase Auth:
-- Email: baruthdickson600@gmail.com
-- Password: baruth@500
-- Then run:
-- ============================================
-- INSERT INTO users (id, name, email, role)
-- VALUES ('<auth-user-id>', 'Admin', 'baruthdickson600@gmail.com', 'admin');
