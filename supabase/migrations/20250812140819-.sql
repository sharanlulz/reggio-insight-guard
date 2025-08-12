-- Patch enum for org member role to include required values
DO $$ BEGIN
  CREATE TYPE reggio.member_role AS ENUM ('owner','admin','member');
EXCEPTION WHEN duplicate_object THEN
  BEGIN
    ALTER TYPE reggio.member_role ADD VALUE IF NOT EXISTS 'owner';
    ALTER TYPE reggio.member_role ADD VALUE IF NOT EXISTS 'admin';
    ALTER TYPE reggio.member_role ADD VALUE IF NOT EXISTS 'member';
  EXCEPTION WHEN others THEN NULL; END;
END $$;

-- Ensure org_members.role uses the enum
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='reggio' AND table_name='org_members' AND column_name='role'
  ) THEN
    BEGIN
      ALTER TABLE reggio.org_members ALTER COLUMN role TYPE reggio.member_role USING role::reggio.member_role;
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;

-- Retry seed membership
INSERT INTO reggio.org_members (org_id, user_id, role)
VALUES ('d3546758-a241-4546-aff7-fa600731502a', 'fd91ae89-4f12-42d5-96ab-55691454e45f', 'owner')
ON CONFLICT DO NOTHING;