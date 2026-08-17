import { asignarCantidad, maxKits, ordenarFefo, repartirKitsEscasos } from './asignacion';

describe('asignacion', () => {
  it('FEFO pone primero el lote que vence antes y deja los sin fecha al final', () => {
    const orden = ordenarFefo([
      {
        inventoryItemId: 'c',
        ubicacionId: 'u3',
        codigoUbicacion: 'C-01',
        loteCodigo: 'C',
        vencimiento: null,
        disponible: 800,
      },
      {
        inventoryItemId: 'b',
        ubicacionId: 'u2',
        codigoUbicacion: 'B-01',
        loteCodigo: 'B',
        vencimiento: '2027-05-01',
        disponible: 500,
      },
      {
        inventoryItemId: 'a',
        ubicacionId: 'u1',
        codigoUbicacion: 'A-01',
        loteCodigo: 'A',
        vencimiento: '2027-01-01',
        disponible: 300,
      },
    ]);
    expect(orden.map((row) => row.loteCodigo)).toEqual(['A', 'B', 'C']);
  });

  it('parte 1000 unidades FEFO: 300 + 500 + 200', () => {
    const plan = asignarCantidad(1000, [
      {
        inventoryItemId: 'a',
        ubicacionId: 'u1',
        codigoUbicacion: 'A-01-01',
        loteCodigo: 'A',
        vencimiento: '2027-01-01',
        disponible: 300,
      },
      {
        inventoryItemId: 'b',
        ubicacionId: 'u2',
        codigoUbicacion: 'A-01-02',
        loteCodigo: 'B',
        vencimiento: '2027-05-01',
        disponible: 500,
      },
      {
        inventoryItemId: 'c',
        ubicacionId: 'u3',
        codigoUbicacion: 'B-03-01',
        loteCodigo: 'C',
        vencimiento: '2027-11-01',
        disponible: 800,
      },
    ]);
    expect(plan.cubierto).toBe(1000);
    expect(plan.deficit).toBe(0);
    expect(plan.lineas.map((l) => l.cantidad)).toEqual([300, 500, 200]);
  });

  it('el cuello de botella del BOM limita los kits', () => {
    const tope = maxKits(
      [
        { productoId: 'arroz', porKit: 2 },
        { productoId: 'lenteja', porKit: 1 },
        { productoId: 'aceite', porKit: 1 },
        { productoId: 'pasta', porKit: 0.5 },
      ],
      new Map([
        ['arroz', 2000],
        ['lenteja', 600],
        ['aceite', 800],
        ['pasta', 100],
      ]),
    );
    expect(tope).toBe(200);
  });

  it('reparte stock escaso por prioridad y no por orden de llegada', () => {
    const plan = repartirKitsEscasos(
      [
        {
          id: 'media',
          prioridad: 'MEDIA',
          fechaRequerida: '2026-08-10',
          createdAt: '2026-08-01T00:00:00.000Z',
          kitsSolicitados: 400,
        },
        {
          id: 'critica',
          prioridad: 'CRITICA',
          fechaRequerida: '2026-08-20',
          createdAt: '2026-08-02T00:00:00.000Z',
          kitsSolicitados: 300,
        },
        {
          id: 'alta',
          prioridad: 'ALTA',
          fechaRequerida: '2026-08-12',
          createdAt: '2026-08-01T12:00:00.000Z',
          kitsSolicitados: 150,
        },
      ],
      500,
    );
    expect(plan).toEqual([
      { demandaId: 'critica', kits: 300, deficit: 0 },
      { demandaId: 'alta', kits: 150, deficit: 0 },
      { demandaId: 'media', kits: 50, deficit: 350 },
    ]);
  });
});
