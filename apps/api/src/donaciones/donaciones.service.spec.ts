import { Test, type TestingModule } from '@nestjs/testing';
import { DonacionImagenEstado } from '@soschoco/shared';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../storage/r2.service';
import { ColaService } from './cola.service';
import { DonacionesService } from './donaciones.service';

const ORG = '11111111-1111-4111-8111-111111111111';
const OTRA_ORG = '22222222-2222-4222-8222-222222222222';
const USUARIO = '33333333-3333-4333-8333-333333333333';

describe('DonacionesService', () => {
  let service: DonacionesService;
  let prisma: {
    donacionImagen: Record<string, jest.Mock>;
    producto: Record<string, jest.Mock>;
    acopio: Record<string, jest.Mock>;
  };
  let cola: { encolarReconocimiento: jest.Mock };
  let r2: {
    isConfigured: jest.Mock;
    missingConfig: jest.Mock;
    hasPublicBase: jest.Mock;
    presignPut: jest.Mock;
    publicUrlFor: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      donacionImagen: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'img-1', ...data })),
        update: jest.fn().mockImplementation(({ data }) => ({ id: 'img-1', ...data })),
      },
      producto: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      acopio: { findFirst: jest.fn().mockResolvedValue({ id: 'acopio-1' }) },
    };
    cola = { encolarReconocimiento: jest.fn().mockResolvedValue(undefined) };
    r2 = {
      isConfigured: jest.fn().mockReturnValue(true),
      missingConfig: jest.fn().mockReturnValue([]),
      hasPublicBase: jest.fn().mockReturnValue(true),
      presignPut: jest.fn().mockResolvedValue('https://r2.example/signed'),
      publicUrlFor: jest
        .fn()
        .mockImplementation((key: string) => `https://pub.example/${key}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonacionesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ColaService, useValue: cola },
        { provide: R2StorageService, useValue: r2 },
      ],
    }).compile();

    service = module.get(DonacionesService);
  });

  describe('rutaParaSubida', () => {
    it('encierra la ruta dentro del prefijo de la organización', () => {
      const ruta = service.rutaParaSubida(ORG, 'foto.jpg');
      expect(ruta.startsWith(`donaciones/${ORG}/`)).toBe(true);
    });

    it('conserva la extensión del archivo', () => {
      expect(service.rutaParaSubida(ORG, 'colgate.png')).toMatch(/\.png$/);
    });

    it('descarta extensiones que no lo parecen, para no heredar basura del cliente', () => {
      expect(service.rutaParaSubida(ORG, 'raro.eyJhbGciOiJIUzI1')).not.toContain('.eyJ');
      expect(service.rutaParaSubida(ORG, 'sin-extension')).toMatch(/[0-9a-f-]{36}$/);
    });

    it('no reutiliza la misma ruta entre fotos', () => {
      expect(service.rutaParaSubida(ORG, 'a.jpg')).not.toEqual(
        service.rutaParaSubida(ORG, 'a.jpg'),
      );
    });
  });

  describe('reservarSubida', () => {
    it('responde 503 si faltan las keys de R2', async () => {
      r2.isConfigured.mockReturnValue(false);
      r2.missingConfig.mockReturnValue(['R2_ACCESS_KEY_ID']);

      await expect(service.reservarSubida(ORG, 'foto.jpg', 'image/jpeg')).rejects.toThrow(
        /R2_ACCESS_KEY_ID/,
      );
    });

    it('responde 503 si falta la URL pública', async () => {
      r2.hasPublicBase.mockReturnValue(false);

      await expect(service.reservarSubida(ORG, 'foto.jpg', 'image/jpeg')).rejects.toThrow(
        /R2_PUBLIC_BASE_URL/,
      );
    });

    it('firma un PUT y devuelve la URL pública', async () => {
      const ruta = await service.reservarSubida(ORG, 'foto.jpg', 'image/jpeg');

      expect(ruta.uploadUrl).toBe('https://r2.example/signed');
      expect(ruta.pathname.startsWith(`donaciones/${ORG}/`)).toBe(true);
      expect(ruta.publicUrl).toBe(`https://pub.example/${ruta.pathname}`);
      expect(ruta.headers).toEqual({ 'Content-Type': 'image/jpeg' });
      expect(r2.presignPut).toHaveBeenCalledWith(ruta.pathname, 'image/jpeg');
    });
  });

  describe('registrarImagen', () => {
    const dto = {
      pathname: `donaciones/${ORG}/abc.jpg`,
      blobUrl: 'https://blob.example/abc.jpg',
    };

    it('crea la fila en PENDIENTE y encola el reconocimiento', async () => {
      const imagen = await service.registrarImagen(ORG, USUARIO, dto);

      expect(prisma.donacionImagen.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: ORG,
            subidaPorId: USUARIO,
            blobUrl: `https://pub.example/${dto.pathname}`,
            estado: DonacionImagenEstado.Pendiente,
          }),
        }),
      );
      expect(cola.encolarReconocimiento).toHaveBeenCalledWith(imagen.id);
    });

    it('rechaza una ruta de otra organización', async () => {
      const ajena = { ...dto, pathname: `donaciones/${OTRA_ORG}/abc.jpg` };

      await expect(service.registrarImagen(ORG, USUARIO, ajena)).rejects.toThrow(
        /no corresponde a esta organización/,
      );
      expect(cola.encolarReconocimiento).not.toHaveBeenCalled();
    });

    it('rechaza rutas con salto de directorio', async () => {
      const conSalto = { ...dto, pathname: `donaciones/${ORG}/../${OTRA_ORG}/abc.jpg` };

      await expect(service.registrarImagen(ORG, USUARIO, conSalto)).rejects.toThrow(
        /no corresponde a esta organización/,
      );
    });

    it('no registra la misma foto dos veces', async () => {
      prisma.donacionImagen.findUnique.mockResolvedValue({ id: 'ya-existe' });

      await expect(service.registrarImagen(ORG, USUARIO, dto)).rejects.toThrow(
        /ya está registrada/,
      );
      expect(cola.encolarReconocimiento).not.toHaveBeenCalled();
    });

    it('rechaza un acopio que no es de la organización', async () => {
      prisma.acopio.findFirst.mockResolvedValue(null);

      await expect(
        service.registrarImagen(ORG, USUARIO, { ...dto, acopioId: 'acopio-ajeno' }),
      ).rejects.toThrow(/Acopio no encontrado/);
    });
  });

  describe('corregirProducto', () => {
    beforeEach(() => {
      prisma.donacionImagen.findFirst.mockResolvedValue({ id: 'img-1', organizationId: ORG });
    });

    it('asigna el producto y deja la imagen como procesada', async () => {
      prisma.producto.findUnique.mockResolvedValue({ id: 'prod-1' });

      await service.corregirProducto(ORG, 'img-1', 'prod-1');

      expect(prisma.donacionImagen.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productoId: 'prod-1',
            estado: DonacionImagenEstado.Procesada,
            error: null,
          }),
        }),
      );
    });

    it('no acepta un producto inexistente', async () => {
      prisma.producto.findUnique.mockResolvedValue(null);

      await expect(service.corregirProducto(ORG, 'img-1', 'fantasma')).rejects.toThrow(
        /Producto no encontrado/,
      );
    });

    it('no deja tocar una imagen de otra organización', async () => {
      prisma.donacionImagen.findFirst.mockResolvedValue(null);

      await expect(service.corregirProducto(ORG, 'ajena', 'prod-1')).rejects.toThrow(
        /Imagen no encontrada/,
      );
    });
  });

  describe('reprocesar', () => {
    it('devuelve la imagen a PENDIENTE, limpia el error y vuelve a encolar', async () => {
      prisma.donacionImagen.findFirst.mockResolvedValue({ id: 'img-1', organizationId: ORG });

      await service.reprocesar(ORG, 'img-1');

      expect(prisma.donacionImagen.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { estado: DonacionImagenEstado.Pendiente, error: null },
        }),
      );
      expect(cola.encolarReconocimiento).toHaveBeenCalledWith('img-1');
    });
  });

  describe('listar (paginado por cursor)', () => {
    it('pide una fila de mas para saber si hay pagina siguiente', async () => {
      await service.listar(ORG, { limite: 10 });

      expect(prisma.donacionImagen.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 11 }),
      );
    });

    it('devuelve cursor cuando hay mas paginas y lo omite cuando no', async () => {
      const filas = Array.from({ length: 3 }, (_, i) => ({ id: `img-${i}` }));
      prisma.donacionImagen.findMany.mockResolvedValue(filas);

      const conMas = await service.listar(ORG, { limite: 2 });
      expect(conMas.items).toHaveLength(2);
      expect(conMas.siguienteCursor).toBe('img-1');

      const sinMas = await service.listar(ORG, { limite: 5 });
      expect(sinMas.items).toHaveLength(3);
      expect(sinMas.siguienteCursor).toBeNull();
    });

    it('acota el limite para que nadie pida la tabla entera', async () => {
      await service.listar(ORG, { limite: 100000 });
      expect(prisma.donacionImagen.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 201 }),
      );
    });

    it('cae al default con un limite inservible en vez de romper la consulta', async () => {
      // '?limite=abc' llega como NaN tras el parseInt del controlador.
      for (const limite of [Number.NaN, 0, -5]) {
        await service.listar(ORG, { limite });
        expect(prisma.donacionImagen.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ take: 51 }),
        );
      }
    });

    it('salta la fila del cursor para no repetirla entre paginas', async () => {
      await service.listar(ORG, { cursor: 'img-9' });

      expect(prisma.donacionImagen.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'img-9' }, skip: 1 }),
      );
    });
  });

  describe('listar', () => {
    it('acota siempre por organización', async () => {
      await service.listar(ORG);

      expect(prisma.donacionImagen.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organizationId: ORG }) }),
      );
    });

    it('filtra por estado cuando se pide', async () => {
      await service.listar(ORG, { estado: DonacionImagenEstado.Fallida });

      expect(prisma.donacionImagen.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ estado: DonacionImagenEstado.Fallida }),
        }),
      );
    });
  });
});
