-- Feature: Smart Hospital Recommendation + Medicine & Symptom Explorer.
--
-- Reference data (specialties, symptoms, medicines, medicine_symptoms) is
-- public/read-only from the client -- it has no per-user ownership, so RLS
-- allows SELECT to anon+authenticated but writes are service-role only (no
-- INSERT/UPDATE/DELETE policy is created for the other roles).
--
-- hospitals + hospital_specialties persist normalized results fetched from a
-- PlacesProvider (SerpApi today, swappable later) so repeat page loads for a
-- place already seen don't need another external call. hospital_search_cache
-- is the raw provider-response cache keyed by rounded lat/lng + radius +
-- specialty (see src/lib/geo.ts) -- it is server-only (no client policy at
-- all, so RLS default-denies anon/authenticated; only supabaseAdmin,
-- service_role, bypasses RLS to read/write it).

CREATE TABLE public.specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read specialties" ON public.specialties FOR SELECT USING (true);
GRANT SELECT ON public.specialties TO anon, authenticated;
GRANT ALL ON public.specialties TO service_role;

CREATE TABLE public.symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read symptoms" ON public.symptoms FOR SELECT USING (true);
GRANT SELECT ON public.symptoms TO anon, authenticated;
GRANT ALL ON public.symptoms TO service_role;

CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  brand_names TEXT[] NOT NULL DEFAULT '{}',
  drug_class TEXT,
  description TEXT,
  common_uses TEXT[] NOT NULL DEFAULT '{}',
  precautions TEXT[] NOT NULL DEFAULT '{}',
  side_effects TEXT[] NOT NULL DEFAULT '{}',
  prescription_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX medicines_name_lower_idx ON public.medicines (lower(name));
CREATE INDEX medicines_generic_name_idx ON public.medicines (lower(generic_name));
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read medicines" ON public.medicines FOR SELECT USING (true);
GRANT SELECT ON public.medicines TO anon, authenticated;
GRANT ALL ON public.medicines TO service_role;

CREATE TABLE public.medicine_symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE CASCADE,
  symptom_id UUID NOT NULL REFERENCES public.symptoms(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'treats'
    CHECK (relationship_type IN ('treats', 'may_cause', 'contraindicated_for')),
  UNIQUE (medicine_id, symptom_id, relationship_type)
);
ALTER TABLE public.medicine_symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read medicine_symptoms" ON public.medicine_symptoms FOR SELECT USING (true);
GRANT SELECT ON public.medicine_symptoms TO anon, authenticated;
GRANT ALL ON public.medicine_symptoms TO service_role;
CREATE INDEX medicine_symptoms_symptom_idx ON public.medicine_symptoms(symptom_id);
CREATE INDEX medicine_symptoms_medicine_idx ON public.medicine_symptoms(medicine_id);

CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  rating DOUBLE PRECISION,
  review_count INTEGER,
  phone TEXT,
  website TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);
CREATE INDEX hospitals_location_idx ON public.hospitals (latitude, longitude);
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read hospitals" ON public.hospitals FOR SELECT USING (true);
GRANT SELECT ON public.hospitals TO anon, authenticated;
GRANT ALL ON public.hospitals TO service_role;

CREATE TABLE public.hospital_specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  UNIQUE (hospital_id, specialty_id)
);
ALTER TABLE public.hospital_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read hospital_specialties" ON public.hospital_specialties FOR SELECT USING (true);
GRANT SELECT ON public.hospital_specialties TO anon, authenticated;
GRANT ALL ON public.hospital_specialties TO service_role;

CREATE TABLE public.hospital_search_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.hospital_search_cache ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.hospital_search_cache TO service_role;
CREATE INDEX hospital_search_cache_expires_idx ON public.hospital_search_cache (expires_at);

-- Seed reference data ----------------------------------------------------

