import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import type { Me } from '../lib/api';

type OutletCtx = { me: Me; refresh: () => Promise<void> };

export default function WaitingRoom() {
  const { me, refresh } = useOutletContext<OutletCtx>();

  return (
    <section>
      <h1>Esperando invitación</h1>
      <p className="lede">
        Todavía no pertenecés a ninguna organización. Cuando te agreguen con{' '}
        <strong>{me.correo}</strong>, recargá esta pantalla y vas a entrar al
        panel.
      </p>
      <div className="inline-form">
        <button
          type="button"
          className="button"
          onClick={() => void refresh()}
        >
          Ya me invitaron, recargar
        </button>
        <Link to="/empezar/organizacion">Prefiero crear una organización</Link>
      </div>
    </section>
  );
}
