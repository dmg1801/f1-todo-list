# F1 To-Do-List

Lista de tareas gamificada como una carrera de monoplazas. Cada tarea es una vuelta: al completarla, tu coche adelanta a un rival, la radio del equipo lo celebra y, a mitad de carrera, entras en boxes. Funciona en móvil y escritorio, en español, inglés, alemán y turco.

Es una app **estática** (HTML, CSS y JavaScript sin dependencias). No necesita servidor propio, base de datos, claves ni `npm install`.

## Probar en local

1. Extrae `Pitwall_GP.zip`.
2. Abre una terminal dentro de la carpeta extraída (la que contiene `index.html`).
3. Arranca un servidor estático:

   ```bash
   python -m http.server 8000
   ```

   (En algunos sistemas el comando es `python3`.)
4. Visita <http://localhost:8000>.

Abrir `index.html` con doble clic (`file://`) no funciona: los navegadores bloquean los módulos JavaScript fuera de un servidor.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `pitwall-gp`).
2. Sube el **contenido** de la carpeta extraída a la raíz de la rama `main`: `index.html`, `.nojekyll`, `css/`, `js/`, `assets/`, etc. `index.html` debe quedar en la raíz del repositorio, no dentro de una subcarpeta.
   - Desde la web: *Add file → Upload files* y arrastra todo el contenido. El archivo `.nojekyll` está oculto en algunos sistemas; si no lo ves, créalo vacío desde GitHub (*Add file → Create new file*).
   - Con git: `git init`, `git add .`, `git commit -m "F1 To-Do-List"`, `git branch -M main`, `git remote add origin …`, `git push -u origin main`.
3. En el repositorio: *Settings → Pages → Build and deployment → Source: Deploy from a branch*. Elige la rama `main` y la carpeta `/ (root)`, y guarda.
4. Tras uno o dos minutos la app estará en `https://USUARIO.github.io/REPOSITORIO/`.

Todas las rutas son relativas (`./assets/teams/apex-gp.svg`), así que funciona igual en la raíz de un dominio o en el subdirectorio del repositorio.

**Tus datos:** las tareas se guardan en el `localStorage` del navegador, que depende del origen (dominio). Los datos que tuvieras en otra dirección no pasan automáticamente a GitHub Pages, ni de un dispositivo a otro.

## Recordatorios: qué esperar

GitHub Pages solo sirve archivos: no hay ningún servidor que envíe avisos.

- Los recordatorios puntuales necesitan la app **abierta**. El sistema puede retrasar los temporizadores de las pestañas en segundo plano.
- La app comprueba los avisos al cargar, al volver a la pestaña y cada 15 segundos. Si vuelves después de la hora, verás los avisos atrasados marcados como tales.
- Se guarda qué avisos se mostraron y cuáles descartaste, así que no se repiten. Completar o eliminar una tarea quita su aviso; si cambias la hora, se vuelve a programar.
- Las notificaciones del sistema son opcionales (Ajustes → *Activar notificaciones*). Si el navegador las bloquea o no las admite, los avisos siguen apareciendo dentro de la app. En Android se envían a través del pequeño Service Worker (`sw.js`).

## Estructura

| Ruta | Tipo | Contenido |
|---|---|---|
| `index.html` | Fuente | Estructura de la página |
| `css/styles.css` | Fuente | Estilos, diseño responsive y estados |
| `js/app.js` | Fuente | Arranque, interfaz, tareas, diálogos |
| `js/i18n.js` | Fuente | **Catálogo de traducciones** y formato de fechas |
| `js/store.js` | Fuente | Persistencia (`pitwall-gp-v1`) y clasificación |
| `js/teams.js` | Fuente | Escuderías, libreas y acentos de interfaz |
| `js/reminders.js` | Fuente | Recordatorios y notificaciones |
| `js/audio.js` | Fuente | Efectos (Web Audio) y voz (speechSynthesis) |
| `js/scene/director.js` | Fuente | Estados de escena y cola de animaciones |
| `js/scene/track.js` | Fuente | Pista pseudo-3D y adelantamientos |
| `js/scene/garage.js` | Fuente | Garaje, montaje y parada en boxes |
| `js/scene/art.js` | Fuente | Dibujo del coche, personas y bandera |
| `sw.js`, `manifest.webmanifest` | Fuente | Notificaciones en Android, uso sin conexión e instalación |
| `assets/teams/*.svg` | Recursos | Un emblema por escudería |
| `assets/icons/` | Recursos | Iconos de la app |
| `README.md` | Documentación | Este archivo |
| `.nojekyll` | Configuración | Evita el procesado Jekyll de GitHub Pages |