INSERT INTO public.specialties (name, description) VALUES
  ('General Medicine', 'General physicians for everyday illness and checkups'),
  ('Emergency Medicine', 'Emergency and trauma care'),
  ('Pulmonology', 'Lungs and breathing conditions'),
  ('Cardiology', 'Heart and circulatory conditions'),
  ('ENT', 'Ear, nose, and throat'),
  ('Gastroenterology', 'Digestive system'),
  ('Neurology', 'Brain and nervous system'),
  ('Dermatology', 'Skin conditions'),
  ('Orthopedics', 'Bones, joints, and muscles'),
  ('Pediatrics', 'Children''s health'),
  ('Gynecology', 'Women''s reproductive health'),
  ('Psychiatry', 'Mental health')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.symptoms (name, description) VALUES
  ('Fever', 'Elevated body temperature'),
  ('Cough', 'Persistent or occasional cough'),
  ('Headache', 'Pain in the head'),
  ('Cold', 'Runny or blocked nose, sneezing'),
  ('Sore throat', 'Pain or irritation in the throat'),
  ('Nausea', 'Feeling of wanting to vomit'),
  ('Vomiting', 'Expelling stomach contents'),
  ('Diarrhea', 'Frequent loose stools'),
  ('Body ache', 'Generalized muscle or joint pain'),
  ('Fatigue', 'Persistent tiredness'),
  ('Difficulty breathing', 'Shortness of breath'),
  ('Chest pain', 'Pain or pressure in the chest'),
  ('Dizziness', 'Lightheadedness or unsteadiness'),
  ('Rash', 'Skin irritation or eruption'),
  ('Acidity', 'Heartburn or acid reflux'),
  ('Allergy', 'Allergic reaction symptoms')
ON CONFLICT (name) DO NOTHING;

-- A small, illustrative starter set of common OTC/prescription medicines.
-- This is educational reference data, not a complete or authoritative drug
-- database -- extend it (or swap in a licensed dataset) before relying on it
-- for real guidance.
INSERT INTO public.medicines
  (name, generic_name, brand_names, drug_class, description, common_uses, precautions, side_effects, prescription_required)
