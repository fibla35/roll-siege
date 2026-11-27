# Roll Siege — ficha de Google Play

## Datos básicos
- **Nombre:** Roll Siege: Asedio Armadillo
- **Paquete:** com.fibla.rollsiege
- **Categoría:** Juegos › Acción (o Casual)
- **Precio:** Gratis, con vídeos con premio opcionales (AdMob). Sin compras por ahora.
- **Correo de contacto:** (el tuyo)
- **Política de privacidad:** `docs/privacidad.html` del repositorio. Actívala en GitHub › Settings › Pages (rama main, carpeta /docs) → https://fibla35.github.io/roll-siege/privacidad.html. Rellena antes tu correo.

## Descripción corta (máx. 80 caracteres)
Dispara armadillos con tu cañón, derriba mapaches y construye tu fortaleza.

## Descripción completa
¡Carga la pólvora, apunta y dispara armadillos acorazados contra las fortalezas de los mapaches bandidos!

**🎯 Asedios llenos de física**
Arrastra hacia atrás para cargar el cañón y suelta. Cada armadillo tiene un poder: dividirse en tres, explotar, perforar, congelar, convertirse en meteorito, hacer flotar la fortaleza… ¡Elige el orden y derriba a todos los mapaches!

**🦝 Mapaches que se defienden**
Honderos que te mojan la pólvora, manitas que reparan, ladrones que roban puntos, brujos con escudos mágicos y 12 jefes enormes con su propio ataque.

**🗺 18 mundos y más de 700 niveles**
Del Bosque del Saqueo a los Mares Bandidos y la Fortaleza del Kraken. Cada mundo tiene modo Normal, **Modo Montaña** (dispara con mortero por encima de murallas de roca y acantilados) y **Modo Difícil**. Con lluvia, tormentas, viento, ventiscas, atardeceres y noches.

**🎃 Eventos de temporada**
Noche de Calabazas, Navidad Bandida y Verano Pirata, con jefes y skins exclusivas.

**🏰 Construye tu fortaleza**
Diseña tu base piso a piso con madera, piedra, hielo, hierro, cristal y obsidiana. Refuérzala con puntales y soldaduras, pon trampas (muelles, ventiladores, torretas, escudos) y defiéndela cuando los mapaches contraataquen.

**🎌 Seis clanes**
Sol Naciente, La Frontera, Sol de Jade, El Norte (vikingos), El Nilo y El Parche (piratas): cada uno con su estilo de fortaleza y su cañón.

**🏆 Y mucho más**
24 armadillos para coleccionar y mejorar, 36 skins, cofres, misiones diarias, ruleta de premios, 27 logros, jugadas maestras (¡doble K.O., derrumbe!), combos y cámara lenta. Música drum & bass y chiptune original. En español e inglés.

Sin anuncios obligatorios: solo vídeos con premio si tú quieres. Sin conexión obligatoria.

## Material gráfico (carpeta `store/`)
- Icono 512×512: `icono_512.png`
- Gráfico de funciones 1024×500: `feature_graphic_1024x500.png`
- Capturas 1920×1080 (8): `screenshots/`

## Cuestionarios de la consola
- **Clasificación de contenido (IARC):** violencia de dibujos animados leve, sin sangre (los mapaches quedan "K.O." con ojos en X). Sin lenguaje, sin apuestas, sin compras. Resultado esperado: PEGI 7 / Everyone.
- **Anuncios:** Sí, contiene anuncios (vídeos con premio de AdMob, siempre opcionales).
- **Seguridad de los datos** (por AdMob): se recogen y comparten *Identificadores del dispositivo u otros* (ID de publicidad) y *Ubicación aproximada*; finalidad: Publicidad o marketing, Analíticas y Prevención de fraude. Los datos se cifran en tránsito. El usuario no puede pedir que se borren (los gestiona Google).
- **ID de publicidad:** declara que la app usa el ID de publicidad (para anuncios).
- **Antes de publicar:** crea la cuenta de AdMob, registra la app y sustituye los identificadores de PRUEBA por los tuyos: `android/app/src/main/AndroidManifest.xml` (APPLICATION_ID) y `www/js/ads.js` (REWARD_ID, y `TESTING = false`).
- **Público objetivo:** recomendado **13 años o más** (si eliges menores de 13, Google aplica la política de Familias y pide más requisitos).
- **Acceso a la app:** sin restricciones, no requiere inicio de sesión.

## Subida
1. Crea la app en Play Console con el paquete `com.fibla.rollsiege`.
2. Activa **Firma de apps de Google Play** (lo propone al subir el primer AAB).
3. Sube `RollSiege-GooglePlay.aab` (en Releases de GitHub) primero a **Prueba interna**.
4. Requisito para cuentas personales nuevas: **prueba cerrada con 12 testers durante 14 días** antes de poder publicar en producción.
