-- Seeded decks with subtopics, spanning a wide variety of subjects so "Roll
-- Random" has real breadth to draw from. Chapters are generated lazily on
-- first roll and cached in the `chapters` table, so no chapter content lives
-- here. Re-runnable: every insert is ON CONFLICT-safe.

insert into decks (id, owner_id, title, subject, source_type, visibility) values
  ('00000000-0000-0000-0000-000000000001', null, 'Microeconomics 101', 'Economics', 'seeded', 'public'),
  ('00000000-0000-0000-0000-000000000002', null, 'US History: 1865–1945', 'History', 'seeded', 'public'),
  ('00000000-0000-0000-0000-000000000003', null, 'Cell Biology', 'Biology', 'seeded', 'public'),
  ('00000000-0000-0000-0000-000000000004', null, 'Psychology 101', 'Psychology', 'seeded', 'public'),
  ('00000000-0000-0000-0000-000000000005', null, 'Computer Science Fundamentals', 'Computer Science', 'seeded', 'public'),
  ('00000000-0000-0000-0000-000000000006', null, 'Astronomy', 'Astronomy', 'seeded', 'public'),
  ('00000000-0000-0000-0000-000000000007', null, 'Philosophy 101', 'Philosophy', 'seeded', 'public'),
  ('00000000-0000-0000-0000-000000000008', null, 'General Chemistry', 'Chemistry', 'seeded', 'public'),
  ('00000000-0000-0000-0000-000000000009', null, 'Physics 101', 'Physics', 'seeded', 'public'),
  ('00000000-0000-0000-0000-00000000000a', null, 'World Literature', 'Literature', 'seeded', 'public'),
  ('00000000-0000-0000-0000-00000000000b', null, 'Art History', 'Art History', 'seeded', 'public'),
  ('00000000-0000-0000-0000-00000000000c', null, 'Political Science', 'Political Science', 'seeded', 'public'),
  ('00000000-0000-0000-0000-00000000000d', null, 'Statistics & Probability', 'Statistics', 'seeded', 'public'),
  -- Shared pool for free-typed "what do you want to study" topics. Subtopics
  -- are added here at request time by the /subtopics/custom endpoint, not here,
  -- so the same typed topic is cached and reused across every user.
  ('00000000-0000-0000-0000-00000000000e', null, 'Custom Topics', 'General', 'custom', 'public')
on conflict (id) do nothing;

