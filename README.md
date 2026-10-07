# Sistema KASANOV

Centro de mando personal con estilo de videojuego. Un escuadrón de agentes de IA (Claude) te ayuda a sostener tus hábitos, avanzar tus proyectos, repasar lo que aprendes, cuidar tu dinero y tomar decisiones con evidencia. Ves a los agentes caminar por la base, pasarse información y reunirse en el Nexo mientras trabajan.

![Captura del Nexo](docs/captura.png)

Es una sola página web, sin servidor, sin frameworks y sin paso de compilación.

## Qué incluye

| Área | Qué hace |
|---|---|
| **Nexo** | Mapa pixel de la base. Cada departamento es un agente con su sala, su carácter y sus rutinas. Desde la consola despachas misiones: el Nexo arma un plan, cada agente trabaja con tus datos, le pasa notas al siguiente y al final hay un resumen con el siguiente paso. Lo que proponen (tarjetas, proyectos, habilidades, misión del día) se aplica solo si tú lo apruebas. |
| **Personal** | Hoy: hábitos, bonus, puntos, minutos de estudio, energía y bitácora. Semana: gráfica, adherencia, mapa de 4 semanas y progresión. Mis hábitos: los editas tú. |
| **Trabajo y proyectos** | Proyectos en tablero (ideas, en curso, por publicar, terminado). Habilidades separadas en probadas, en práctica y sin probar: solo cuenta lo que tiene evidencia. Repaso con repetición espaciada y evaluación opcional de Claude. |
| **Finanzas** | Cuentas, gastos, ingresos, meses de colchón y rendimiento estimado. Consultas de decisiones: Finanzas lidera y el Nexo da un veredicto (Sí, No, Depende o Esperar). |
| **Engranaje** | Revisión semanal del escuadrón, tu meta, solicitudes de mejora, departamentos y ajustes. |

Además, el botón **Ocultar $** tapa todas las cifras de dinero de la pantalla, incluidas las que aparecen en los textos de los agentes.

## Cómo usarlo

1. Descarga el repositorio (botón **Code → Download ZIP**) o clónalo:
   ```bash
   git clone https://github.com/<tu-usuario>/sistema-kasanov.git
   ```
2. Abre `index.html` en tu navegador. Funciona con doble clic, sin instalar nada.
3. Entra al engranaje → **Ajustes**, pega tu API key de Anthropic, pulsa **Probar conexión** y luego **Guardar y recargar**. La API key se consigue en [console.anthropic.com](https://console.anthropic.com/) → API Keys.
4. En **Ajustes → Quién eres** escribe tu nombre y algo de contexto. En **Mejoras → Tu meta** escribe hacia dónde vas. Los agentes usan ambos datos en cada misión.

Sin API key funciona todo menos los agentes: hábitos, proyectos, habilidades, repaso y finanzas siguen disponibles.

## Publicarlo con GitHub Pages

En tu repositorio ve a **Settings → Pages → Build and deployment**, elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`. En un par de minutos queda en `https://<tu-usuario>.github.io/sistema-kasanov/`.

Cada persona que lo abra usa sus propios datos y su propia API key. Nada se comparte entre visitantes.

## Privacidad y seguridad

- **Tus datos** viven en el almacenamiento local de tu navegador (`localStorage`). No hay servidor ni base de datos en la nube.
- **Lo único que sale de tu equipo** son las llamadas a la API de Anthropic, con el contexto que cada misión necesita (tus hábitos recientes, proyectos, habilidades y números).
- **La API key** se guarda en ese mismo almacenamiento local y las llamadas van directo de tu navegador a Anthropic (con el encabezado `anthropic-dangerous-direct-browser-access`). Úsalo en tu propio equipo, nunca pongas tu key dentro del código y configura un límite de gasto en la consola de Anthropic.
- **Respaldos**: en Ajustes puedes descargar e importar un archivo JSON con todos tus datos. Ese archivo es personal: no lo subas al repositorio. El `.gitignore` ya excluye los archivos `*respaldo*.json`.

## Costos

Cada misión hace una llamada de planeación con el modelo rápido, una por cada agente que participa con el modelo normal y una de síntesis. Una revisión semanal involucra a todo el escuadrón. El costo depende de los precios vigentes de Anthropic: consúltalos en [anthropic.com/pricing](https://www.anthropic.com/pricing).

## Modelos

Por defecto usa `claude-haiku-4-5-20251001` (rápido), `claude-sonnet-5-5` (normal) y `claude-opus-5-5` (complejo). Puedes cambiarlos en **Ajustes**. Si alguno deja de estar disponible, reemplázalo por uno vigente de la [lista oficial de modelos](https://docs.claude.com/en/docs/about-claude/models/overview).

## Cómo está hecho

```
index.html        estructura de la página
css/styles.css    estilos
js/app.js         la aplicación: mapa, agentes, orquestación y secciones
js/runtime.js     capa de ejecución: base de datos local y llamadas a Claude
docs/             imágenes del README
```

La app nació como un artifact de Claude, que le da a la página una base de datos, llamadas a Claude y conectores. `js/runtime.js` reemplaza esas capacidades para que funcione en cualquier navegador:

- **Base de datos**: guarda documentos en `localStorage` con una API tipo Firestore (`doc`, `collection`, `where`, `orderBy`, `limit`, `onSnapshot`). Si abres dos pestañas, ambas se sincronizan.
- **Claude**: llama a la API de Mensajes de Anthropic con tu key y lee respuestas JSON.

Para sincronizar entre dispositivos puedes reemplazar la base de datos local por Firebase o Supabase implementando esa misma interfaz en `runtime.js`. `app.js` no necesita cambios.

## Diferencias con la versión dentro de Claude

- La revisión semanal no corre sola el domingo: la lanzas desde el engranaje con **Correr revisión ahora**.
- Los datos no se sincronizan entre dispositivos; usa los respaldos para moverlos.
- Auditoría del sistema propone mejoras, pero no puede editar el código por sí misma.

## Licencia

[MIT](LICENSE)
