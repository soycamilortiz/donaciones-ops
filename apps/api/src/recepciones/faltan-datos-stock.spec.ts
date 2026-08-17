import { faltaVencimientoObligatorio } from './faltan-datos-stock';

describe('faltanDatosParaStock', () => {
  it('alimentos sin vencimiento no pasan a disponible', () => {
    expect(faltaVencimientoObligatorio({ requiereVencimiento: true }, { vencimiento: null })).toBe(
      true,
    );
  });

  it('con vencimiento sí se puede postear', () => {
    expect(
      faltaVencimientoObligatorio(
        { requiereVencimiento: true },
        { vencimiento: new Date('2027-05-01') },
      ),
    ).toBe(false);
  });

  it('el lote del donante no bloquea: el sistema ya tiene LOT-…', () => {
    expect(
      faltaVencimientoObligatorio(
        { requiereVencimiento: true },
        { vencimiento: new Date('2027-05-01') },
      ),
    ).toBe(false);
  });

  it('ropa u otro sin regla de vencimiento entra igual', () => {
    expect(faltaVencimientoObligatorio({ requiereVencimiento: false }, null)).toBe(false);
  });
});
