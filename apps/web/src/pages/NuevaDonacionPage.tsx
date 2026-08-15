import { DonacionImagenEstado } from '@soschoco/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { useOrg } from '@/components/OrgGate';
import { subirFoto } from '@/features/donaciones/donaciones-service';
import { useReconocimiento } from '@/features/donaciones/useReconocimiento';
import { readStoredToken } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { useApi } from '@/lib/useApi';

type Fase = 'inicio' | 'subiendo' | 'reconociendo' | 'listo' | 'error';

export default function NuevaDonacionPage() {
  const navigate = useNavigate();
  const request = useApi();
  const { orgId, can } = useOrg();

  const [fase, setFase] = useState<Fase>('inicio');
  const [error, setError] = useState<string | null>(null);
  const [imagenId, setImagenId] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const entradaRef = useRef<HTMLInputElement>(null);

  const { imagen, enCurso, expirado } = useReconocimiento(request, orgId, imagenId);

  // La vista previa es un object URL; hay que soltarlo o se filtra memoria.
  useEffect(() => {
    return () => {
      if (vistaPrevia) {
        URL.revokeObjectURL(vistaPrevia);
      }
    };
  }, [vistaPrevia]);

  useEffect(() => {
    if (imagen && !enCurso) {
      setFase('listo');
    }
  }, [imagen, enCurso]);

  const onArchivo = useCallback(
    async (archivo: File | undefined) => {
      if (!archivo) {
        return;
      }
      setError(null);
      setVistaPrevia(URL.createObjectURL(archivo));
      setFase('subiendo');

      try {
        const creada = await subirFoto(request, orgId, archivo, {
          token: readStoredToken(),
        });
        setImagenId(creada.id);
        setFase('reconociendo');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo subir la foto');
        setFase('error');
      }
    },
    [request, orgId],
  );

  const reiniciar = () => {
    setFase('inicio');
    setImagenId(null);
    setError(null);
    setVistaPrevia(null);
    if (entradaRef.current) {
      entradaRef.current.value = '';
    }
  };

  if (!can('donaciones:write')) {
    return (
      <p className="py-8 text-sm text-muted-foreground">
        No tienes permiso para registrar donaciones.
      </p>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Registrar producto donado</h1>
        <p className="text-sm text-muted-foreground">
          Toma una foto del producto. El reconocimiento corre en segundo plano.
        </p>
      </div>

      {/* `capture="environment"` abre la cámara trasera en móvil; en escritorio
          degrada a un selector de archivos, que es lo deseable. */}
      <input
        ref={entradaRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        id="foto-producto"
        aria-label="Tomar foto del producto donado"
        onChange={(event) => void onArchivo(event.target.files?.[0])}
      />

      {vistaPrevia ? (
        <img
          src={vistaPrevia}
          alt="Foto tomada del producto"
          className="max-h-72 w-full rounded-lg object-contain"
        />
      ) : null}

      {fase === 'inicio' ? (
        <Button onClick={() => entradaRef.current?.click()}>Tomar foto</Button>
      ) : null}

      {fase === 'subiendo' ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Subiendo la foto…
        </p>
      ) : null}

      {fase === 'reconociendo' ? (
        <div className="space-y-2">
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Reconociendo el producto…
          </p>
          <p className="text-xs text-muted-foreground">
            Puedes salir de esta pantalla: el proceso sigue y el resultado queda en la lista.
          </p>
        </div>
      ) : null}

      {expirado ? (
        <p className="text-sm text-muted-foreground">
          Está tardando más de lo normal. El resultado va a aparecer en la lista de donaciones.
        </p>
      ) : null}

      {fase === 'listo' && imagen ? <Resultado imagen={imagen} /> : null}

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      {fase === 'listo' || fase === 'error' ? (
        <div className="flex flex-wrap gap-3">
          <Button onClick={reiniciar}>Registrar otro</Button>
          <Button variant="outline" onClick={() => navigate(ROUTES.donaciones)}>
            Ver donaciones
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Resultado({
  imagen,
}: {
  imagen: { estado: string; producto?: { nombre: string } | null };
}) {
  if (imagen.estado === DonacionImagenEstado.Fallida) {
    return (
      <div className="space-y-1">
        <Badge variant="error">No se pudo procesar</Badge>
        <p className="text-sm text-muted-foreground">
          La foto quedó guardada. Puedes reintentarla desde la lista de donaciones.
        </p>
      </div>
    );
  }

  if (!imagen.producto) {
    return (
      <div className="space-y-1">
        <Badge variant="warning">Sin identificar</Badge>
        <p className="text-sm text-muted-foreground">
          No se reconoció el producto con suficiente certeza. Queda pendiente de revisión para que
          alguien lo confirme a mano.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Badge variant="success">Reconocido</Badge>
      <p className="text-lg font-medium text-foreground">{imagen.producto.nombre}</p>
    </div>
  );
}
