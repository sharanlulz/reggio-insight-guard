-- Seed with NOT EXISTS guards to avoid ON CONFLICT issues
INSERT INTO reggio.organizations (id, name)
SELECT 'd3546758-a241-4546-aff7-fa600731502a', 'Reggio Demo Org'
WHERE NOT EXISTS (
  SELECT 1 FROM reggio.organizations WHERE id = 'd3546758-a241-4546-aff7-fa600731502a'
);

INSERT INTO reggio.org_members (org_id, user_id, role)
SELECT 'd3546758-a241-4546-aff7-fa600731502a', 'fd91ae89-4f12-42d5-96ab-55691454e45f', 'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM reggio.org_members WHERE org_id = 'd3546758-a241-4546-aff7-fa600731502a' AND user_id = 'fd91ae89-4f12-42d5-96ab-55691454e45f'
);

INSERT INTO reggio.regulations (org_id, title, short_code, jurisdiction, regulator)
SELECT 'd3546758-a241-4546-aff7-fa600731502a', 'PRA Liquidity (Test Extract)', 'PRA-LIQ-TEST', 'UK', 'PRA'
WHERE NOT EXISTS (
  SELECT 1 FROM reggio.regulations WHERE short_code = 'PRA-LIQ-TEST'
);