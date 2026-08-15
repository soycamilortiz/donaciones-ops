-- Catálogo inicial de productos donados.
--
-- Sin filas aquí el reconocimiento no puede acertar nunca: emparejar() contra
-- una tabla vacía siempre devuelve null y toda foto queda para revisión manual.
--
-- Los `alias` son los términos que el OCR suele sacar del envase. Conviene
-- añadir variantes cortas (la marca sola) porque Tesseract corta palabras.
--
--   psql "$DATABASE_URL" -f apps/api/prisma/seed-productos.sql

INSERT INTO productos (id, nombre, marca, categoria, alias, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Arroz',              NULL,        'Alimentos', ARRAY['arroz','arroz blanco'],                      now(), now()),
  (gen_random_uuid(), 'Arroz Diana',        'Diana',     'Alimentos', ARRAY['arroz diana','diana'],                       now(), now()),
  (gen_random_uuid(), 'Arroz Roa',          'Roa',       'Alimentos', ARRAY['arroz roa','roa'],                           now(), now()),
  (gen_random_uuid(), 'Aceite de cocina',   NULL,        'Alimentos', ARRAY['aceite','aceite vegetal','aceite girasol'],  now(), now()),
  (gen_random_uuid(), 'Panela',             NULL,        'Alimentos', ARRAY['panela'],                                    now(), now()),
  (gen_random_uuid(), 'Lenteja',            NULL,        'Alimentos', ARRAY['lenteja','lentejas'],                        now(), now()),
  (gen_random_uuid(), 'Frijol',             NULL,        'Alimentos', ARRAY['frijol','frijoles','freijol'],               now(), now()),
  (gen_random_uuid(), 'Atún enlatado',      NULL,        'Alimentos', ARRAY['atun','atun lomitos'],                       now(), now()),
  (gen_random_uuid(), 'Sardina enlatada',   NULL,        'Alimentos', ARRAY['sardina','sardinas'],                        now(), now()),
  (gen_random_uuid(), 'Leche en polvo',     NULL,        'Alimentos', ARRAY['leche polvo','leche en polvo'],              now(), now()),
  (gen_random_uuid(), 'Agua embotellada',   NULL,        'Bebidas',   ARRAY['agua','agua potable','botella agua'],        now(), now()),
  (gen_random_uuid(), 'Agua Cristal',       'Cristal',   'Bebidas',   ARRAY['agua cristal','cristal'],                    now(), now()),
  (gen_random_uuid(), 'Crema dental',       NULL,        'Aseo',      ARRAY['crema dental','pasta dental','dentifrico'],  now(), now()),
  (gen_random_uuid(), 'Crema dental Colgate','Colgate',  'Aseo',      ARRAY['colgate','colgate triple accion'],           now(), now()),
  (gen_random_uuid(), 'Jabón de baño',      NULL,        'Aseo',      ARRAY['jabon','jabon bano','jabon tocador'],        now(), now()),
  (gen_random_uuid(), 'Jabón en polvo',     NULL,        'Aseo',      ARRAY['jabon polvo','detergente'],                  now(), now()),
  (gen_random_uuid(), 'Papel higiénico',    NULL,        'Aseo',      ARRAY['papel higienico','papel bano'],              now(), now()),
  (gen_random_uuid(), 'Toalla higiénica',   NULL,        'Aseo',      ARRAY['toalla higienica','toallas higienicas'],     now(), now()),
  (gen_random_uuid(), 'Pañales',            NULL,        'Aseo',      ARRAY['panal','panales','panales desechables'],     now(), now()),
  (gen_random_uuid(), 'Acetaminofén',       NULL,        'Salud',     ARRAY['acetaminofen','acetaminofen 500'],           now(), now())
ON CONFLICT DO NOTHING;
