import { categoriaCompatible, disponibleUnidades, planificarPutaway } from './reglas-ubicacion';

describe('reglas-ubicacion', () => {
  it('alimentos no entran a una zona solo de medicamentos', () => {
    expect(
      categoriaCompatible('ALIMENTOS_NO_PERECEDEROS', {
        permiteAlimentos: false,
        permiteMedicamentos: true,
        permiteRopa: true,
      }),
    ).toBe(false);
  });

  it('ropa sí entra si la zona lo permite', () => {
    expect(
      categoriaCompatible('ROPA_CALZADO', {
        permiteAlimentos: false,
        permiteMedicamentos: false,
        permiteRopa: true,
      }),
    ).toBe(true);
  });

  it('sin capacidad el disponible es ilimitado', () => {
    expect(disponibleUnidades(null, 80)).toBeNull();
  });

  it('parte la cantidad si un rack no alcanza', () => {
    const plan = planificarPutaway(500, [
      { id: 'a', disponible: 300 },
      { id: 'b', disponible: 300 },
    ]);
    expect(plan.lineas).toEqual([
      { ubicacionId: 'a', cantidad: 300 },
      { ubicacionId: 'b', cantidad: 200 },
    ]);
    expect(plan.resto).toBe(0);
  });

  it('deja resto si no hay cupo', () => {
    const plan = planificarPutaway(500, [{ id: 'a', disponible: 120 }]);
    expect(plan.lineas).toEqual([{ ubicacionId: 'a', cantidad: 120 }]);
    expect(plan.resto).toBe(380);
  });
});
