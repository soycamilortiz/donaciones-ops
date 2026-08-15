import { useNavigate } from 'react-router-dom';
import { Badge, type BadgeVariant } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { StatCard } from '@/components/molecules/StatCard';
import { DataTable, type DataTableColumn } from '@/components/organisms/DataTable';
import {
  type Donacion,
  getDonaciones,
  getDonacionesStats,
} from '@/features/donaciones/donaciones-service';
import { ROUTES } from '@/lib/constants';

const ESTADO: Record<Donacion['estado'], { label: string; variant: BadgeVariant }> = {
  recibida: { label: 'Recibida', variant: 'info' },
  en_transito: { label: 'En tránsito', variant: 'warning' },
  entregada: { label: 'Entregada', variant: 'success' },
};

const columns: DataTableColumn<Donacion>[] = [
  { key: 'donante', header: 'Donante' },
  { key: 'tipo', header: 'Tipo' },
  { key: 'cantidad', header: 'Cantidad', align: 'right' },
  { key: 'centro', header: 'Centro' },
  {
    key: 'estado',
    header: 'Estado',
    render: (row) => <Badge variant={ESTADO[row.estado].variant}>{ESTADO[row.estado].label}</Badge>,
  },
  { key: 'fecha', header: 'Fecha', align: 'right' },
];

export default function DonacionesPage() {
  const navigate = useNavigate();
  const stats = getDonacionesStats();
  const donaciones = getDonaciones();

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Donaciones</h1>
          <p className="text-sm text-muted-foreground">
            Registro y seguimiento de donaciones hacia los centros de acopio.
          </p>
        </div>
        <Button onClick={() => navigate(ROUTES.nuevaDonacion)}>Nueva donación</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total donaciones"
          value={stats.total}
          icon="heart"
          trend={{ value: '+8% semana', direction: 'up' }}
        />
        <StatCard
          label="Recibidas"
          value={stats.recibidas}
          icon="check"
          trend={{ value: '+5% semana', direction: 'up' }}
        />
        <StatCard label="En tránsito" value={stats.enTransito} icon="info" />
        <StatCard label="Centros activos" value={stats.centros} icon="home" />
      </div>

      <DataTable columns={columns} data={donaciones} caption="Donaciones recientes" />
    </div>
  );
}
