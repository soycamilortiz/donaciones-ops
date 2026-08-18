import {
  normalizarNombreProducto,
  similitudNombres,
  UMBRAL_MISMO_PRODUCTO,
} from './nombre-producto';

describe('nombre-producto', () => {
  it('iguala Agua Brisa con botella de agua brisa', () => {
    expect(similitudNombres('Agua Brisa 600ml', 'Botella de agua Brisa')).toBeGreaterThan(
      UMBRAL_MISMO_PRODUCTO,
    );
    expect(normalizarNombreProducto('Agua Brisa 600 ml')).toBe(
      normalizarNombreProducto('botella de agua brisa'),
    );
  });

  it('ignora la medida pegada al número', () => {
    expect(normalizarNombreProducto('Arroz Diana 500g')).toBe(
      normalizarNombreProducto('arroz diana 500 g'),
    );
    expect(similitudNombres('Aceite Girasol 1L', 'aceite de girasol')).toBeGreaterThan(
      UMBRAL_MISMO_PRODUCTO,
    );
  });

  it('no fusiona arroz con agua', () => {
    expect(similitudNombres('Arroz Diana 500g', 'Agua Brisa')).toBeLessThan(0.5);
  });
});
