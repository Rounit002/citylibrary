-- Create advance_payments_city table
CREATE TABLE IF NOT EXISTS advance_payments_city (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_advance_payments_city_student_id ON advance_payments_city(student_id);
CREATE INDEX IF NOT EXISTS idx_advance_payments_city_payment_date ON advance_payments_city(payment_date);
CREATE INDEX IF NOT EXISTS idx_advance_payments_city_created_at ON advance_payments_city(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_advance_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_advance_payments_city_updated_at
    BEFORE UPDATE ON advance_payments_city
    FOR EACH ROW
    EXECUTE FUNCTION update_advance_payments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE advance_payments_city IS 'Stores advance payments made by students';
COMMENT ON COLUMN advance_payments_city.student_id IS 'Foreign key reference to students table';
COMMENT ON COLUMN advance_payments_city.amount IS 'Amount paid in advance (must be positive)';
COMMENT ON COLUMN advance_payments_city.payment_date IS 'Date when the advance payment was made';
COMMENT ON COLUMN advance_payments_city.notes IS 'Optional notes about the advance payment';
COMMENT ON COLUMN advance_payments_city.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN advance_payments_city.updated_at IS 'Timestamp when the record was last updated';
