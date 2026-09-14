-- Three seeded decks with subtopics. Chapters are generated lazily on first roll
-- and cached in the `chapters` table, so no chapter content lives here.

insert into decks (id, owner_id, title, subject, source_type, visibility) values
  ('00000000-0000-0000-0000-000000000001', null, 'Microeconomics 101', 'Economics', 'seeded', 'public'),
  ('00000000-0000-0000-0000-000000000002', null, 'US History: 1865–1945', 'History', 'seeded', 'public'),
  ('00000000-0000-0000-0000-000000000003', null, 'Cell Biology', 'Biology', 'seeded', 'public');

insert into deck_configs (deck_id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003');

insert into subtopics (deck_id, title, difficulty_tier) values
  ('00000000-0000-0000-0000-000000000001', 'Supply and demand equilibrium', 'intro'),
  ('00000000-0000-0000-0000-000000000001', 'Price elasticity of demand', 'core'),
  ('00000000-0000-0000-0000-000000000001', 'Consumer and producer surplus', 'core'),
  ('00000000-0000-0000-0000-000000000001', 'Externalities and market failure', 'advanced'),
  ('00000000-0000-0000-0000-000000000001', 'Perfect competition vs monopoly', 'core'),
  ('00000000-0000-0000-0000-000000000001', 'Opportunity cost and comparative advantage', 'intro'),
  ('00000000-0000-0000-0000-000000000001', 'Price ceilings and price floors', 'core'),
  ('00000000-0000-0000-0000-000000000001', 'Public goods and the free-rider problem', 'advanced'),

  ('00000000-0000-0000-0000-000000000002', 'Reconstruction and its collapse', 'core'),
  ('00000000-0000-0000-0000-000000000002', 'The rise of industrial capitalism', 'core'),
  ('00000000-0000-0000-0000-000000000002', 'Populism and the 1896 election', 'advanced'),
  ('00000000-0000-0000-0000-000000000002', 'Progressive Era reforms', 'core'),
  ('00000000-0000-0000-0000-000000000002', 'US entry into World War I', 'intro'),
  ('00000000-0000-0000-0000-000000000002', 'The Great Depression and the New Deal', 'core'),
  ('00000000-0000-0000-0000-000000000002', 'The Harlem Renaissance', 'intro'),
  ('00000000-0000-0000-0000-000000000002', 'US mobilization in World War II', 'core'),

  ('00000000-0000-0000-0000-000000000003', 'Cell membrane structure and transport', 'intro'),
  ('00000000-0000-0000-0000-000000000003', 'Mitochondria and cellular respiration', 'core'),
  ('00000000-0000-0000-0000-000000000003', 'The cell cycle and mitosis', 'core'),
  ('00000000-0000-0000-0000-000000000003', 'DNA replication', 'core'),
  ('00000000-0000-0000-0000-000000000003', 'Transcription and translation', 'advanced'),
  ('00000000-0000-0000-0000-000000000003', 'Cell signaling pathways', 'advanced'),
  ('00000000-0000-0000-0000-000000000003', 'Photosynthesis in plant cells', 'core'),
  ('00000000-0000-0000-0000-000000000003', 'Apoptosis and programmed cell death', 'advanced');
