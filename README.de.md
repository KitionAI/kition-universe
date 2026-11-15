<div align="center">

# Kition Universe

Eine 3D-Sternenkarte von Kition, der offenen Profi-Suite für KI. Jedes Kit ist ein Planet: herumfliegen, landen und einem KI-Agenten bei echter Arbeit an einer echten Datei zusehen.

**[Kition Universe öffnen → universe.kition.ai](https://universe.kition.ai)**

[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Deutsch** · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [Tiếng Việt](README.vi.md)

</div>

[![Kition Universe](docs/images/kits.webp)](https://universe.kition.ai)

## Was es ist

Kition besteht aus 16 professionellen Editoren, den Kits: Dokumente, Tabellen, Folien, PDFs, Bilder, Video, Vektorgrafik, CAD, 3D-Szenen und mehr. Jedes Kit öffnet echte Dateien, und jedes lässt sich von einem KI-Agenten über ein offenes Protokoll steuern, das Kit Harness Protocol (KHP).

Kition Universe zeigt das alles auf einen Blick. Es beantwortet drei Fragen: Was kann jedes Kit herstellen, wie nutzt eine KI es, und wie können Sie es selbst nutzen?

## Was Sie hier tun können

### 16 Planeten besuchen, einen pro Kit

Jedes Kit hat seine eigene Welt: einen Ozeanplaneten, einen Gasriesen, ein Stadtraster, eine Lavawelt. Ein Klick auf einen Planeten zeigt, was das Kit herstellt. Nach der Landung gehen Sie durch seine Stadt, in der jedes Gebäude für etwas steht, das das Kit kann.

### Einem Agenten bei der Arbeit zusehen

Drücken Sie auf Abspielen: Die Befehle des Agenten erscheinen einer nach dem anderen, daneben die Bilder, die das Kit nach jedem Schritt gerendert hat. Die benutzten Gebäude leuchten auf. Am Ende kopieren Sie Prompt und Einrichtung für Ihre eigene KI. Das sind Aufzeichnungen echter Kit-Befehle, kein Live-Modell.

![Einem Agenten bei der Arbeit zusehen](docs/images/replay.webp)

### Eine Arbeit über mehrere Kits verfolgen

Zwölf Szenario-Galaxien zeigen, wie Kits zusammenspielen: Ein Geschäftsbericht geht von der Tabelle über den Bericht und die Folien zum unterschriebenen PDF. Ein Kurier trägt die Datei von Planet zu Planet, und die fertigen Dateien landen auf dem Ergebnisdeck.

![Eine Arbeit über mehrere Kits verfolgen](docs/images/scenario.webp)

### Mit dem beginnen, was Sie vorhaben

Tippen Sie „Quartalsbericht“, „Pivot“ oder „.psd“ und fliegen Sie direkt dorthin. Die Suche umfasst Szenarien, Kits, Fähigkeiten, Agentenbefehle und Dateiformate. Sie läuft in Ihrem Browser; nichts wird gesendet.

![Mit dem beginnen, was Sie vorhaben](docs/images/search.webp)

### Sehen, was andere gebaut haben

Produkte, die auf den Kits aufbauen, sind Planeten in der Produktgalaxie, durch Licht mit den Kits verbunden, die sie nutzen. Der Eintrag ist kostenlos, und jeder Produktplanet ist gleich groß.

![Sehen, was andere gebaut haben](docs/images/products.webp)

### Sehen, wie alles zusammenhängt

Zeigen Sie in der Übersicht auf eine Szenario-Galaxie, und Linien führen zu den Kit-Planeten, aus denen sie besteht. Eine 60-Sekunden-Tour führt durch das Protokoll, ein Kit, ein Szenario und die Produkte.

![Sehen, wie alles zusammenhängt](docs/images/overview.webp)

## Die 16 Kits

Jedes Kit ist ein Planet. Kits mit dem Vermerk Preview sind noch im Bau, ihre Planeten tragen ein Gerüst.

| Kit | Was es bearbeitet | Datei | Sein Planet |
| --- | --- | --- | --- |
| [**note**](https://universe.kition.ai/planet/note/) | Markdown-Notizen, die aufeinander verweisen | `.md` | Gasriese |
| [**table**](https://universe.kition.ai/planet/table/) | Strukturierte Tabellen mit typisierten Feldern und Ansichten | `.ktable` | Stadtwelt |
| [**board**](https://universe.kition.ai/planet/board/) | Whiteboards und Mindmaps | `.kboard` | Ozeanwelt |
| [**photo**](https://universe.kition.ai/planet/photo/) | Bilder mit Ebenen | `.psd` | Sturmwelt |
| [**film**](https://universe.kition.ai/planet/film/) | Videoschnitt | `.kfilm` | Gasriese |
| [**doc**](https://universe.kition.ai/planet/doc/) | Textdokumente | `.docx` | Ozeanwelt |
| [**sheet**](https://universe.kition.ai/planet/sheet/) | Tabellenkalkulation | `.xlsx` | Stadtwelt |
| [**slide**](https://universe.kition.ai/planet/slide/) | Präsentationen | `.kslide` | Gasriese |
| [**pdf**](https://universe.kition.ai/planet/pdf/) | PDF-Seiten, Formulare und Schwärzung | `.pdf` | Kraterfels |
| [**vector**](https://universe.kition.ai/planet/vector/) | Vektorillustration | `.kvector` | Kristallwelt |
| [**layout**](https://universe.kition.ai/planet/layout/) · Preview | Seitenlayout | `.klayout` | Dünenwelt |
| [**motion**](https://universe.kition.ai/planet/motion/) | Motion Graphics | `.kmotion` | Lavawelt |
| [**cad**](https://universe.kition.ai/planet/cad/) · Preview | 2D-Zeichnungen | `.dxf` | Kraterfels |
| [**html**](https://universe.kition.ai/planet/html/) · Preview | Webseiten | `.html` | Sturmwelt |
| [**scene**](https://universe.kition.ai/planet/scene/) · Preview | 3D-Szenen | `.kscene` | Ozeanwelt |
| [**design**](https://universe.kition.ai/planet/design/) · Preview | Interface-Design | `.kdesign` | Kristallwelt |

## Gut zu wissen

- Nichts auf der Website ruft ein KI-Modell auf. Die Wiedergaben sind Aufzeichnungen echter Kit-Befehle; die Bilder haben die Kits gerendert.
- Ihr Fortschritt (besuchte Planeten, angesehene Wiedergaben) bleibt in Ihrem Browser. Es gibt keine Konten.
- Die Website funktioniert ohne WebGL: eine statische Karte mit denselben Inhalten, einschließlich der Wiedergaben.
- Verfügbar auf Englisch und Chinesisch.

## Ihr Produkt oder Ihre Galaxie hinzufügen

Sie haben etwas auf den Kits gebaut? Es kann ein Planet in der Produktgalaxie werden. Sie haben eine Arbeitsweise, die durch mehrere Kits führt? Schlagen Sie eine Szenario-Galaxie vor. Beides ist kostenlos und läuft über ein Issue-Formular.

- [Ihren Produktplaneten hinzufügen](https://github.com/KitionAI/kition-universe/issues/new?template=built-with-kition.yml)
- [Eine Szenario-Galaxie vorschlagen](https://github.com/KitionAI/kition-universe/issues/new?template=scenario-galaxy.yml)
- [Regeln und Format](CONTRIBUTING.md)

## Für Entwickler

Die Website ist statisch: Astro, three.js und eine Datendatei. So starten Sie sie lokal:

```bash
pnpm install
pnpm dev        # http://localhost:4330
```

Wie sie gebaut, geprüft und veröffentlicht wird: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Links

- [Kition](https://kition.ai) · [GitHub](https://github.com/KitionAI/kition)
- [Kition SDK](https://github.com/KitionAI/kition-sdk)
- [Kit Harness Protocol](https://universe.kition.ai/protocol/)

## Lizenz

Apache-2.0
