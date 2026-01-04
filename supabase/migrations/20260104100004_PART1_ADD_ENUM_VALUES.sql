-- ========================================================
-- PART 1: ADD ENUM VALUES (Must be applied first)
-- ========================================================

-- Add new account types to enum
DO $$ 
BEGIN
    -- Add contra_revenue if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'contra_revenue' 
        AND enumtypid = 'account_type'::regtype
    ) THEN
        ALTER TYPE account_type ADD VALUE 'contra_revenue';
    END IF;
    
    -- Add other_income if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'other_income' 
        AND enumtypid = 'account_type'::regtype
    ) THEN
        ALTER TYPE account_type ADD VALUE 'other_income';
    END IF;
END $$;

-- STOP HERE! Apply this first, then apply PART 2
