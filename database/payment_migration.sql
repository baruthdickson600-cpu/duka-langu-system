-- ============================================
-- DUKA LANGU - Payment System Migration
-- Run this AFTER schema.sql
-- ============================================

-- 1. PAYMENT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id),

  -- Payment info submitted by office
  transaction_id TEXT NOT NULL,
  payer_name TEXT,
  payer_phone TEXT,
  amount NUMERIC(12,2) NOT NULL,
  payment_method TEXT DEFAULT 'selcom',
  days_requested INTEGER DEFAULT 30,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,

  -- When approved
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  token_id UUID REFERENCES tokens(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_business ON payment_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created ON payment_requests(created_at DESC);

-- 2. ENABLE RLS
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Policies: Office can read own, admin reads all
CREATE POLICY "Payment requests read" ON payment_requests FOR SELECT USING (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Payment requests insert" ON payment_requests FOR INSERT WITH CHECK (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid()) OR
  business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
);

CREATE POLICY "Payment requests update" ON payment_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
);

-- 3. AUTO-APPROVE FUNCTION
-- When admin approves, automatically create and activate token for the business
CREATE OR REPLACE FUNCTION auto_activate_payment()
RETURNS TRIGGER AS $$
DECLARE
  new_token_id UUID;
  new_token_code TEXT;
  expiry_date TIMESTAMPTZ;
BEGIN
  -- Only proceed if status changed to approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    -- Generate unique token code
    new_token_code := 'DL-' ||
      SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 4) || '-' ||
      SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 4);
    new_token_code := UPPER(new_token_code);

    -- Calculate expiry
    expiry_date := NOW() + (NEW.days_requested || ' days')::INTERVAL;

    -- Create and immediately activate token
    INSERT INTO tokens (
      token_code,
      business_id,
      days_valid,
      price,
      activated_at,
      expires_at,
      status,
      created_by
    ) VALUES (
      new_token_code,
      NEW.business_id,
      NEW.days_requested,
      NEW.amount,
      NOW(),
      expiry_date,
      'active',
      NEW.approved_by
    )
    RETURNING id INTO new_token_id;

    -- Link token to payment request
    NEW.token_id := new_token_id;
    NEW.approved_at := NOW();

    -- Create success notification for office
    INSERT INTO notifications (business_id, title, message, type)
    VALUES (
      NEW.business_id,
      '✅ Malipo Yamethibitishwa!',
      'Malipo yako ya ' || NEW.amount::TEXT || ' TZS yamethibitishwa. Mfumo umefunguliwa kwa siku ' || NEW.days_requested || '.',
      'success'
    );
  END IF;

  -- If rejected, notify office
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    INSERT INTO notifications (business_id, title, message, type)
    VALUES (
      NEW.business_id,
      '❌ Malipo Yamekataliwa',
      COALESCE('Sababu: ' || NEW.rejection_reason, 'Tafadhali wasiliana na admin.'),
      'error'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_activate_payment ON payment_requests;
CREATE TRIGGER trigger_auto_activate_payment
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_activate_payment();

-- 4. NOTIFY ADMIN ON NEW PAYMENT REQUEST
CREATE OR REPLACE FUNCTION notify_admin_new_payment()
RETURNS TRIGGER AS $$
DECLARE
  admin_id UUID;
  biz_name TEXT;
BEGIN
  -- Get business name
  SELECT business_name INTO biz_name FROM businesses WHERE id = NEW.business_id;

  -- Notify all admins
  FOR admin_id IN SELECT id FROM users WHERE role = 'admin' LOOP
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      admin_id,
      '💰 Malipo Mapya',
      'Duka: ' || COALESCE(biz_name, 'Unknown') || ' | Kiasi: ' || NEW.amount::TEXT || ' TZS | TxID: ' || NEW.transaction_id,
      'info'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_admin_payment ON payment_requests;
CREATE TRIGGER trigger_notify_admin_payment
  AFTER INSERT ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_payment();

-- ============================================
-- DONE! Payment system ready.
-- ============================================
