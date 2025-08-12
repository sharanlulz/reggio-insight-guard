-- Retry seed now that enum includes 'owner'
INSERT INTO reggio.organizations (id, name)
VALUES ('d3546758-a241-4546-aff7-fa600731502a', 'Reggio Demo Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reggio.org_members (org_id, user_id, role)
VALUES ('d3546758-a241-4546-aff7-fa600731502a', 'fd91ae89-4f12-42d5-96ab-55691454e45f', 'owner')
ON CONFLICT DO NOTHING;

INSERT INTO reggio.regulations (org_id, title, short_code, jurisdiction, regulator)
VALUES (
  'd3546758-a241-4546-aff7-fa600731502a',
  'PRA Liquidity (Test Extract)',
  'PRA-LIQ-TEST',
  'UK',
  'PRA'
)
ON CONFLICT (short_code) DO NOTHING;