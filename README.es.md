<div align="center">

# Kition Universe

Un mapa estelar en 3D de Kition, la suite profesional abierta para la IA. Cada kit es un planeta: vuela, aterriza y mira a un agente de IA hacer trabajo real en un archivo real.

**[Abrir Kition Universe → universe.kition.ai](https://universe.kition.ai)**

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · **Español** · [Português](README.pt-BR.md) · [Tiếng Việt](README.vi.md)

</div>

[![Kition Universe](docs/images/kits.webp)](https://universe.kition.ai)

## Qué es

Kition es un conjunto de 16 editores profesionales, llamados kits: documentos, hojas de cálculo, diapositivas, PDF, imágenes, vídeo, dibujo vectorial, CAD, escenas 3D y más. Cada kit abre archivos reales, y cada uno puede ser manejado por un agente de IA mediante un protocolo abierto, el Kit Harness Protocol (KHP).

Kition Universe es el lugar para verlo todo de un vistazo. Responde a tres preguntas: qué puede crear cada kit, cómo lo usa una IA y cómo puedes usarlo tú.

## Qué puedes hacer aquí

### Visitar 16 planetas, uno por kit

Cada kit tiene su propio mundo: un planeta océano, un gigante gaseoso, una ciudad en cuadrícula, un mundo de lava. Haz clic en un planeta para ver qué crea el kit; luego aterriza y recorre su ciudad, donde cada edificio es algo que el kit sabe hacer.

### Ver a un agente trabajar

Pulsa reproducir y verás los comandos que envía el agente, uno a uno, junto a las imágenes que el kit generó tras cada paso. Los edificios en uso se iluminan. Al terminar, copia el prompt y la configuración para tu propia IA. Son grabaciones de comandos reales de los kits, no un modelo en vivo.

![Ver a un agente trabajar](docs/images/replay.webp)

### Seguir un mismo trabajo de kit en kit

Doce galaxias de escenarios muestran cómo se combinan los kits: un informe de negocio pasa de la hoja de cálculo al informe, a las diapositivas y al PDF firmado. Un mensajero lleva el archivo de planeta en planeta, y los archivos terminados llegan a la plataforma de resultados.

![Seguir un mismo trabajo de kit en kit](docs/images/scenario.webp)

### Empezar por lo que quieres hacer

Escribe «informe trimestral», «tabla dinámica» o «.psd» y vuela directamente allí. La búsqueda abarca escenarios, kits, capacidades, comandos de agente y formatos de archivo. Se ejecuta en tu navegador; no se envía nada.

![Empezar por lo que quieres hacer](docs/images/search.webp)

### Ver lo que otros han creado

Los productos creados sobre los kits son planetas de la Galaxia de productos, unidos por luz a los kits que usan. Aparecer es gratis, y todos los planetas de producto tienen el mismo tamaño.

![Ver lo que otros han creado](docs/images/products.webp)

### Ver cómo se conecta todo

Desde la vista general, señala una galaxia de escenario para ver las líneas hacia los planetas de los kits que la forman. Un recorrido de 60 segundos te lleva por el protocolo, un kit, un escenario y los productos.

![Ver cómo se conecta todo](docs/images/overview.webp)

## Los 16 kits

Cada kit es un planeta. Los kits marcados como Preview siguen en construcción, y sus planetas llevan andamios.

| Kit | Qué edita | Archivo | Su planeta |
| --- | --- | --- | --- |
| [**note**](https://universe.kition.ai/planet/note/) | Notas en Markdown enlazadas entre sí | `.md` | Gigante gaseoso |
| [**table**](https://universe.kition.ai/planet/table/) | Tablas estructuradas con campos tipados y vistas | `.ktable` | Mundo ciudad |
| [**board**](https://universe.kition.ai/planet/board/) | Pizarras y mapas mentales | `.kboard` | Mundo océano |
| [**photo**](https://universe.kition.ai/planet/photo/) | Imágenes por capas | `.psd` | Mundo de tormentas |
| [**film**](https://universe.kition.ai/planet/film/) | Edición de vídeo | `.kfilm` | Gigante gaseoso |
| [**doc**](https://universe.kition.ai/planet/doc/) | Documentos de texto | `.docx` | Mundo océano |
| [**sheet**](https://universe.kition.ai/planet/sheet/) | Hojas de cálculo | `.xlsx` | Mundo ciudad |
| [**slide**](https://universe.kition.ai/planet/slide/) | Presentaciones | `.kslide` | Gigante gaseoso |
| [**pdf**](https://universe.kition.ai/planet/pdf/) | Páginas PDF, formularios y censura de texto | `.pdf` | Roca con cráteres |
| [**vector**](https://universe.kition.ai/planet/vector/) | Ilustración vectorial | `.kvector` | Mundo de cristal |
| [**layout**](https://universe.kition.ai/planet/layout/) · Preview | Maquetación | `.klayout` | Mundo de dunas |
| [**motion**](https://universe.kition.ai/planet/motion/) | Gráficos en movimiento | `.kmotion` | Mundo de lava |
| [**cad**](https://universe.kition.ai/planet/cad/) · Preview | Dibujo técnico 2D | `.dxf` | Roca con cráteres |
| [**html**](https://universe.kition.ai/planet/html/) · Preview | Páginas web | `.html` | Mundo de tormentas |
| [**scene**](https://universe.kition.ai/planet/scene/) · Preview | Escenas 3D | `.kscene` | Mundo océano |
| [**design**](https://universe.kition.ai/planet/design/) · Preview | Diseño de interfaces | `.kdesign` | Mundo de cristal |

## Conviene saber

- Nada en el sitio llama a un modelo de IA. Las reproducciones son grabaciones de comandos reales de los kits; las imágenes las generaron los kits.
- Tu progreso (planetas visitados, reproducciones vistas) se queda en tu navegador. No hay cuentas.
- El sitio funciona sin WebGL: un mapa estático y el mismo contenido, incluidas las reproducciones.
- Disponible en inglés y chino.

## Añade tu producto o tu galaxia

¿Has creado algo sobre los kits? Puede convertirse en un planeta de la Galaxia de productos. ¿Tienes una forma de trabajar que pasa por varios kits? Propón una galaxia de escenario. Ambas cosas son gratuitas y se envían con un formulario de issue.

- [Añadir tu planeta de producto](https://github.com/KitionAI/kition-universe/issues/new?template=built-with-kition.yml)
- [Proponer una galaxia de escenario](https://github.com/KitionAI/kition-universe/issues/new?template=scenario-galaxy.yml)
- [Las reglas y el formato](CONTRIBUTING.md)

## Para desarrolladores

El sitio es estático: Astro, three.js y un archivo de datos. Para ejecutarlo en local:

```bash
pnpm install
pnpm dev        # http://localhost:4330
```

Cómo se construye, se comprueba y se publica: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Enlaces

- [Kition](https://kition.ai) · [GitHub](https://github.com/KitionAI/kition)
- [Kition SDK](https://github.com/KitionAI/kition-sdk)
- [Kit Harness Protocol](https://universe.kition.ai/protocol/)

## Licencia

Apache-2.0