### Datos guardados

Clave `pitwall-gp-v1` en `localStorage`:

```json
{
  "tasks": [{ "id": "…", "title": "…", "due": 1767225600000, "alarm": null,
              "done": false, "fired": false, "dismissed": false,
              "late": false, "created": 1767139200000, "completedAt": null }],
  "team": "ferrari", "sound": false, "motion": null, "language": "es", "pitLaps": []
}
```

Las fechas son timestamps en milisegundos. `motion: null` significa «seguir la preferencia del sistema» (`prefers-reduced-motion`). Al cargar, los datos antiguos con fechas en texto se convierten a timestamps.

## Editar traducciones

Todos los textos están en `js/i18n.js`, en un objeto por idioma (`es`, `en`, `de`, `tr`) con las mismas claves.

- `{nombre}` es un parámetro (posición, recuento, título de la tarea…).
- Los textos con plural son objetos `{ one: '…', other: '…' }`. Se elige la forma con `Intl.PluralRules`.
- Si falta una clave en un idioma, se usa la española.
- Los textos fijos del HTML llevan `data-i18n="clave"`; las etiquetas accesibles, `data-i18n-aria`.

Para añadir un idioma, copia el bloque `es`, tradúcelo, regístralo en `LANGS` y en `CATALOG`, y añade su `<option>` en `index.html`.

## Reemplazar los emblemas

Cada escudería usa `assets/teams/<id>.svg` (por ejemplo `assets/teams/apex-gp.svg`). Para cambiar uno, sustituye el archivo por otro **con el mismo nombre**, preferiblemente SVG cuadrado (`viewBox="0 0 64 64"`) para que se vea nítido a 40 px. Si quieres usar PNG, cambia la extensión en el campo `emblem` de `js/teams.js`.

Los emblemas incluidos son **diseños originales de F1 To-Do-List**, distintos de los logotipos de las marcas. Solo sustituyas un archivo por un escudo oficial si tienes permiso para redistribuirlo en este proyecto, y documenta aquí su origen y licencia.

### Origen y licencia de los recursos

| Recurso | Origen | Licencia |
|---|---|---|
| `assets/teams/*.svg` | Diseños originales creados para F1 To-Do-List | Distribuidos con el proyecto |
| `assets/icons/*` | Diseño original creado para F1 To-Do-List | Distribuidos con el proyecto |

El proyecto no incluye recursos de terceros ni carga nada desde webs externas. Los nombres de escudería se usan solo como etiquetas del selector. F1 To-Do-List no tiene relación con esas marcas.

## Accesibilidad y rendimiento

- Botones y campos de al menos 44 × 44 px, foco visible, diálogos nativos con gestión del foco y estados que se distinguen por texto e icono, no solo por color.
- *Pausar animación* (o el ajuste *Animaciones de la escena*) congela la escena y aplica los cambios al instante. Se respeta `prefers-reduced-motion`. La posición, la radio y el estado siempre se muestran como texto.
- Sonido desactivado por defecto. Se activa tras una interacción del usuario, y la voz cancela la frase anterior para no solaparse.
- Canvas 2D con `requestAnimationFrame`. La escena deja de dibujarse cuando no está a la vista y no toca el DOM en cada fotograma.
