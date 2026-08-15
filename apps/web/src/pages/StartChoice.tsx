import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import type { Me } from '../lib/api';

type OutletCtx = { me: Me; refresh: () => Promise<void> };

export default function StartChoice() {
  const { me } = useOutletContext<OutletCtx>();

  return (
    <section>
      <p className="eyebrow">Hola, {me.nombre}</p>
      <h1>¿Cómo querés seguir?</h1>
      <p className="lede">
        La cuenta ya está creada. No es obligatorio tener organización ahora:
        podés armar la tuya o esperar a que te sumen a una existente.
      </p>
      <ul className="choice-grid">
        <li>
          <h2>Crear organización</h2>
          <p>
            Si coordinás un centro, una olla o una institución. El acopio (recibir
            o enviar donaciones) se carga después, en su propia sección.
          </p>
          <Link className="button" to="/empezar/organizacion">
            Crear organización
          </Link>
        </li>
        <li>
          <h2>Esperar invitación</h2>
          <p>
            Alguien de la organización te agrega con el correo{' '}
            <strong>{me.correo}</strong>. Hasta entonces podés entrar y
            consultar si ya te sumaron.
          </p>
          <Link className="button" to="/pendiente">
            Esperar invitación
          </Link>
        </li>
      </ul>
    </section>
  );
}
