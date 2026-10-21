# Motion_25.04.26

Aplicación de análisis de movimiento con React, TypeScript y Vite.

## Desarrollo

```sh
npm ci
npm run dev
```

## Selección de ángulos por deporte

Ciclismo, running, natación y halterofilia permiten seleccionar grupos de piernas, tronco, brazos y cabeza/cuello, y activar o desactivar cada ángulo. Solo se dibujan, calculan y guardan los puntos y ángulos elegidos. Las zonas sin definiciones disponibles en la vista se muestran deshabilitadas. Los puntos compartidos se conservan si todavía los necesita otro ángulo activo.

El filtro incluye las vistas frontal/posterior de ciclismo y running, los cuatro estilos de natación y los ocho ejercicios de halterofilia. Las capturas restauran la selección y permiten añadir otras zonas después. Los cambios de estilo o ejercicio inician un espacio limpio para evitar usar puntos de la modalidad anterior.

## Seguimiento de video local

En las vistas que usan el espacio de análisis compartido (incluida la vista lateral de running):

1. Selecciona un video de tu dispositivo. El archivo completo no se sube al servidor.
2. Elige los ángulos por zona o los puntos independientes que quieras seguir.
3. Pausa en el fotograma inicial y coloca los puntos sobre las referencias del cuerpo.
4. Selecciona un límite de **60 o 120 FPS** (120 por defecto) y pulsa **Analizar desde este fotograma**.
5. Reproduce el resultado, avanza con los botones o las flechas, o recorre las muestras analizadas. Selecciona una medición para ver su gráfica y un punto para mostrar su trayectoria reciente.
6. Descarga los resultados en CSV o JSON antes de recargar o cerrar la página.

El límite controla el muestreo del análisis: un video de 30 FPS conserva sus 30 fotogramas por segundo; uno de 120 conserva todos con límite 120; uno de 240 se muestrea a 120 o 60. Se usan timestamps reales, también en videos de frecuencia variable, sin interpolar, duplicar ni modificar el archivo original. El avance manual usa los fotogramas originales, incluso los no muestreados por el análisis.

La decodificación y el seguimiento se ejecutan en un Web Worker, independientemente de la velocidad de reproducción y del refresco de la pantalla. El análisis puede tardar más que el video. Se conservan posiciones normalizadas, tiempos, confianza y ángulos; el CSV incluye posiciones en píxeles. Los ángulos del análisis se calculan en coordenadas de imagen para respetar su relación de aspecto. Para limitar memoria y trabajo, la imagen interna de seguimiento se reduce proporcionalmente a un máximo de 1280 píxeles en su lado mayor; el video de reproducción conserva su resolución original.

El seguimiento usa flujo óptico piramidal con comprobación de ida y vuelta. Si un punto se pierde, se detiene en ese fotograma y los ángulos que dependen de él no se registran como válidos. Corrige los puntos marcados y vuelve a analizar desde allí. Una corrección elimina los resultados de ese fotograma en adelante y conserva los anteriores. Cambiar la selección de puntos, ángulos o límite reinicia los resultados. El botón Detener conserva los lotes ya procesados.

Se necesita un navegador que permita WebCodecs y OffscreenCanvas en workers y un códec compatible. Si no se puede decodificar el archivo, la aplicación lo informa. El procesamiento no garantiza recuperar puntos ocultos ni sustituye la revisión del usuario. La cámara en vivo conserva su flujo propio; el nuevo análisis por fotogramas se aplica a archivos de video.

Los datos continuos permanecen en memoria y pueden descargarse. Guardar un snapshot sí almacena su imagen, puntos y ángulos en la plataforma. No se guardan automáticamente el video ni la serie continua en la base de datos.

Decodificación local: [Mediabunny: CanvasSink](https://mediabunny.dev/api/CanvasSink).

## Verificación

```sh
npm test
npm run build
npm run typecheck
npm run lint
```

Las pruebas automatizadas cubren muestreo, frecuencia variable, avance por fotogramas, geometría, exportación, seguimiento con movimiento conocido, pérdida de puntos, procesamiento secuencial y cancelación/corrección de trabajos.

Con el servidor de desarrollo activo:

- `/tests/browser.html`: genera MP4 sintéticos a 30, 60, 120 y 240 FPS y ejecuta el worker con límites 60 y 120 usando WebCodecs reales. Comprueba número de muestras y desplazamiento conocido.
- `/tests/workspace.html`: permite probar el espacio de análisis completo sin autenticación ni escrituras remotas, con un video sintético de 240 FPS.

TypeScript y ESLint tienen errores preexistentes en otras áreas del proyecto; deben revisarse por separado. La compilación de Vite no ejecuta TypeScript.
