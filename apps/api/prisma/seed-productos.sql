-- Catálogo inicial de productos donados.
--
-- Sin filas aquí el reconocimiento no puede acertar nunca: emparejar() contra
-- una tabla vacía siempre devuelve null y toda foto queda para revisión manual.
--
-- Los `alias` son los términos que el OCR suele sacar del envase. Conviene
-- añadir variantes cortas (la marca sola) porque Tesseract corta palabras.
--
-- Un alias debe DISTINGUIR, no describir. Poner 'botella agua' en el producto
-- genérico hacía que "AGUA CRISTAL BOTELLA" empatara con "Agua Cristal" y la
-- foto terminara en revisión manual: las dos coincidencias eran igual de
-- buenas. Evita palabras de envase (botella, bolsa, caja, paquete) que
-- aparecen en muchos productos.
--
--   psql "$DATABASE_URL" -f apps/api/prisma/seed-productos.sql

INSERT INTO productos (
  id, nombre, marca, categoria, sku, categoria_inventario,
  requiere_lote, requiere_vencimiento, alias, created_at, updated_at
) VALUES
  (gen_random_uuid(), 'Arroz',              NULL,        'Alimentos', 'ALI-0001', 'ALIMENTOS_NO_PERECEDEROS', true,  true,  ARRAY['arroz','arroz blanco'],                      now(), now()),
  (gen_random_uuid(), 'Arroz Diana',        'Diana',     'Alimentos', 'ALI-0002', 'ALIMENTOS_NO_PERECEDEROS', true,  true,  ARRAY['arroz diana','diana'],                       now(), now()),
  (gen_random_uuid(), 'Arroz Roa',          'Roa',       'Alimentos', 'ALI-0003', 'ALIMENTOS_NO_PERECEDEROS', true,  true,  ARRAY['arroz roa','roa'],                           now(), now()),
  (gen_random_uuid(), 'Aceite de cocina',   NULL,        'Alimentos', 'ALI-0004', 'ALIMENTOS_NO_PERECEDEROS', true,  true,  ARRAY['aceite','aceite vegetal','aceite girasol'],  now(), now()),
  (gen_random_uuid(), 'Panela',             NULL,        'Alimentos', 'ALI-0005', 'ALIMENTOS_NO_PERECEDEROS', true,  true,  ARRAY['panela'],                                    now(), now()),
  (gen_random_uuid(), 'Lenteja',            NULL,        'Alimentos', 'ALI-0006', 'ALIMENTOS_NO_PERECEDEROS', true,  true,  ARRAY['lenteja','lentejas'],                        now(), now()),
  (gen_random_uuid(), 'Frijol',             NULL,        'Alimentos', 'ALI-0007', 'ALIMENTOS_NO_PERECEDEROS', true,  true,  ARRAY['frijol','frijoles','freijol'],               now(), now()),
  (gen_random_uuid(), 'Atún enlatado',      NULL,        'Alimentos', 'ALI-0008', 'ALIMENTOS_NO_PERECEDEROS', true,  true,  ARRAY['atun','atun lomitos'],                       now(), now()),
  (gen_random_uuid(), 'Sardina enlatada',   NULL,        'Alimentos', 'ALI-0009', 'ALIMENTOS_NO_PERECEDEROS', true,  true,  ARRAY['sardina','sardinas'],                        now(), now()),
  (gen_random_uuid(), 'Leche en polvo',     NULL,        'Alimentos', 'ALI-0010', 'ALIMENTOS_NO_PERECEDEROS', true,  true,  ARRAY['leche polvo','leche en polvo'],              now(), now()),
  (gen_random_uuid(), 'Agua embotellada',   NULL,        'Bebidas',   'AGU-0001', 'AGUA',                     true,  true,  ARRAY['agua','agua potable'],                       now(), now()),
  (gen_random_uuid(), 'Agua Cristal',       'Cristal',   'Bebidas',   'AGU-0002', 'AGUA',                     true,  true,  ARRAY['agua cristal','cristal'],                    now(), now()),
  (gen_random_uuid(), 'Crema dental',       NULL,        'Aseo',      'ASE-0001', 'ASEO_HIGIENE',             false, false, ARRAY['crema dental','pasta dental','dentifrico'],  now(), now()),
  (gen_random_uuid(), 'Crema dental Colgate','Colgate',  'Aseo',      'ASE-0002', 'ASEO_HIGIENE',             false, false, ARRAY['colgate','colgate triple accion'],           now(), now()),
  (gen_random_uuid(), 'Jabón de baño',      NULL,        'Aseo',      'ASE-0003', 'ASEO_HIGIENE',             false, false, ARRAY['jabon','jabon bano','jabon tocador'],        now(), now()),
  (gen_random_uuid(), 'Jabón en polvo',     NULL,        'Aseo',      'ASE-0004', 'ASEO_HIGIENE',             false, false, ARRAY['jabon polvo','detergente'],                  now(), now()),
  (gen_random_uuid(), 'Papel higiénico',    NULL,        'Aseo',      'ASE-0005', 'ASEO_HIGIENE',             false, false, ARRAY['papel higienico','papel bano'],              now(), now()),
  (gen_random_uuid(), 'Toalla higiénica',   NULL,        'Aseo',      'ASE-0006', 'ASEO_HIGIENE',             false, false, ARRAY['toalla higienica','toallas higienicas'],     now(), now()),
  (gen_random_uuid(), 'Pañales',            NULL,        'Aseo',      'PAN-0001', 'PANALES_BEBE',             false, false, ARRAY['panal','panales','panales desechables'],     now(), now()),
  (gen_random_uuid(), 'Acetaminofén',       NULL,        'Salud',     'MED-0001', 'MEDICAMENTOS',             true,  true,  ARRAY['acetaminofen','acetaminofen 500'],           now(), now())
ON CONFLICT (sku) DO NOTHING;

INSERT INTO org_counters (id, organization_id, kind, periodo, siguiente, updated_at)
SELECT gen_random_uuid(), NULL, 'SKU:' || t.prefix, '', MAX(t.n), NOW()
FROM (
  SELECT split_part(sku, '-', 1) AS prefix, CAST(split_part(sku, '-', 2) AS INTEGER) AS n
  FROM productos
  WHERE sku ~ '^[A-Z]{3}-[0-9]{4}$'
) t
GROUP BY t.prefix
ON CONFLICT (kind, periodo) WHERE organization_id IS NULL
DO UPDATE SET siguiente = GREATEST(org_counters.siguiente, EXCLUDED.siguiente), updated_at = NOW();

