import { Link } from 'react-router-dom';
import { useOrg } from '../components/OrgGate';

export default function Dashboard() {
  const { membership, me } = useOrg();
  const org = membership.organization;

  return (
    <section className="panel">
      <h1>{org.nombre}</h1>
      <p className="muted">
        Tipo {org.tipo} · tu rol es {membership.role.nombre}
      </p>
      <p>
        {me.nombre} ({me.correo}) puede cambiar de organización si tiene varias membresías.
      </p>
      <ul className="modules">
        <li>
          <h2>Usuarios</h2>
          <p>Sumar personas ya registradas y asignar roles.</p>
          <Link to="/app/usuarios">Abrir</Link>
        </li>
        <li>
          <h2>Roles</h2>
          <p>Matriz editable: roles, permisos y altas nuevas.</p>
          <Link to="/app/roles">Abrir</Link>
        </li>
        <li>
          <h2>Acopios</h2>
          <p>Bodegas para recibir o enviar donaciones.</p>
          <Link to="/app/acopios">Abrir</Link>
        </li>
        <li>
          <h2>Inventario</h2>
          <p>Existencias por centro de acopio: producto, lote y vencimiento.</p>
          <Link to="/app/inventario">Abrir</Link>
        </li>
      </ul>
    </section>
  );
}
