CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','doctor','staff')),
  phone VARCHAR(30),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  specialization VARCHAR(120) NOT NULL,
  consultation_fee NUMERIC(10,2) NOT NULL CHECK (consultation_fee >= 0),
  available_from TIME NOT NULL DEFAULT '09:00',
  available_to TIME NOT NULL DEFAULT '17:00',
  room_no VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (available_to > available_from)
);

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  mrn VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('male','female','other')),
  date_of_birth DATE,
  phone VARCHAR(30),
  email VARCHAR(160),
  address TEXT,
  blood_group VARCHAR(5),
  emergency_contact VARCHAR(120),
  medical_history TEXT,
  allergies TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 10 AND 240),
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  reason TEXT,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE appointments ADD CONSTRAINT no_doctor_double_booking
  EXCLUDE USING gist (
    doctor_id WITH =,
    tsrange(scheduled_at, scheduled_at + (duration_minutes * INTERVAL '1 minute'), '[)') WITH &&
  ) WHERE (status IN ('scheduled','completed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS lab_tests (
  id SERIAL PRIMARY KEY,
  test_name VARCHAR(140) NOT NULL UNIQUE,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  normal_range VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_requests (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  lab_test_id INTEGER NOT NULL REFERENCES lab_tests(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','sample_collected','completed','cancelled')),
  result_value TEXT,
  result_notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  bill_no VARCHAR(40) NOT NULL UNIQUE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','cancelled')),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  tax NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bill_items (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('consultation','lab','medicine','service')),
  description VARCHAR(180) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  source_lab_request_id INTEGER UNIQUE REFERENCES lab_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  method VARCHAR(30) NOT NULL CHECK (method IN ('cash','card','bank','insurance')),
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(80) NOT NULL,
  record_id TEXT NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION write_audit_log() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs(table_name, record_id, action, new_data) VALUES (TG_TABLE_NAME, NEW.id::text, TG_OP, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs(table_name, record_id, action, old_data, new_data) VALUES (TG_TABLE_NAME, NEW.id::text, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO audit_logs(table_name, record_id, action, old_data) VALUES (TG_TABLE_NAME, OLD.id::text, TG_OP, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recalc_bill_totals(p_bill_id INTEGER) RETURNS VOID AS $$
DECLARE s NUMERIC(10,2); p NUMERIC(10,2);
BEGIN
  SELECT COALESCE(SUM(line_total),0) INTO s FROM bill_items WHERE bill_id = p_bill_id;
  SELECT COALESCE(SUM(amount),0) INTO p FROM payments WHERE bill_id = p_bill_id;
  UPDATE bills
  SET subtotal = s,
      total = GREATEST(s - discount + tax,0),
      paid_amount = p,
      status = CASE
        WHEN status = 'cancelled' THEN 'cancelled'
        WHEN p <= 0 THEN 'unpaid'
        WHEN p < GREATEST(s - discount + tax,0) THEN 'partial'
        ELSE 'paid'
      END,
      updated_at = NOW()
  WHERE id = p_bill_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION bill_item_change_recalc() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_bill_totals(OLD.bill_id);
    RETURN OLD;
  ELSE
    PERFORM recalc_bill_totals(NEW.bill_id);
    RETURN NEW;
  END IF;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION payment_change_recalc() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_bill_totals(OLD.bill_id);
    RETURN OLD;
  ELSE
    PERFORM recalc_bill_totals(NEW.bill_id);
    RETURN NEW;
  END IF;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_lab_bill_item() RETURNS TRIGGER AS $$
DECLARE b_id INTEGER; test_title TEXT; test_price NUMERIC(10,2);
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT id INTO b_id FROM bills WHERE appointment_id = NEW.appointment_id LIMIT 1;
    SELECT test_name, price INTO test_title, test_price FROM lab_tests WHERE id = NEW.lab_test_id;
    IF b_id IS NOT NULL THEN
      INSERT INTO bill_items(bill_id, item_type, description, quantity, unit_price, source_lab_request_id)
      VALUES (b_id, 'lab', test_title, 1, test_price, NEW.id)
      ON CONFLICT (source_lab_request_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['users','doctors','patients','appointments','lab_requests','bills'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t, t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_bill_items_recalc ON bill_items;
CREATE TRIGGER trg_bill_items_recalc AFTER INSERT OR UPDATE OR DELETE ON bill_items FOR EACH ROW EXECUTE FUNCTION bill_item_change_recalc();
DROP TRIGGER IF EXISTS trg_payments_recalc ON payments;
CREATE TRIGGER trg_payments_recalc AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION payment_change_recalc();
DROP TRIGGER IF EXISTS trg_lab_bill_item ON lab_requests;
CREATE TRIGGER trg_lab_bill_item AFTER UPDATE ON lab_requests FOR EACH ROW EXECUTE FUNCTION create_lab_bill_item();

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['patients','appointments','lab_requests','bills','payments'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_audit ON %I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION write_audit_log()', t, t);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_patients_search ON patients USING gin (to_tsvector('english', full_name || ' ' || COALESCE(phone,'') || ' ' || COALESCE(mrn,'')));
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_requests_status ON lab_requests(status);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

CREATE OR REPLACE VIEW vw_doctor_schedule AS
SELECT a.id, a.scheduled_at, a.duration_minutes, a.status, p.full_name AS patient_name, p.mrn, u.name AS doctor_name, d.id AS doctor_id, a.reason
FROM appointments a
JOIN patients p ON p.id = a.patient_id
JOIN doctors d ON d.id = a.doctor_id
JOIN users u ON u.id = d.user_id;

CREATE OR REPLACE VIEW vw_billing_summary AS
SELECT b.id, b.bill_no, p.full_name AS patient_name, b.status, b.subtotal, b.discount, b.tax, b.total, b.paid_amount,
       (b.total - b.paid_amount) AS balance, b.created_at
FROM bills b JOIN patients p ON p.id = b.patient_id;

CREATE OR REPLACE VIEW vw_admin_dashboard AS
SELECT
  (SELECT COUNT(*) FROM patients) AS total_patients,
  (SELECT COUNT(*) FROM appointments WHERE scheduled_at::date = CURRENT_DATE) AS today_appointments,
  (SELECT COUNT(*) FROM lab_requests WHERE status <> 'completed') AS pending_lab_requests,
  (SELECT COALESCE(SUM(total),0) FROM bills WHERE status <> 'cancelled') AS total_revenue,
  (SELECT COALESCE(SUM(total-paid_amount),0) FROM bills WHERE status IN ('unpaid','partial')) AS outstanding_amount;