VALUES
  ('Paracetamol', 'Paracetamol (Acetaminophen)', ARRAY['Crocin','Dolo 650','Calpol','Tylenol'], 'Analgesic/Antipyretic',
   'Common pain reliever and fever reducer.',
   ARRAY['Fever','Headache','Body ache','Minor pain'],
   ARRAY['Avoid exceeding the labeled daily dose','Use caution with liver conditions or heavy alcohol use'],
   ARRAY['Nausea','Rash (rare)','Liver stress at high doses'],
   false),
  ('Ibuprofen', 'Ibuprofen', ARRAY['Brufen','Advil','Combiflam (with paracetamol)'], 'NSAID',
   'Nonsteroidal anti-inflammatory used for pain, inflammation, and fever.',
   ARRAY['Body ache','Headache','Fever','Inflammation'],
   ARRAY['Take with food','Avoid with stomach ulcers or certain kidney conditions','Avoid in late pregnancy'],
   ARRAY['Stomach upset','Heartburn','Dizziness'],
   false),
  ('Cetirizine', 'Cetirizine', ARRAY['Zyrtec','Cetrizine','Alerid'], 'Antihistamine',
   'Second-generation antihistamine for allergy relief.',
   ARRAY['Allergy','Cold','Rash'],
   ARRAY['May cause mild drowsiness in some people'],
   ARRAY['Drowsiness','Dry mouth'],
   false),
  ('Azithromycin', 'Azithromycin', ARRAY['Azithral','Zithromax'], 'Antibiotic (Macrolide)',
   'Antibiotic used for certain bacterial infections, as prescribed by a doctor.',
   ARRAY['Bacterial respiratory infection','Sore throat (bacterial)'],
   ARRAY['Complete the full prescribed course','Only take if prescribed for a confirmed or suspected bacterial infection'],
   ARRAY['Nausea','Diarrhea','Abdominal pain'],
   true),
  ('Amoxicillin', 'Amoxicillin', ARRAY['Novamox','Amoxil'], 'Antibiotic (Penicillin)',
   'Antibiotic used for a range of bacterial infections, as prescribed.',
   ARRAY['Bacterial infection','Sore throat (bacterial)'],
   ARRAY['Inform your doctor of any penicillin allergy','Complete the full prescribed course'],
   ARRAY['Rash','Nausea','Diarrhea'],
   true),
  ('Omeprazole', 'Omeprazole', ARRAY['Omez','Prilosec'], 'Proton Pump Inhibitor',
   'Reduces stomach acid production.',
   ARRAY['Acidity','Heartburn','Acid reflux'],
   ARRAY['Long-term use should be supervised by a doctor'],
   ARRAY['Headache','Stomach upset'],
   false),
  ('Domperidone', 'Domperidone', ARRAY['Domstal'], 'Antiemetic',
   'Used to relieve nausea and vomiting.',
   ARRAY['Nausea','Vomiting'],
   ARRAY['Avoid with certain heart conditions -- consult a doctor'],
   ARRAY['Dry mouth','Headache'],
   true),
  ('Oral Rehydration Salts', 'ORS', ARRAY['Electral','ORS-L'], 'Rehydration therapy',
   'Replaces fluids and electrolytes lost from diarrhea or vomiting.',
   ARRAY['Diarrhea','Vomiting','Dehydration'],
   ARRAY['Prepare with clean water per label instructions'],
   ARRAY['Rare if prepared correctly'],
   false),
  ('Loperamide', 'Loperamide', ARRAY['Imodium','Lopamide'], 'Antidiarrheal',
   'Slows gut movement to reduce diarrhea.',
   ARRAY['Diarrhea'],
   ARRAY['Avoid if fever or blood in stool is present -- seek medical advice instead'],
   ARRAY['Constipation','Dizziness'],
   false),
  ('Salbutamol', 'Salbutamol (Albuterol)', ARRAY['Asthalin','Ventolin'], 'Bronchodilator',
   'Relaxes airway muscles to ease breathing, typically via inhaler.',
   ARRAY['Difficulty breathing','Wheezing','Asthma'],
   ARRAY['Use as prescribed for asthma/COPD management'],
   ARRAY['Tremor','Rapid heartbeat'],
   true),
  ('Amlodipine', 'Amlodipine', ARRAY['Amlopres','Norvasc'], 'Calcium Channel Blocker',
   'Used to manage high blood pressure, as prescribed.',
   ARRAY['High blood pressure'],
   ARRAY['Do not stop abruptly without medical advice'],
   ARRAY['Swelling in ankles','Dizziness'],
   true),
  ('Atorvastatin', 'Atorvastatin', ARRAY['Lipitor','Atorva'], 'Statin',
   'Used to manage cholesterol levels, as prescribed.',
   ARRAY['High cholesterol'],
   ARRAY['Routine liver function monitoring may be advised'],
   ARRAY['Muscle aches','Digestive upset'],
   true),
  ('Metformin', 'Metformin', ARRAY['Glycomet','Glucophage'], 'Antidiabetic (Biguanide)',
   'Used to manage type 2 diabetes, as prescribed.',
   ARRAY['Type 2 diabetes'],
   ARRAY['Take with food to reduce stomach upset'],
   ARRAY['Nausea','Diarrhea'],
   true),
  ('Pantoprazole', 'Pantoprazole', ARRAY['Pan-D','Protonix'], 'Proton Pump Inhibitor',
   'Reduces stomach acid; often combined with domperidone for acidity with nausea.',
   ARRAY['Acidity','Heartburn'],
   ARRAY['Long-term use should be supervised by a doctor'],
   ARRAY['Headache','Nausea'],
   false),
  ('Diclofenac', 'Diclofenac', ARRAY['Voveran','Voltaren'], 'NSAID',
   'Used for pain and inflammation relief.',
   ARRAY['Body ache','Headache','Inflammation'],
   ARRAY['Take with food','Avoid with stomach ulcers or kidney conditions'],
   ARRAY['Stomach upset','Heartburn'],
   false),
  ('Vitamin C', 'Ascorbic acid', ARRAY['Limcee','Celin'], 'Vitamin/Supplement',
   'Supports immune function; commonly used as a general wellness supplement.',
   ARRAY['Cold','General wellness'],
   ARRAY['Generally well tolerated at recommended doses'],
   ARRAY['Stomach upset at high doses'],
   false)
ON CONFLICT (lower(name)) DO NOTHING;

INSERT INTO public.medicine_symptoms (medicine_id, symptom_id, relationship_type)
SELECT m.id, s.id, 'treats' FROM public.medicines m, public.symptoms s
WHERE (m.name, s.name) IN (
  ('Paracetamol','Fever'), ('Paracetamol','Headache'), ('Paracetamol','Body ache'),
  ('Ibuprofen','Body ache'), ('Ibuprofen','Headache'), ('Ibuprofen','Fever'),
  ('Cetirizine','Allergy'), ('Cetirizine','Cold'), ('Cetirizine','Rash'),
  ('Azithromycin','Sore throat'), ('Azithromycin','Cough'),
  ('Amoxicillin','Sore throat'),
  ('Omeprazole','Acidity'),
  ('Domperidone','Nausea'), ('Domperidone','Vomiting'),
  ('Oral Rehydration Salts','Diarrhea'), ('Oral Rehydration Salts','Vomiting'),
  ('Loperamide','Diarrhea'),
  ('Salbutamol','Difficulty breathing'),
  ('Pantoprazole','Acidity'),
  ('Diclofenac','Body ache'), ('Diclofenac','Headache'),
  ('Vitamin C','Cold')
)
ON CONFLICT DO NOTHING;
