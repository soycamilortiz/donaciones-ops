import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { ROUTES } from '@/lib/constants';

const donacionSchema = z.object({
  donante: z.string().min(2, 'Ingresa el nombre del donante.'),
  tipo: z.string().min(2, 'Indica el tipo de donación.'),
  cantidad: z.string().min(1, 'Indica la cantidad.'),
  centro: z.string().min(2, 'Selecciona el centro de acopio.'),
});

export default function NuevaDonacionPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const result = donacionSchema.safeParse({
      donante: data.get('donante'),
      tipo: data.get('tipo'),
      cantidad: data.get('cantidad'),
      centro: data.get('centro'),
    });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    // TODO: POST a /api/v1/donaciones cuando exista el módulo en el API.
    navigate(ROUTES.donaciones);
  }

  return (
    <div className="max-w-lg space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Nueva donación</h1>
        <p className="text-sm text-muted-foreground">
          Registra una donación entrante hacia un centro de acopio.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
        noValidate
      >
        <FormField label="Donante" htmlFor="donante" error={errors.donante}>
          <Input
            id="donante"
            name="donante"
            placeholder="Nombre del donante"
            invalid={Boolean(errors.donante)}
          />
        </FormField>
        <FormField label="Tipo" htmlFor="tipo" error={errors.tipo}>
          <Input
            id="tipo"
            name="tipo"
            placeholder="Alimentos, Agua, Ropa…"
            invalid={Boolean(errors.tipo)}
          />
        </FormField>
        <FormField label="Cantidad" htmlFor="cantidad" error={errors.cantidad}>
          <Input
            id="cantidad"
            name="cantidad"
            placeholder="120 kits"
            invalid={Boolean(errors.cantidad)}
          />
        </FormField>
        <FormField label="Centro de acopio" htmlFor="centro" error={errors.centro}>
          <Input
            id="centro"
            name="centro"
            placeholder="Acopio Quibdó"
            invalid={Boolean(errors.centro)}
          />
        </FormField>
        <div className="flex items-center gap-3">
          <Button type="submit">Registrar donación</Button>
          <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.donaciones)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
