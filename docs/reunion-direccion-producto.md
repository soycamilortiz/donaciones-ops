# SOS Chocó — resumen para la reunión

Documento de trabajo para alinear **dónde estamos**, **de dónde salió esto** y **para dónde podemos ir**. No es un plan técnico cerrado: es el marco para la conversación.

---

## 1. De dónde salió

La idea nació en broma: «¿por qué no hacemos esto?». Camilo respondió que algo así ya existía. Al día siguiente había una organización de carácter social que **sí lo necesitaba**.

De ahí pasó a un piloto concreto, pensado para las necesidades del **Chocó**: operación en campo, acopios, ayudas que entran y salen, y trazabilidad hasta la entrega.

Hoy ya no es solo una idea: hay software corriendo, con un flujo operativo de punta a punta. La pregunta de esta reunión no es «¿se puede?», sino **¿para dónde vamos?**

---

## 2. Estado actual del proyecto

Tenemos una **base WMS** (gestión de bodega / centro de acopio) y una **aplicación operativa** que cubre el núcleo logístico humanitario:

| Etapa | Qué hace hoy |
| --- | --- |
| Organización | Registro, roles, permisos, membresías |
| Acopios | Configurar centros (recibir / enviar), ubicaciones |
| Ayudas | Recepciones, identificación (foto / EAN), validación a inventario |
| Bodega | Inventario, putaway, movimientos, kits, demandas, reservas |
| Salida | Picking, control, consolidación, palletización, despacho |
| Camino | Transporte (TMS): viajes, rutas multiparada, seguimiento |
| Destino | Entrega con prueba de entrega (POD) |

En corto: **desde crear la organización hasta entregar la ayuda**, el piloto ya responde al ciclo central. Quedan mejoras de UX, flota, devoluciones, dashboard y endurecimiento para producción — pero la columna vertebral está.

Piloto de referencia: instalaciones tipo **juntosxchoco** (personalización sobre el mismo producto).

---

## 3. Principio de dirección (propuesta)

La intención es **lanzar el software de forma libre y accesible**, sin que «libre» signifique abandonar identidad, autoría ni capacidad de operar.

En este punto lo trascendente no es solo publicar código: es **sostener varios frentes a la vez**, para que el bien común y la operación propia no se peleen.

Queda pendiente definir con claridad la capa jurídica (derechos de autor, licencia, marca, quién mantiene el núcleo). Eso no bloquea la conversación de producto, pero sí hay que cerrarlo antes de un anuncio público grande.

---

## 4. Tres frentes de distribución

### 4.1 Fuente propia (plataforma SOS)

Un frontend / entrada nuestra donde organizaciones puedan **entrar a su espacio** en la infraestructura que operamos nosotros.

- Onboarding de orgs
- Misma lógica de dominio
- Nosotros hospedamos y evolucionamos el núcleo

### 4.2 Instalaciones personalizadas

Despliegues a medida, con marca e identidad del territorio o de la campaña — el ejemplo vivo es **juntosxchoco**.

- Mismo producto, skin / dominio / configuración local
- Relación cercana con el operador del territorio
- Ideal para pilotos y alianzas fuertes

### 4.3 Código libre

Publicar el repositorio (o el núcleo) como software libre / abierto, para que otras orgs, universidades o gobiernos puedan auditar, adaptar e instalar.

- Transparencia y confianza
- Comunidad y contribuciones
- Requiere licencia + guía de despliegue + gobernanza mínima del repo

Los tres frentes no son excluyentes: **mismo producto, distintos modos de llegar**.

---

## 5. Frentes de funcionalidad (hacia dónde crecer)

Además de cómo se distribuye, hay que decidir **qué capas de producto priorizamos**:

### 5.1 Articulación entre organizaciones

Hoy el sistema es fuerte **dentro** de una organización. El siguiente salto es **entre** organizaciones: alinear esfuerzos, visibilizar capacidad (qué hay, dónde, qué falta) y coordinar ayuda humanitaria sin que cada uno opere en silo.

Preguntas abiertas:

- ¿Compartir catálogo / demandas / inventarios entre orgs?
- ¿Marketplace de excedentes vs. escasez?
- ¿Quién ve qué (privacidad vs. coordinación)?

### 5.2 Aplicación de transportador

Hoy el transportador entra al panel general con permisos acotados. La visión es una **experiencia dedicada** (móvil, simple, una mano): viajes, paradas, escaneo, POD — sin el ruido del WMS completo.

### 5.3 Superadmin / gobernanza de plataforma

Capa por encima de las organizaciones: monitorear instancias, habilitar orgs, salud del sistema, soporte, y (si hay plataforma propia) administración multi-tenant.

No es lo mismo que «administrador de acopio» dentro de una org: es **quién opera el producto como servicio**.

---

## 6. Mapa mental para la reunión

```
                    ┌─────────────────────────┐
                    │   Producto SOS Chocó    │
                    │  (WMS + logística human │
                    │   recepción → entrega)  │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
  Plataforma propia      Instalaciones           Código libre
  (nuestras orgs)        (ej. juntosxchoco)      (comunidad)
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
 Articulación orgs      App transportador         Superadmin
 (red de ayuda)         (campo / ruta)            (plataforma)
```

---

## 7. Preguntas para cerrar en la reunión

1. **¿Confirmamos el principio?** Software libre y accesible + varios frentes de operación.
2. **¿Licencia y marca?** Qué protegemos (marca, nombre, logo) y qué liberamos (código).
3. **¿Qué frente priorizamos primero?** Plataforma propia, más instalaciones tipo juntosxchoco, o publicación del repo.
4. **¿Qué producto construimos después del piloto Chocó?** Articulación entre orgs, app transportador, o superadmin.
5. **¿Quién opera qué?** Equipo núcleo, aliados territoriales, comunidad open source.

---

## 8. Mensaje corto (elevator)

> Ya tenemos un piloto real: organizaciones, acopios, registro de ayudas, despacho y entrega, pensado para el Chocó. La apuesta es liberar el software y hacerlo accesible, operando a la vez nuestra plataforma, instalaciones personalizadas y el código abierto — y crecer hacia la articulación entre organizaciones, una app de transportador y una capa de superadmin.

---

*Borrador para reunión · agosto 2026*
