# Cuadernos, español

El índice del árbol en español. Los temas van de simple a complejo; dentro de un tema el orden de lectura es el número del cuaderno y el nivel nunca
baja. La contraparte en inglés de cada cuaderno está en la misma ruta bajo [`../en/`](../en/README.md). Cómo ejecutarlos está en
[`../README.md`](../README.md).

Niveles: 1 fundamentos, 2 el método en la práctica, 3 estado del arte, 4 más allá del estado del arte. Cada cuaderno lee sus números de los
artefactos versionados o del motor `blastfrag` 0.4.0 en la ejecución, y termina con sus referencias. El código de las celdas es el mismo que el del
árbol en inglés, y los números que imprimen son los mismos (con el punto decimal de Python); solo la prosa, los comentarios y las etiquetas están en español.

## Temas

Un tema sin cuaderno de nivel 3 dice por qué en su fila.

| Tema | Requiere | Nivel 3 |
|---|---|---|
| [01-the-data](01-the-data/) | nada, es el tema de entrada | Sin nivel 3: el corpus es un único conjunto de tablas publicado y la investigación no tiene un cargador ni un método de integridad alternativos con que compararlo |
| [02-classical-prediction](02-classical-prediction/) | tema 01-the-data | [03-the-published-hold-out-tables](02-classical-prediction/03-the-published-hold-out-tables.ipynb) |
| [03-size-distribution](03-size-distribution/) | tema 02-classical-prediction | Sin nivel 3: ningún conjunto de datos disponible para este trabajo trae una distribución de tamaños medida, así que ninguna forma de curva puede ordenarse frente al estado del arte |
| [04-benchmark-protocol](04-benchmark-protocol/) | tema 01-the-data | [03-placing-a-published-score-in-its-own-protocol](04-benchmark-protocol/03-placing-a-published-score-in-its-own-protocol.ipynb) |
| [05-learned-arms](05-learned-arms/) | tema 04-benchmark-protocol | [03-reproducing-the-published-network](05-learned-arms/03-reproducing-the-published-network.ipynb) |
| [06-design-response](06-design-response/) | temas 02-classical-prediction y 05-learned-arms | Sin nivel 3: ningún predictor publicado informa cómo responde su predicción a un cambio de diseño en este corpus, así que no hay con qué comparar |

## Cuadernos

