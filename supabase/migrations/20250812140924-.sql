-- Ensure enum has the expected values (no IF NOT EXISTS fallback)
ALTER TYPE reggio.member_role ADD VALUE 'owner';
ALTER TYPE reggio.member_role ADD VALUE 'admin';
ALTER TYPE reggio.member_role ADD VALUE 'member';