insert into deck_configs (deck_id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0000-000000000007'),
  ('00000000-0000-0000-0000-000000000008'),
  ('00000000-0000-0000-0000-000000000009'),
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c'),
  ('00000000-0000-0000-0000-00000000000d'),
  ('00000000-0000-0000-0000-00000000000e')
on conflict (deck_id) do nothing;

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
  ('00000000-0000-0000-0000-000000000003', 'Apoptosis and programmed cell death', 'advanced'),

  ('00000000-0000-0000-0000-000000000004', 'Classical vs operant conditioning', 'intro'),
  ('00000000-0000-0000-0000-000000000004', 'Cognitive biases and heuristics', 'core'),
  ('00000000-0000-0000-0000-000000000004', 'Stages of memory: encoding, storage, retrieval', 'core'),
  ('00000000-0000-0000-0000-000000000004', 'Attachment theory', 'core'),
  ('00000000-0000-0000-0000-000000000004', 'Social influence and conformity', 'core'),
  ('00000000-0000-0000-0000-000000000004', 'Neurotransmitters and mood regulation', 'advanced'),
  ('00000000-0000-0000-0000-000000000004', 'Stages of development across the lifespan', 'advanced'),

  ('00000000-0000-0000-0000-000000000005', 'Big-O notation and algorithmic complexity', 'intro'),
  ('00000000-0000-0000-0000-000000000005', 'Recursion and the call stack', 'core'),
  ('00000000-0000-0000-0000-000000000005', 'Sorting algorithms: quicksort and mergesort', 'core'),
  ('00000000-0000-0000-0000-000000000005', 'Hash tables', 'core'),
  ('00000000-0000-0000-0000-000000000005', 'Graph traversal: BFS and DFS', 'core'),
  ('00000000-0000-0000-0000-000000000005', 'TCP/IP and how packets route', 'advanced'),
  ('00000000-0000-0000-0000-000000000005', 'Relational databases and normalization', 'advanced'),

  ('00000000-0000-0000-0000-000000000006', 'The life cycle of stars', 'intro'),
  ('00000000-0000-0000-0000-000000000006', 'Formation of the solar system', 'core'),
  ('00000000-0000-0000-0000-000000000006', 'General relativity and gravity', 'advanced'),
  ('00000000-0000-0000-0000-000000000006', 'Exoplanet detection methods', 'core'),
  ('00000000-0000-0000-0000-000000000006', 'The expanding universe and redshift', 'core'),
  ('00000000-0000-0000-0000-000000000006', 'Black holes and event horizons', 'advanced'),
  ('00000000-0000-0000-0000-000000000006', 'The cosmic microwave background', 'advanced'),

  ('00000000-0000-0000-0000-000000000007', 'The trolley problem and utilitarian ethics', 'intro'),
  ('00000000-0000-0000-0000-000000000007', 'Descartes and radical doubt', 'core'),
  ('00000000-0000-0000-0000-000000000007', "Plato's theory of forms", 'core'),
  ('00000000-0000-0000-0000-000000000007', 'Free will vs determinism', 'core'),
  ('00000000-0000-0000-0000-000000000007', 'The is-ought problem', 'advanced'),
  ('00000000-0000-0000-0000-000000000007', 'Existentialism and authenticity', 'advanced'),
  ('00000000-0000-0000-0000-000000000007', 'The Ship of Theseus and personal identity', 'core'),

  ('00000000-0000-0000-0000-000000000008', 'Atomic structure and electron configuration', 'intro'),
  ('00000000-0000-0000-0000-000000000008', 'Covalent vs ionic bonding', 'core'),
  ('00000000-0000-0000-0000-000000000008', 'Acid-base equilibria and pH', 'core'),
  ('00000000-0000-0000-0000-000000000008', 'Reaction rates and catalysis', 'core'),
  ('00000000-0000-0000-0000-000000000008', 'Stoichiometry and limiting reagents', 'core'),
  ('00000000-0000-0000-0000-000000000008', 'Redox reactions', 'advanced'),
  ('00000000-0000-0000-0000-000000000008', "The periodic table's organizing trends", 'intro'),

  ('00000000-0000-0000-0000-000000000009', "Newton's three laws of motion", 'intro'),
  ('00000000-0000-0000-0000-000000000009', 'Conservation of energy and momentum', 'core'),
  ('00000000-0000-0000-0000-000000000009', "Electric fields and Coulomb's law", 'core'),
  ('00000000-0000-0000-0000-000000000009', 'Waves, frequency, and interference', 'core'),
  ('00000000-0000-0000-0000-000000000009', 'Thermodynamics and entropy', 'advanced'),
  ('00000000-0000-0000-0000-000000000009', 'Special relativity basics', 'advanced'),
  ('00000000-0000-0000-0000-000000000009', 'Quantum superposition', 'advanced'),

  ('00000000-0000-0000-0000-00000000000a', "The hero's journey structure", 'intro'),
  ('00000000-0000-0000-0000-00000000000a', 'Magical realism as a literary mode', 'core'),
  ('00000000-0000-0000-0000-00000000000a', 'Unreliable narrators', 'core'),
  ('00000000-0000-0000-0000-00000000000a', 'Tragic heroes and the tragic flaw', 'core'),
  ('00000000-0000-0000-0000-00000000000a', 'Stream of consciousness technique', 'advanced'),
  ('00000000-0000-0000-0000-00000000000a', 'Allegory vs symbolism', 'core'),
  ('00000000-0000-0000-0000-00000000000a', 'Colonial and postcolonial narrative voice', 'advanced'),

  ('00000000-0000-0000-0000-00000000000b', "The Renaissance's rediscovery of perspective", 'intro'),
  ('00000000-0000-0000-0000-00000000000b', 'Impressionism and the depiction of light', 'core'),
  ('00000000-0000-0000-0000-00000000000b', 'Cubism and fractured form', 'core'),
  ('00000000-0000-0000-0000-00000000000b', 'Baroque drama and chiaroscuro', 'core'),
  ('00000000-0000-0000-0000-00000000000b', 'Abstract Expressionism', 'core'),
  ('00000000-0000-0000-0000-00000000000b', 'Patronage and the Sistine Chapel', 'intro'),
  ('00000000-0000-0000-0000-00000000000b', 'Surrealism and the unconscious', 'advanced'),

  ('00000000-0000-0000-0000-00000000000c', 'Separation of powers', 'intro'),
  ('00000000-0000-0000-0000-00000000000c', 'Federalism vs unitary systems', 'core'),
  ('00000000-0000-0000-0000-00000000000c', 'Electoral systems: proportional vs first-past-the-post', 'core'),
  ('00000000-0000-0000-0000-00000000000c', 'The social contract tradition', 'core'),
  ('00000000-0000-0000-0000-00000000000c', 'Checks and balances', 'intro'),
  ('00000000-0000-0000-0000-00000000000c', 'Mechanisms of political polarization', 'advanced'),
  ('00000000-0000-0000-0000-00000000000c', 'Sovereignty and international law', 'advanced'),

  ('00000000-0000-0000-0000-00000000000d', 'Mean, median, and skew', 'intro'),
  ('00000000-0000-0000-0000-00000000000d', 'The normal distribution', 'core'),
  ('00000000-0000-0000-0000-00000000000d', 'Hypothesis testing and p-values', 'core'),
  ('00000000-0000-0000-0000-00000000000d', 'Correlation vs causation', 'intro'),
  ('00000000-0000-0000-0000-00000000000d', "Bayes' theorem", 'advanced'),
  ('00000000-0000-0000-0000-00000000000d', 'Sampling bias', 'core'),
  ('00000000-0000-0000-0000-00000000000d', 'Confidence intervals', 'advanced')
on conflict (deck_id, title) do nothing;
