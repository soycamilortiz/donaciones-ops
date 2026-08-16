import {
  similitudNombres,
  UMBRAL_MISMO_PRODUCTO,
  normalizarNombreProducto,
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

  it('no fusiona arroz con agua', () => {
    expect(similitudNombres('Arroz Diana 500g', 'Agua Brisa')).toBeLessThan(0.5);
  });
});
