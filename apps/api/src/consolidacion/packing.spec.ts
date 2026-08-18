import {
  componerKits,
  elegirMuestra,
  evaluarMuestreo,
  proponerPallets,
  tamanioMuestra,
} from './packing';

describe('packing', () => {
  it('reparte lotes FEFO entre kits según el BOM', () => {
    const kits = componerKits(
      3,
      [{ productoId: 'arroz', porKit: 2 }],
      [
        {
          productoId: 'arroz',
          inventoryItemId: 'l1',
          origenUbicacionId: 'u1',
          loteCodigo: 'A',
          vencimiento: '2027-01-01',
          cantidad: 4,
        },
        {
          productoId: 'arroz',
          inventoryItemId: 'l2',
          origenUbicacionId: 'u2',
          loteCodigo: 'B',
          vencimiento: '2027-06-01',
          cantidad: 2,
        },
      ],
    );
    expect(kits).toHaveLength(3);
    expect(kits[0]?.map((row) => row.loteCodigo)).toEqual(['A']);
    expect(kits[2]?.map((row) => row.loteCodigo)).toEqual(['B']);
  });

  it('el muestreo del 10% de 800 es 80', () => {
    expect(tamanioMuestra(800, 0.1)).toBe(80);
    expect(tamanioMuestra(5, 0.1)).toBe(1);
  });

  it('elige una muestra determinista', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    expect(elegirMuestra(ids, 2, 7)).toEqual(elegirMuestra(ids, 2, 7));
    expect(elegirMuestra(ids, 2, 7)).toHaveLength(2);
  });

  it('si el defecto supera 5% en muestreo, pide control total', () => {
    const resultados = Array.from({ length: 80 }, (_, i) => (i < 5 ? 'RECHAZADO' : 'APROBADO'));
    const ev = evaluarMuestreo(resultados, 0.05, 'MUESTREO');
    expect(ev.defectuosos).toBe(5);
    expect(ev.requiereTotal).toBe(true);
  });

  it('no pide control total hasta terminar la muestra', () => {
    const ev = evaluarMuestreo(['RECHAZADO', 'PENDIENTE'], 0.05, 'MUESTREO');
    expect(ev.requiereTotal).toBe(false);
  });

  it('780 kits de 20 kg con tope 800 kg y alto 1.80 / 0.06 → 30 por pallet, 26 pallets', () => {
    const plan = proponerPallets({
      nKits: 780,
      kitPesoKg: 20,
      palletPesoMaxKg: 800,
      kitAltoM: 0.06,
      palletAltoMaxM: 1.8,
    });
    expect(plan.limitePorPeso).toBe(40);
    expect(plan.limitePorAlto).toBe(30);
    expect(plan.kitsPorPallet).toBe(30);
    expect(plan.pallets).toBe(26);
  });
});
