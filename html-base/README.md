# SOS Chocó — front estático

14 vistas HTML + una hoja CSS + JS de módulos. Navegación completa, sin build,
sin dependencias. Se abre con doble clic o desde cualquier servidor estático.

```bash
python3 -m http.server 4180 --directory app
```

Mapeado 1:1 contra `donacionesops` (rama `feat/web-design-system`): rutas,
enums, permisos y mensajes salen del código, no están inventados.

## Rutas

| Vista | Ruta real | Qué hace |
| --- | --- | --- |
| `index.html` | `/` | Landing. Health-check simulado, módulos, PWA toast |
| `sign-in.html` | `/sign-in` | Captcha SVG generado, valida y navega a `/app` |
| `sign-up.html` | `/sign-up` | Reglas de usuario reales, 409 de correo ya registrado |
| `empezar.html` | `/empezar` | Bifurcación crear organización / esperar invitación |
| `empezar-organizacion.html` | `/empezar/organizacion` | 5 `OrganizationTipo`, campo condicional en `OTRO` |
| `pendiente.html` | `/pendiente` | Sala de espera, recarga que consulta membresías |
| `app.html` | `/app` | Panel con los 4 módulos de `Dashboard.tsx` |
| `usuarios.html` | `/app/usuarios` | Alta con validación, cambio de rol, baja con diálogo |
| `roles.html` | `/app/roles` | Matriz 14 × 6 editable, baja bloqueada por membresías |
| `acopios.html` | `/app/acopios` | CRUD, edición en el mismo form, baja con confirmación |
| `inventario.html` | `/app/inventario` | Chips por bodega, filtros, modal de 18 campos |
| `donaciones.html` | `/app/donaciones` | Cola que avanza sola cada 4 s, banner de revisión |
| `donaciones-nueva.html` | `/app/donaciones/nueva` | Máquina de fases del OCR |
| `donaciones-revision.html` | `/app/donaciones/revision` | Asignar producto o reprocesar |

## Qué funciona de verdad

- **Navegación completa**: barra lateral con estado activo, enlaces reales entre vistas.
- **Inventario**: buscar por nombre/marca/SKU/presentación, filtrar por las 13
  categorías, ver dados de baja, cambiar de bodega (se recuerda en `localStorage`),
  crear y editar producto en modal, dar de baja y reactivar. Los 5 contadores se
  recalculan sobre los datos visibles.
- **Roles**: los 84 checkboxes reflejan el `ROLE_CATALOG` real — 51 permisos
  concedidos, exactamente los del código. Administrador de acopio está bloqueado.
  Dar de baja un rol con gente asignada devuelve el bloqueo del API.
- **Usuarios**: invitar valida contra el registro de cuentas; los dos errores del
  API salen literales. Cambio de rol, baja con diálogo, reactivación.
- **Donaciones**: la cola avanza `PENDIENTE → PROCESANDO → PROCESADA` sola.
  Captura con fases reales y resultado por umbral de certeza.
- **Modales**: Escape, clic en el fondo y trampa de foco.
- **Móvil**: bajo 900px la barra lateral pasa a tira horizontal y las tablas a
  tarjetas. No se oculta la navegación.

## Estructura

```
app/
  index.html  sign-in.html  sign-up.html
  empezar.html  empezar-organizacion.html  pendiente.html
  app.html  usuarios.html  roles.html  acopios.html
  inventario.html  donaciones.html  donaciones-nueva.html  donaciones-revision.html
  assets/
    app.css              sistema visual completo, una sola hoja
    dom.js               construcción de DOM sin innerHTML
    icons.js             set Feather como primitivas SVG
    data.js              enums y catálogos copiados de packages/shared
    app.js               shell, modales, avisos, captcha, ilustraciones
    logo-full.png        lockup con #JUNTXSPORELCHOCÓ — hero de la landing
    logo-mark.png        SOS CHOCÓ verde — barras sobre fondo claro
    logo-mark-cream.png  SOS CHOCÓ crema — barra lateral oscura
```

## Logotipo

Derivado de `SOS VERDE.png` (4500 × 5625). El original trae **fondo blanco
opaco**, no transparente: sobre la barra lateral verde habría quedado un
rectángulo blanco. El pipeline fue recortar el blanco a transparencia, quitar el
margen, y generar dos versiones de color.

```bash
magick "SOS VERDE.png" -fuzz 8% -transparent white -trim +repage _base.png
magick _base.png -resize 720x logo-full.png
magick _base.png -crop x91%+0+0 +repage -trim +repage -resize 520x logo-mark.png
magick logo-mark.png -fill '#F4F1E8' -colorize 100 logo-mark-cream.png
```

El corazón dentro de la O es **calado**: deja ver el fondo. Por eso hace falta
la versión crema para superficies oscuras — teñir no basta, el contrafondo tiene
que ser el del contenedor.

Se dimensiona **por alto** (`height`, `width: auto`). Fijar el ancho lo
desbordaba: el lockup es más alto que ancho y a 104px de ancho medía 88px de
alto dentro de una barra de 80px.

**El verde del logo es `#083502`**, más oscuro y saturado que el `--green
#12331A` de la paleta. No toqué los tokens: el logo va con su propio color sobre
fondo claro, y en crema sobre el verde de marca. Si querés alinear la paleta al
logo, es cambiar `--green` en `app.css`.

`dom.js` existe por una razón concreta: todo el DOM se construye con
`createElement` y `textContent`. No hay una sola asignación de `innerHTML` en el
proyecto, así que no hay superficie de inyección aunque los datos vinieran del API.

## Sistema visual

Sin decoración genérica: nada de barras de acento `border-left`, nada de puntitos
de estado, nada de pills para cualquier dato. Badge solo donde el código usa el
componente `Badge` — los 4 `DonacionImagenEstado` y las variantes del resultado
del OCR. El estado de inventario va como texto porque
`InventoryPage.tsx:412` lo pinta como texto.

Iconos Feather: trazo 2.2, extremos redondos, sin relleno. Única capa gráfica.

## Lo que no está

Envíos, entrega en campo y transparencia pública. No existen en el backend:
`docs/estado-actual.md` marca `/envios` como contenedor pendiente. El detalle y
el modelo propuesto están en `../WIREFRAMES/GAPS.md` #1.

`../WIREFRAMES/` conserva los 30 frames de tamaño fijo, importables a Figma vía
html.to.design. Este front los reemplaza como entregable de revisión.