| Cuaderno | Nivel | Qué enseña |
|---|---|---|
| [01-the-data/01-the-corpus-and-the-cases.ipynb](01-the-data/01-the-corpus-and-the-cases.ipynb) | 1 | los 97 tiros publicados y sus siete entradas, las diez campañas, los tres conjuntos de hold-out, los dieciséis casos y qué guarda un artefacto de caso versionado |
| [01-the-data/02-geometry-reconstruction.ipynb](01-the-data/02-geometry-reconstruction.ipynb) | 2 | de razones a metros con un diámetro de perforación guardado, la verificación contra 15 afirmaciones de la prosa de la fuente, una verificación que falla cuando el diámetro es incorrecto, y el único sitio que se rechaza |
| [01-the-data/03-integrity-gate-and-negative-controls.ipynb](01-the-data/03-integrity-gate-and-negative-controls.ipynb) | 4 | la compuerta de integridad al cargar, que reproduce los estadísticos impresos del artículo y un resumen fijado, cuatro defectos sembrados y qué capa atrapa cada uno, y los dos controles negativos (afirmaciones BS-2 y BS-3) |
| [02-classical-prediction/01-the-classical-equation-on-one-blast.ipynb](02-classical-prediction/01-the-classical-equation-on-one-blast.ipynb) | 1 | la ecuación del tamaño medio de Kuznetsov con la corrección de Cunningham, escrita término a término, aplicada a un tiro y luego a una campaña completa puntuada con dos estadísticos con nombre |
| [02-classical-prediction/02-the-rock-factor.ipynb](02-classical-prediction/02-the-rock-factor.ipynb) | 2 | el único número libre: se recupera invirtiendo la ecuación sobre las predicciones publicadas, es constante dentro de un sitio, difiere entre los dos artículos y las tablas de clasificación no lo fijan |
| [02-classical-prediction/03-the-published-hold-out-tables.ipynb](02-classical-prediction/03-the-published-hold-out-tables.ipynb) | 3 | las predicciones impresas de los dos artículos puntuadas como cualquier otra, la regresión publicada recalculada desde sus ecuaciones, y el tiro que comparte con la tabla de entrenamiento |
| [02-classical-prediction/04-a-rock-factor-that-uses-nothing-from-the-target-site.ipynb](02-classical-prediction/04-a-rock-factor-that-uses-nothing-from-the-target-site.ipynb) | 4 | un factor de roca predicho desde el módulo sobre los otros sitios, y qué tan poco del puntaje clásico se tomaba prestado del sitio excluido (afirmación BS-4) |
| [03-size-distribution/01-from-a-mean-size-to-a-curve.ipynb](03-size-distribution/01-from-a-mean-size-to-a-curve.ipynb) | 1 | la curva de Rosin-Rammler y el índice de uniformidad de Cunningham con su trampa de unidades mixtas, percentiles, y la dispersión del índice en el corpus |
| [03-size-distribution/02-swebrec-crush-zone-and-the-block-cap.ipynb](03-size-distribution/02-swebrec-crush-zone-and-the-block-cap.ipynb) | 2 | tres formas de curva alrededor de un tamaño medio, el parámetro de ondulación, las constantes no publicadas de la zona de trituración y el tope en el bloque in situ |
| [04-benchmark-protocol/01-three-ways-to-split-the-same-97-blasts.ipynb](04-benchmark-protocol/01-three-ways-to-split-the-same-97-blasts.ipynb) | 1 | las divisiones aleatoria, sin duplicados y de un sitio fuera, la fuga que deja pasar la primera y la verificación que rechaza una división inválida |
| [04-benchmark-protocol/02-scores-the-null-and-the-interval.ipynb](04-benchmark-protocol/02-scores-the-null-and-the-interval.ipynb) | 2 | dos estadísticos con nombre, el nulo ajustado en cada pliegue y por qué no es neutral, intervalos que remuestrean tiros frente a sitios, y el criterio de descarte predeclarado en dos conjuntos de filas |
| [04-benchmark-protocol/03-placing-a-published-score-in-its-own-protocol.ipynb](04-benchmark-protocol/03-placing-a-published-score-in-its-own-protocol.ipynb) | 3 | el 0,943 publicado del conjunto de apilamiento ubicado entre 100 sorteos de su propio protocolo, la prueba de duplicados y la brecha de protocolo |
| [04-benchmark-protocol/04-the-site-held-out-protocol-and-its-pre-declared-criterion.ipynb](04-benchmark-protocol/04-the-site-held-out-protocol-and-its-pre-declared-criterion.ipynb) | 4 | el costo del protocolo predictor por predictor, los intervalos con remuestreo de sitios, dónde falla un predictor con el sitio fuera, y el criterio fijado por un hash (afirmación BS-1) |
| [05-learned-arms/01-fitting-a-learned-arm-on-nine-sites.ipynb](05-learned-arms/01-fitting-a-learned-arm-on-nine-sites.ipynb) | 1 | ajustar y predecir con los seis predictores aprendidos sobre nueve campañas, contrastado con el artefacto versionado de Enusa |
| [05-learned-arms/02-every-arm-and-why-each-one-refuses.ipynb](05-learned-arms/02-every-arm-and-why-each-one-refuses.ipynb) | 2 | los catorce predictores por diez pliegues, cada negativa con su razón y campaña, y el orden en las filas que todos los predictores responden |
| [05-learned-arms/03-reproducing-the-published-network.ipynb](05-learned-arms/03-reproducing-the-published-network.ipynb) | 3 | la red publicada reproducida con 30 semillas, su selección de ancho repetida, y sus anchos con el sitio fuera |
| [06-design-response/01-moving-one-lever-at-a-time.ipynb](06-design-response/01-moving-one-lever-at-a-time.ipynb) | 1 | las ocho variantes estándar aplicadas a una campaña, la respuesta del clásico, la regresión y un predictor aprendido, y las palancas que cada uno ignora |
| [06-design-response/02-a-burden-and-spacing-surface.ipynb](06-design-response/02-a-burden-and-spacing-surface.ipynb) | 2 | una superficie de bordo y espaciamiento de 7 por 7 para tres predictores, el exponente 1/6 de la dependencia clásica del volumen y la escalera de un conjunto de árboles |
| [06-design-response/03-learned-arms-served-live-from-a-portable-document.ipynb](06-design-response/03-learned-arms-served-live-from-a-portable-document.ipynb) | 4 | un archivo de modelos portable leído con el lector de referencia del motor, su dirección de contenido, sus fixtures y la paridad con un ajuste nuevo (afirmación BS-5) |

## Más allá del estado del arte

Las cinco afirmaciones del documento de diseño (`docs/design/SDD.md`, sección "Beyond the state of the art"), cada una demostrada por un cuaderno de nivel 4 en ambos idiomas:

| Afirmación | Qué afirma | Cuaderno |
|---|---|---|
| BS-1 | el protocolo con sitio fuera, intervalos con remuestreo de sitios y un criterio declarado antes de la ejecución y fijado por un hash | [04-benchmark-protocol/04-the-site-held-out-protocol-and-its-pre-declared-criterion](04-benchmark-protocol/04-the-site-held-out-protocol-and-its-pre-declared-criterion.ipynb) |
| BS-2 | la negativa como resultado de primera clase: geometría reconstruida o rechazada, y una guarda contra diseños que no son tiros | [01-the-data/03-integrity-gate-and-negative-controls](01-the-data/03-integrity-gate-and-negative-controls.ipynb) |
| BS-3 | la compuerta de integridad al cargar: los estadísticos impresos del artículo y un resumen fijado reproducidos en cada carga | [01-the-data/03-integrity-gate-and-negative-controls](01-the-data/03-integrity-gate-and-negative-controls.ipynb) |
| BS-4 | un factor de roca predicho desde el módulo sobre los otros sitios, de modo que el puntaje clásico no usa nada del sitio excluido | [02-classical-prediction/04-a-rock-factor-that-uses-nothing-from-the-target-site](02-classical-prediction/04-a-rock-factor-that-uses-nothing-from-the-target-site.ipynb) |
| BS-5 | predictores aprendidos exportados a documentos portables y evaluados en vivo en el navegador, con fixtures y una dirección de contenido | [06-design-response/03-learned-arms-served-live-from-a-portable-document](06-design-response/03-learned-arms-served-live-from-a-portable-document.ipynb) |
