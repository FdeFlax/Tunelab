## page-01

S EOREAS
PROYECTO: ccns97-scc>á'7 de 1.1", de
TÚNEL DE VIENTO POLIVALENTE - MANUAL DE USUARIO
UNIVERSIDAD DE ALICANTE
J.M. Terrés-NícoIi
en Ingeniería del Viento (Western
Dr. Ingeniero de Caminos, Canales y Puertos (UGR), Ma
Universi
Profesor de Ingeniera e
Caminos (UGR)
C. Mans
as. ETS Ingenieros de
nálisis Avanzado de Estru
Dr. Ingeniero Civil (UGR): Máster en Ingeniería del Viento (Western Un sity)
• C A t' ADA
de Granada
Oritía & Boreas is OFFICIAL TECHNOLOGICAL PARTNER with Western University,
Canada Boundary Layer Wind Tunnel Laboratory

---

## page-02

Preparado por:
Oritia & Boreas Wind Engineering
Avda. Serrezuela 14
18130 ESCUZAR - GRANADA - ESPAÑA
TI +34 958 109 494 T2 +958 715 529 F +34 958 715 529
urt: 'MMw.oritiayboreas.com email: info@oritiayboreas.com
EI material producido por Oritia & Boreas se prepara para satisfacer un objetivo
particular del Cliente recogido en el contrato correspondiente y se basa en el alcance,
condiciones y limitaciones que en el mismo se establezcan. La información y/o los
informes preparados por Oritia & Boreas pueden no ser de utilización en otros
contratos distintos al original. Ninguna parte que no sea el Cliente puede hacer uso de
los mismos sin la autorización previa y por escrito de Oritia & Boreas.
La información y/o los informes que la contienen, preparados por Oritia & Boreas no
puede ser reproducidos, presentados o revisados si no es en su totalidad. Antes de
distribuir los mismos a terceras partes el Cliente informará a las mismas de los
objetivos y alcance del total de los trabajos en los que se desarrollaron tales informes
así como de las limitaciones, condiciones y cualquier otra información relevante de
aplicación para la utilización de los informes citados. Oritia & Boreas no se hace
responsable de que la información producida por ella no sea de aplicación a la
satisfacción de los objetivos perseguidos por terceras partes que, bajo las anteriores
condiciones, hagan utilización de información generada por la empresa.
esoatf
Ced}litaüon
BUREAU VERITAS
Certificatioa
7828
1826
a.
Oritia & Boreas, SL opera bajo un sistema de calidad y medioambiental que ha
sido auditado por Bureau Veritas y encontrado conforme a los requerimientos de
las normas 'SO 9001:2015 e ISO 14001:2015 con números de certificados
ES088615-1 y ES088613-1. respectivamente, con fechas de aprobación original
05/03/2015 y que son de aplicación a la consultoría avanzada de aerodinámica y
de los efectos del viento en sistemas industriales singulares y deportivos y áreas
afines, a! análisis estructural avanzado y al diseño y desarrollo de control y
monitorización estructural ambiental. Este documento se ha producido de acuerdo
con los requerimientos del citado sistema de calidad
o,
primera Versióñ
s
ea zaq
ro acl
URCO'. y construcc-c,') Türyel de oolvalenre en la Universidad de Alcante.

---

## page-03

ÍNDICE
1. CONSIDERACIONES PREVIAS..
1.1 OBJETO....
1.2 IMPORTANCIA DEL MANUAL.....
1.3 USUARIOS DEL TÚNEL DE VIENTO.....
1.4 INFORMACIÓN IMPORTANTE DE SEGURIDAD......
2. DESCRIPCIÓN GENERAL..
TIPOLOGÍA DE TÚNEL DE VIENTO..........
2.1
2.1
2.1.2
2.1.3
2.2
2.3
Velocidad de ensayo.........
Sección de ensayo....
Recirculación del aire.........
DESCRIPCIÓN DEL TÚNEL DE VIENTO.........
ELEMENTOS INTEGRANTES DEL TÚNEL DE VIENTO.........
2.3.1
2.3.2
2.3.3
2.3.4
2.3.5
2.3.6
Embocadura o entrada - Elemento 1
Cámara de Estabilización o remanso - Elemento 2........
Contracción - Elemento 3.....
Sección de Ensayo - Elemento
Difusor-Adaptador de Sección cuadrada a circular- Elemento 5 ..10
ÍNDICE
3
5
5
8
8
. 10
.. ...10
. 10
10
Brida de Conexión - Elemento 6..
(JALO? Suministro y construcción de un Túnel de Viento poliva\ente en la Universidad de Alicante.
UAI-o; 12 M02 14/10/2025
ORITIA & BOREA

---

## page-04

3.5 PARADA DE EMERGENCIA.............
3.6 MEDICIÓN DE LA VELOCIDAD......
4. MANTENIMIENTO. ..
2.3.7 Turbomáquina - Elemento 7... ..
3. PUESTA EN MARCHA DEL TÚNEL DE VIENTO.
3.1 CONSIDERACIONES PREVIAS.....
..... ..... ..... ..... ....... 12
3.2 REQUERIMIENTOS INFORMÁTICOS.......
3.3 SOFTWARE DE CONTROL DEL TÚNEL DE VIENTO...........
3.3.1
Interfaz principal..........
3.3.2
Procedimiento de Uso del Software................ .
3.4 CONTROL DEL VARIADOR DE FRECUENCIA......
.................21
... ..... ..... ... 23
.. ..... ... 30
3.4.1
3.4.2
3.4.3
3.4.4
3.4.5
3.4.6
4.1
4.2
4.3
4.4
4.5
4.6
4.7
31
INSPECCIONES GENERALES............................................................... 31
VARIADOR DE FRECUENCIA Y SISTEMA 32
TURBOMÁQUINA............
SISTEMA DE MEDIDA.........
RECOMENDACIONES
. 11
.12
. ...12
........13
.......15
. 19
Utilización del teclado del variador de frecuencia..................
. 20
Parámetros básicos....................
Parámetros extendidos.......... .... ..
Parámetros avanzados.............
............................27
Parámetros de sólo lectura de estado del convertidor..............
.....28
Códigos de mensajes de alarma del variador de frecuencia .......29
. 30
...31
. 32
. 32
. 33
33
UALOI. Suministro y construcción de un Túnel de Vienro polivalente en la Universidad de Alicante.
UALOI L2 M02 re;01. 14/10:2025
S eaREAS

---

## page-05

I . CONSIDERACIONES PREVIAS
1.1 OBJETO
EI presente documento tiene como objetivo proporcionar al usuario del Túnel de viento
didáctico polivalente del laboratorio de la Universidad de Aicante (UA), especialmente en el
marco del Grado en Ingeniería Aeroespacial, una descripción general del equipo, incluyendo
su estructura, componentes, principios de funcionamiento, métodos de operación, medidas
de seguridad y procedimientos de mantenimiento.
1.2 IMPORTANCIA DEL MANUAL
Es fundamental seguir todas las recomendaciones incluidas en este manual. ya que tanto el
correcto funcionamiento como la durabilidad del Túnel de viento dependen del uso
adecuado y del cumplimiento riguroso de las instrucciones aquí detalladas.
EI incumplimiento o la falta de seguimiento y supervisión de estas indicaciones podrá derivar
en averías o desperfectos ajenos a la empresa instaladora.
1.3 USUARIOS DEL TÚNEL DE VIENTO
EI Túnel de viento deberá contar con una persona designada como responsable principal,
en adelante denominada Coordinador. EI Coordinador será eI encargado de garantizar el
correcto control del Túnel de viento, estableciendo los procedimientos y protocolos
necesarios antes y durante la puesta en marcha de las instalaciones.
Entre sus responsabilidades se incluyen el manejo del variador de frecuencia, la ejecución
de los ensayos y el aseguramiento de que todas las operaciones se realicen conforme a los
estándares de seguridad y calidad. Para ello, deberá contar con formación y experiencia
(JALO' Sunvryst'D y construccR5n de un Túnel de Viento poliva!en!e en la Universidad de Alicante.
1.2 14:'0/2025
ORmA & SOREAS

---

## page-06

adecuadas en técnicas experimentales de laboratorio. Asimismo, se le presuponen
conocimientos básicos en mecánica de fluidos, instalaciones eléctricas, medición y control
de instrumentos. EI Coordinador es el destinatario de referencia de las presentes
instrucciones.
EI Coordinador podrá disponer de personal de apoyo que disponga de la formación
necesaria para las tareas asignadas, definiéndose en este caso la figura del Controlador. EI
Controlador estará habilitado para eI uso, configuración, mantenimiento y ajustes del Túnel
de viento, según las indicaciones del Coordinador.
Asimismo, el Coordinador será responsable de ta habilitación y supervisión del personal
designado como Operador, quien estará autorizado únicamente para realizar ensayos dentro
de los parámetros establecidos por este. EI Coordinador deberá identificar y garantizar la
capacitación técnica de cada Operador.
Ningún Controlador podrá habilitar a nuevos Operadores; esta autoridad corresponde
exclusivamente al Coordinador.
Para garantizar la seguridad y el correcto funcionamiento del sistema, no se permitirá la
operación del Túnel de viento sin la presencia en la sala de, al menos, un Operador
autorizado a ello. Se recomienda mantener un registro de uso, donde se consignen la
finalidad del ensayo, la fecha, la hora, las incidencias y la conformidad del uso. Dicho registro
deberá permanecer bajo la custodia del Coordinador, siendo responsabilidad de cada
Operador o Controlador completarlo tras cada sesión.
Finalmente, se indica en la Tabla 1 la relación de personas designadas para el control y
mantenimiento del Túnel de viento, incluyendo Coordinadores, Controladores y Operadores.
TÚNEL DE VIENTO POLIVALENTE
UNIVERSIDAD DE ALICANTE
REGISTRO UNIFICADO DE USUARIOS. REV.OI . Mod. O&B. UAL01/14102025
Nombre
Coordinador
Responsable Túnel de
viento
Controlador 1
Controlador 2
Fecha habilitación
UALOI. Suministro y construcción de un Túnel de Viento oolivalen!e en la Universidad de Alicante.
UALOI 12 ',402 re.01, 14/10/2025
a
ORITIA BOBEAS

---

## page-07

Operador 1
Operador 2
Operador 3
Tabla 1 . Coordinador. Controladores y Operadores del Túnel de Vento.
1.4 INFORMACIÓN IMPORTANTE DE SEGURIDAD
EI túnel deberá ser operado exclusivamente por la persona designada como responsable,
quien deberá haber leído detenidamente el presente manual antes de proceder a su
utilización.
Se deberá prestar especial atención a tas zonas señalizadas con advertencias de seguridad
y respetar en todo momento las indicaciones relativas al manejo y mantenimiento del equipo.
La manipulación de objetos o instrumentos queda restringida exclusivamente a la sección
de ensayo, que ha sido diseñada específicamente para la colocación de modelos y equipos
de medida. EI resto de módulos del Túnel de viento (Embocadura, Cámara de Estabilización,
Contracción, Difusor - Adaptador de Sección, Brida de Conexión y Turbomáquina) no deben
ser manipulados ni utilizados para introducir ningún objeto o material, ya que forman parte
del sistema aerodinámico. Cualquier alteración en estas secciones puede comprometer el
rendimiento, la precisión de las mediciones y la seguridad de la instalación.
Se permite el uso de humo para la visualización de las líneas de flujo, siempre que se utilicen
dispositivos adecuados y que su aplicación se realice bajo supervisión de personal
autorizado.
UALOI. Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Alicante.
UALO' 12 IM02 rev01. 14/10/2025
a
ORITIA & BOBEAS

---

## page-08

2. DESCRIPCIÓN GENERAL
2.1 TIPOLOGÍA DE TÚNEL DE VIENTO
Un túnel de viento es una herramienta experimental que se emplea para estudiar los efectos
del flujo de aire sobre cuerpos sólidos u objetos.
Existen diferentes tipologías de túneles de viento; en este caso, se ha desarrollado un diseño
exclusivo de carácter híbrido, que combina un modelo de circuito abierto con la integración
del espacio circundante. Esta solución permite optimizar la recirculación del aire y aprovechar
eficientemente el espacio disponible, logrando una sección de ensayo de mayor dimensión
y un flujo más estable.
EI resultado es un rendimiento aerodinámico mejorado, que garantiza condiciones óptimas
para demostraciones, ensayos experimentales y actividades docentes.
2.1.1 Velocidad de ensayo
EI Túnel de viento ha sido diseñado para su uso en los ámbitos de la ingeniería industrial,
civil, arquitectónica y aeroespacial. Con una velocidad máxima de ensayo de
aproximadamente 20 - 25 m/s, permite simular una amplia gama de condiciones de flujo.
Esta capacidad facilita la realización de demostraciones de los principios fundamentales de
la mecánica de fluidos y la aerodinámica, así como ensayos aplicados a distintos campos
de la ingeniería.
Esta velocidad es ideal para las necesidades educativas y experimentales del proyecto,
cubriendo de manera óptima los requisitos para diversas aplicaciones en ingeniería.
UAI-OI. Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Alicante
UAIOI 12 102 14/10/2025
ORITIA & BOREAS

---

## page-09

2.1.2 Sección de ensayo
Esta configuración híbrida proporciona un flujo más homogéneo y estable dentro de la
sección de ensayo, minimizando las fluctuaciones que podrían afectar a la precisión de las
mediciones y experimentos. De este modo, se mejora la eficiencia operativa y se amplía la
versatilidad del túnel, permitiendo realizar una gran variedad de demostraciones y estudios
aplicados en condiciones controladas.
2.1 Recirculación del aire
La recirculación del aire se ha logrado aprovechando el volumen y disposición de la sala
donde se instala el Túnel de viento. Esta configuración permite:
Incrementar la eficiencia del circuito de recirculación.
Obtener un flujo de aire homogéneo y estable.
• Facilitar la adaptación del flujo, mejorándolo y adecuándolo según diferentes
objetivos.
Ampliar las modalidades de ensayo disponibles.
2.2 DESCRIPCIÓN DEL TÚNEL DE VIENTO
EI Túnel de viento está construido principalmente en madera, utilizando distintos tipos según
la forma y función aerodinámica de cada componente. Se exceptúan de este material el
Difusor - Adaptador de Sección cuadrada a circular, fabricado en acero galvanizado; la Brida
de Conexión, la Turbomáquina y el panel honeycomb, un elemento especialmente diseñado
en el ámbito aeronáutico que se emplea para laminar el flujo de aire y eliminar turbulencias
residuales, garantizando una corriente uniforme y estable en la Sección de Ensayo.
EI conjunto está soportado por una estructura metálica de acero estructural que proporciona
rigidez, estabilidad y una alineación precisa del túnel, garantizando la correcta estabilidad y
funcionamiento del sistema. En la zona donde se apoya la Turbomáquina se han incorporado
amortiguadores, que absorben las vibraciones generadas durante su funcionamiento,
evitando que se transmitan al resto del túnel.
2.3 ELEMENTOS INTEGRANTES DEL TÚNEL DE VIENTO
Los elementos del túnel son aquellos que conforman el mismo y que se disponen para
conseguir un flujo adecuado a los requerimientos en la Sección de Ensayo.
La línea aerodinámica del Túnel de viento y los elementos que 10 constituyen son:
1.
2.
3.
4.
5.
6.
7.
Embocadura
Cámara de Estabilización o remanso
Contracción
Sección de Ensayo
Difusor - Adaptador de Sección cuadrada a circular
Brida de Conexión
Turbomáquina
UALOI. Surmnistro y construcc$ón de un Túnel de Viento polivalente en la Unrversidad de Alicante.
UALOI 12 1.402 te,.01. '4/10/2025
ORITIA BOBEAS

---

## page-10

2.3.1 Embocadura o entrada - Elemento 1
La Embocadura constituye la entrada inicial del Túnel de viento, donde el aire se incorpora
al sistema y se canaliza hacia el resto del Túnel de viento. EI perímetro de esta sección está
optimizado mediante curvas de entrada diseñadas para maximizar el rendimiento
aerodinámico, especialmente en relación con la proximidad a la pared en la zona de
admisiÓn. Estas curvas están fabricadas con un perfil cuidadosamente diseñado para
minimizar turbulencias y guiar el flujo de aire de manera uniforme, reduciendo al máximo
cualquier perturbación.
2.3.2 Cámara de Estabilización o remanso - Elemento 2
La Cámara de Estabilización está diseñada específicamente para homogeneizar y suavizar
el flujo de aire antes de que este ingrese a la Contracción. En su interior se encuentra el panel
honeycomb, un elemento formado por celdas hexagonales. Su función principal es laminar
eI aire y eliminar componentes transversales o turbulencias residuales que puedan haberse
generado en la Embocadura. De esta manera, se obtiene un flujo más uniforme y estable al
ingresar a la Contracción, mejorando la precisión de los ensayos y la eficiencia aerodinámica
de todo el túnel.
2.3.3 Contracción - Elemento 3
La Contracción consiste en una sección transversal decreciente, diseñada específicamente
para incrementar progresivamente la velocidad del flujo de aire. Su geometría presenta una
curva cuidadosamente optimizada para este Túnel de viento, diseñada para lograr una
aceleración controlada y uniforme del flujo, garantizando un tránsito eficiente hacia la Sección
de Ensayo y manteniendo un flujo de alta velocidad estable y homogéneo.
2.3.4 Sección de Ensayo - Elemento 4
La Sección de Ensayo se extiende, en la dirección del flujo de aire, desde el final de la
Contracción hasta el inicio del Difusor - Adaptador de Sección. La velocidad del aire en esta
zona alcanza aproximadamente 20 - 25 m/s.
La sección tiene forma cuadrada, con dimensiones de 0.6 m x 0.6 m y una longitud total de
1 .O m. En sus paredes se han instalado ventanas de policarbonato, especialmente diseñadas
para la observación directa de los ensayos, permitiendo un acceso visual claro y seguro
durante la ejecución de las pruebas.
Esta configuración garantiza un flujo uniforme y controlado en el área de ensayo, optimizando
tanto la precisión de las mediciones como la eficiencia de las demostraciones
experimentales.
2.3.5 Difusor - Adaptador de Sección cuadrada a circular - Elemento 5
EI Difusor - Adaptador constituye el elemento que conecta la Sección de Ensayo con la Brida
de Conexión y la Turbomáquina. Se trata de un único elemento que integra ambas funciones:
UALOI. Suministro y construcción de un lünel de Viento polivalente en la Universidad de Alicante.
UALOI 12 M02 tev01. 14/10/2025
10
ORITIA S BOBEAS

---

## page-11

actúa corno difusor del flujo y, a la vez, realiza la transición de geometría descie la sección
cuadrada de la Sección de Ensayo hasta la sección circular de la Turbomáquina.
Su diseño pernite incrennentar progresivamente el área de paso de! aire, reduciendo su
velocidad y evitando la separación del flujo en las paredes, 10 que minimiza las pérdidas de
carga y favorece una transición aerodinámicamente eficiente.
EI cuerpo presenta una geometría continua, que comienza con una forma troncopiramídal y
evoluciona gradualmente hacia una troncocónica. Esta configuración ha sido diseñada no
solo para optimizar el comportamiento aerodinámico, sino también para aprovechar al
máximo et espacio disponible en el laboratorio, integrando en un solo módulo compacto la
función de difusor y de adaptador de sección.
2.3.6 Brida de Conexión - Elemento 6
La Brida de Conexión desempeña un papel fundamental en la integridad estructural y
funcional del Túnel de viento, actuando como elemento de unión entre el Difusor - Adaptador
y la Turbomáquina.
Su función principal es amortiguar las vibraciones generadas por la Turbomáquina,
minimizando su transmisión al resto de la instalación y garantizando un funcionamiento
estable y continuo durante los ensayos.
Además, la Brida asegura la correcta alineación entre ambos componentes, de modo que el
flujo de aire continúa de forma uniforme y sin perturbaciones, preservando así la eficiencia
aerodinámica del sistema.
2.3.7 Turbomáquina - Elemento 7
La Turbomáquina es el componente encargado de generar el flujo de aire necesario para el
funcionamiento del Túnel de viento.
Está diseñada para proporcionar un caudal constante y regulable, garantizando que la
velocidad del flujo se mantenga dentro de los parámetros previstos para los ensayos dentro
de la Sección de Ensayo.
EI control de la Turbomáquina se realiza mediante un variador de frecuencia, 10 que permite
ajustar la velocidad del flujo de manera precisa y segura, adaptando el régimen de ensayo a
los requerimientos experimentales o educativos.
UALOI. Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Alicante.
UALOI [2 IM02 rev01. 14/10/2025
11
ORITIA & BOBEAS

---

## page-12

3. PUESTA EN MARCHA DEL TÚNEL DE VIENTO
3.1 CONSIDERACIONES PREVIAS
Antes de la puesta en marcha, el Coordinador deberá asegurarse de que:
1. En el interior del túnel no existe ningún tipo de elemento. Realizar una inspección
visual de la sección de ensayo.
2. EI túnel se encuentra limpio y libre de restos de suciedad y polvo.
3.
4.
5.
6.
7.
EI modelo de ensayo está correctamente montado y fijado de forma segura,
verificando que no existan piezas sueltas ni elementos susceptibles de ser aspirados
por la Turbomáquina.
Las puertas se encuentran perfectamente cerradas.
Las conexiones eléctricas y de comunicación son correctas.
EI botón de parada de emergencia está localizado y accesible.
Todo el personal cuenta con los equipos de protección individual (EPIs) requeridos.
Se recomienda especialmente el uso de gafas de protección, dado que pueden generarse
pequeñas partículas en suspensión durante la operación del túnel. No obstante, el riesgo de
irritación es bajo.
3.2 REQUERIMIENTOS INFORMÁTICOS
Para el correcto funcionamiento del sistema de control del Túnel de viento, es
disponer de los siguientes componentes instalados en el equipo de control:
Software de ejecución: MATLAB Runtime R2020b.
Este entorno permite ejecutar aplicaciones desarrolladas en MATLAB sin
necesidad de tener una licencia completa instalada.
¿RO,' y Oe Viento en la Unrversidad de Alicante.
'2 :eac,;
necesario
12
ORITIA & BOREAS

---

## page-13

Puede descargarse gratuitamente desde eI siguiente enlace oficial
http_sd/e_smalhw_0fks.ç.pm/pr_o_d_u_cWc_ompgJeMtnatJaOzr_un.time.htrnl
Durante la instalación. se deberá seleccionar la versión correspondiente al sistema operativo
del equipo.
3.3 SOFTWARE DE CONTROL DEL TÚNEL DE VIENTO
EI sistema dispone de una aplicación desarrollada en MATLAB para el control y adquisición
de datos del Túnel de viento.
Dicha aplicación permite gestionar de manera sencilla la puesta en marcha, la parada, y la
lectura de la velocidad del flujo de aire en la sección de ensayo, obtenida a partir del tubo de
Pitot instalado en dicha zona. Este sensor, junto con eI transductor de presión y el sistema
de adquisición de datos, permite determinar la velocidad del aire que circula por el túnel en
tiempo real.
Boro»
.eom
-a, marc.}n Ce vierü
de mlencia
Iriarmadón de conexión
Túnel de viento polivalente
Medida de la velocidad
10 %
Figura 1. Visualización de la interfaz.
Velocidad
Guardar:velocidad
Interfaz principal
3.3.1
La interfaz gráfica del programa está diseñada para ofrecer una visualización clara de los
parámetros principales del túnel.
Contiene los siguientes elementos:
• Indicador de potencia (%)
UALOI.
UALO 1
Muestra el porcentaje de potencia aplicada a la Turbomáquina, controlado
mediante el variador de frecuencia.
Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Alicante.
12 1402 tev01. 14/10/2025
13
ORITIA & 90REAS

---

## page-14

Botón "Encender Túnel"
Inicia el funcionamiento de la Turbomáquina con la potencia deseada. EI software
envía la señal de activación al variador de frecuencia, poniendo en marcha el motor
y comenzando a suministrar la potencia necesaria para generar el flujo de aire en el
túnel.
Botón "Aoagar Túnel"
Detiene el funcionamiento de la Turbomáquina de forma segura. EI sistema ordena
al variador de frecuencia reducir la frecuencia de salida, permitiendo una parada
controlada.
Información de conexión
Informa si el sistema de adquisición de datos (DAQ) está correctamente
conectado. En caso de fallo, se mostrará un aviso: "No se ha podido establecer la
conexión. Inténtelo de nuevo".
Botón "Iniciar medición velocidad"
Activa la medición de la velocidad del flujo de aire en la Sección de Ensayo. EI
valor registrado se muestra en el recuadro de lectura de Velocidad (m/s) en tiempo
real, permitiendo supervisar el flujo de aire y realizar registros precisos de las
condiciones de ensayo.
Botón "Detener medición velocidad"
Finaliza la actualización en tiempo real de la velocidad del aire. EI recuadro de
lectura deja de actualizarse hasta que se inicie nuevamente la medición.
Lectura de Velocidad (m/s)
Muestra la velocidad media instantánea del flujo de aire en la Sección de Ensayo,
expresada en metros por segundo (m/s). EI tubo de Pitot, instalado en la Sección
de Ensayo, detecta la presión diferencial generada por el flujo, y el transductor de
presión convierte dicha señal en una salida analógica. EI sistema de adquisición de
datos interpreta esta información y la transforma en valores de velocidad, que se
actualizan en tiempo real en la interfaz.
Botón "Guardar"
Permite almacenar las mediciones de velocidad en un archivo de formato Excel
(.xlsx), facilitando el registro y el análisis posterior de los datos experimentales.
UALOI. Suministro y construcción de un Túnel de Viento pohValente en la Universidad de Alicante.
UAIOI 12 M02_tei01. 14/10/2025
14
ORITIA & BOREAS

---

## page-15

3.3.2 Procedimiento de Uso del Software
para utilizar correctamente el Túnel de viento a través de la aplicación de control, se
recomienda seguir los pasos que se indican a continuación:
1.
2.
3.
Abrir la aplicación • Tunel_viento.exe"
Localizar y ejecutar el archivo "Tunel_viento.exe" en el equipo de control. Esta
aplicación ha sido compilada a partir del entorno MATLAB y requiere que el
sistema disponga del MATLAB Runtime R2020b instalado.
Al iniciarse, el programa carga automáticamente todas fas librerías y dependencias
necesarias y abre la ventana principal de control, funcionando de manera
completamente independiente de MATLAB. Durante este proceso de carga, la
aplicación puede tardar varios segundos; se debe esperar hasta que la ventana de
control esté completamente operativa antes de proceder con la selección de
porcentaje de potencia deseado.
a
Tunel_viento.exe
Figura 2. Ejecutable del Software de Control.
Definir el porcentaje de potencia
En el cuadro correspondiente, introducir el porcentaje de potencia deseado (por
ejemplo, 50%). Por defecto, el valor inicial es del 10%. Este porcentaje determina la
potencia que se aplicará a la Turbomáquina.
Puesta en marcha túnel de viento
Porcentaje de potencia
Ehçender Tunel)
10 %
Apagar Túnel
Figura 3. Porcentaje de Potencia.
Encender el Túnel de viento
Pulsar ei botón "Encender túnel". A continuación, se abrirá una ventana de
confirmación, solicitando validar el porcentaje de potencia introducido. Una vez
confirmado, et sistema envía la orden al variador de frecuencia, y la Turbomáquina
acelerará hasta alcanzar el régimen establecido.
IJALOI. Suministro y constajcción de un Túnel de Viento polivalente en la Universidad de Alicante.
UALOI 12 1402 tev01. 14/10/2025
BOBEAS
15

---

## page-16

Puesta en marche Túnel de 'fierito
Põtcentàib de potencia
Encender Tunel
Apagar Túnel
Figura 4. Encender Túnel de viento.
Pomentaje de potencia
Va a a acemar e: va"dor de fma»enda a tn 10 por *nto de
potenda rráxrna. ¿.D0M2a mothuar?.
Si
x
4
Figura 5. Ventana de confirmación de Potencia de la Turbomáquina.
Iniciar medición de velocidad (m/s)
Pulsar el botón "Iniciar medición velocidad". La interfaz mostrará en el recuadro
correspondiente la velocidad media instantánea del flujo de aire en la Sección de
Ensayo.
Nota: Antes de realizar cualquier medición, verificar que el flujo en la Sección de
Ensayo se encuentre estable, garantizando así la fiabilidad de los resultados.
de la velocidad
nicgarmedición velocidad
Parar medición velocidad
Velocidad
mars
Figura 6. Iniciar medición de la velocidad.
UALOf. Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Alicante.
UALOI [2 fM02 tev01. 14/10/2025
16
ORITIA S BOREAS

---

## page-17

Medida de ja velocidad
iniciar medición Vélocidad
Velocidad
Pararmedici6fWeiocida
mis
5,
6.
Figura 7. Visualización de la Velocidad (m/s).
Guardar los datos (opcional)
Pulsar "Guardar velocidad" para registrar el valor de la medición de la velocidad en
un archivo Excel (.xlsx). EI sistema generará automáticamente un nombre de
archivo con fecha y hora.
Medida de la velocidad
Iniciarmedición velocida
Wocidad
Parar mediciónvelocldad
mis,
Guardar velocidad!
Figura 8. Guardar velocidad (opcional).
Parar medición de velocidad
Una vez finalizada la toma de datos, pulsar "Parar medición velocidad" para
detener la actualización en tiempo real del recuadro de velocidad.
UALOI. Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Alicante.
UAIOI 12 1402 rev01. 14/10/2025
ORITIA POREAS
17

---

## page-18

Medida de la velocidad
Iniciar medición velocidad
Velocidad
*arahnedieÍónveiocidad.
mfs
Figura 9. Parar medición de velocidad.
7. A,oagar el túnel
Una vez finalizadas las pruebas, pulsar "Apagar túnel". La Turbomáquina reducirá
la velocidad hasta detenerse completamente.
desdentbg
Porcentaje de potencia, 10 "96
Encenderãúnel•
Apagar Túnel
Figura 10, Apagar Túnel de viento.
(JALOI. Surntnistro y construcción de un Túnel de Viento polivalente en la Universidad de Alicante.
12 fM02 14/10/20'25
18
ORITIA S BOBEAS

---

## page-19

3.4 CONTROL DEL VARIADOR DE FRECUENCIA
EI variador de frecuencia regula ta potencia suministrada a la Turbomáquina y, por tanto, la
velocidad del flujo de aire generado.
A continuación, se detallan las funciones básicas de los controles en el propio variador de
frecuencia:
t)
NAVEGADOR
SUBIR
BAJAR
RESET /
srop
INICIO
Utilizada para visualizar la Información en tiempo real,
acceder y salir del modo edición de parámetros y para
uardar cambios de rámetros.
Utilizada para aumentar la velocidad en tiempo real o para
incrementar los valores de los arámetros en modo edición.
Utilizada para reducir la velocidad en tiempo real o para
disminuir los valores de los parámetros en modo edición.
Utilizada para resetear un equipo en alarma.
Cuando está en modo teclado se utiliza para parar un equipo
en marcha.
Cuando está en modo teclado, se utiliza para
arrancar un equipo parado o para invertir la dirección
de rotación si el modo teclado bidireccional se ha habilitado.
Figura 11 . Detalle de las funciones de los botones del variador de frecuencia.
Durante la operación habitual del túnel, el control del variador de frecuencia se realiza
exclusivamente a través del software de control. No se recomienda realizar ajustes
manuales en el variador salvo en casos de pruebas específicas o tareas de mantenimiento,
para evitar desajustes o interrupciones en el flujo de aire.
UALOI.
UALOI
Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Alicante.
12 M02 te,01. 14/10/2025
ORITIA S BOREAS
19

---

## page-20

3.4.1 Utilización del teclado del variador de frecuencia
Pantallas de
operación
Modificando
Parámetros
Acceso a
parámetros de
solo lectura
Reseteando
parámetros
H SOSO
p 1,50
Variador
parado/
deshabilitado
Variador
habilitado/
marcha, se
muestra la
frecuencia de
salida (Hz)
presione la
Tecla de
navegación
por <1 seg. Ei
display
motraré la
corriente del
motor (A)
Preslone la
Tecla de
navegación
por seg. EI
(fisplay
motrará la
poténcia del
motor (kW)
Si ei P-IO > O.
SL-oP
9
P-OB
10
9
Pulsar y
mantener la
tecla
Navegador > 2
segundos
Utilizar las
teclas Subir y
Bajar para
seleccionar el
arámetro
deseado.
Presionar la
tecla
Navegador < 1
segundo
Modificar el
valor
utilizando las
teclas Subir y
Bajar
Presionar
Navegador < 1
segundo para
volver al menú
de parámetros
Presionar
Navegador > 2
segundos para
volver al
display de
operación
SEOP
p- 00
9
POO-O I
POO-OB
9
3-30
0
5L-oP
Pulsar y
mantener la
tecla
Navegador > 2
segundos
Utilizar las
teclas Subir y
Bajar para
seleccionar el
parámetro
Presionar la
tecla
Navegador < 1
segundo
Presionar la
tecla Subir y
Bajar para
seleccionar el
rámetro de
solo lectura
deseado
Presionar
Navegador < 1
segundo para
visualizar el
valor
Presionar y
mantener
Navegador > 2
segundos para
volver al
display de
operación
dEF
5L-oP
Para resetear
el valor de los
parámetros a
su ajuste por
defecto, pulsar
mantener tas
teclas Subir,
Bajar V Stop
> 2 segundos.
EI display
mostrará
Pulsar la tecla
Stop.
EI display
mostrará
op.t,
1500
Presione la
Tecla de
navegación
por <1 seg. EI
display
motrará la
velocidad del
motor (RPM)
Reseteando una
alarma
0-1
Skop
Figura 12. Operaciones del variador de frecuencia mediante el uso de los botones.
(JALO' Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Alicante.
(JALO' 12 14/10/2025
Pulsar la tecla
Stop.
EI display
mostrará
Se vuelve a
displav de
operación
20
ORITIA6 BOBEAS

---

## page-21

3 4.2 Parámetros básicos
Mínimo Máximo Fábrie Unidades
Frecuenda / Veloddad Máxima
soon son son Hz RPM
de salida o velocidad máxima del motor - Hz o rpm. Si P-ao e' valor introducido / mostrado será en
par.
Frecuenda Veloddad Mfnlma
p.01
Ht RPW
de salida 0 velocidad del motor - Hz o rpm. e' introducido / mostrado será en
Rampa de AEleración
Tiempo de rampa de aceleración de O Hz/ RPM a frecuencia nominal motor (P09) en se undos
de Deceleración
6000
Ram
Tiempo de rampa de deceleradón desde frecuencia nominal motor P09 hasta aro. en se undos. Cuando es 0.0. se a•usta en P-24.
seleción Modo Parada Respuestaa didaalimentad6n
selecciona el modo de paro del equipo, y et comportamiento en respuesta a una pérdida de suministro en funcionamiento.
En paro
Ajuste
Rampa a Paro (P-04)
Paro Libre
1
Rampa a Paro P•04
Ride Thro h (Recupera ener ía de la car a ara mantener operación)
Paro Libre
Deceleración rá ida con 'dida de suministro P-24 , ro libre si P.24 —O
p47
p.08
p_09
p.10
p-11
2
Rampa a Paro (P-04) con AC Flux Brakin
Deceleración rápida con érdida de suministro (P•24), paro libre si P.24 = O
3
O.
indor de
O: Deshabilitado
1: Habilitado. Cuando se habilita, se reduce la energra total consumida por el equipo y el motor reduciendo ei voltaje aplicado a'
motor cuando está a velocidad constante y con carga ligera. Es utilizado en aplicaciones donde el equipo puede funcionar por
algunos periodos de tiempo con cargas ligeras y a velocidad constante, sea la aplícación de par constante o variable.
Vose / BackEMFa veloddad nominal PM BLDC
.250/ oog 230,1400.
para motores de inducción, este parámetro se debe ajustar al valor de voltaje nomina' de la placa de características del motor.
para motores de Imanes Permanentes o Brushless DC, se deberá ajustar el valor de Back EMF a velocidad nominal.
Se ricaracteríStica de}E i
Comente 'e! Motor
Este rámetro se debe a'ustar al valor de corriente nominal de la placa de características del motor.
Â•5060
Motor.
-Hz
Este parámetro se debe ajustar al valor de la frecuencia nominal de la placa de características del motor.
VeEcdda4 Motor
O
TRPM
Este parámetro se puede configurar opcionalmente en RPM según la placa del motor. Cuando está por defecto a cero. todas los
parámetros dc veiocidades aparecerán en Hz y se desactiva la compensación de deslizamiento (la cual mantiene la velocidad de
motor a velocidad constante con independencia de la carga) del motor. Si se introduce el valor de RPM del motor se activa la
función de compensación de deslizamiento de este y se mostrará la velocidad del motor en las rpm estimadas. Todos los parámetros
de velocidades, como velocidad máxima y mínima, velocidades programables etc. aparecerán en RPM.
- Si el valor de P09 se modifica, eI valor de P•IO es reseteado a O.
0.0
Según Caran- S*in ü•ract
Refgeã3 corriente a baja frecuencia
Del
EI par a bajas frecuencias se puede mejorar aumentando este parámetro, sin embargo, un aumento elevado de este parámetro
puede provocar un aumento de la corriente del motor a baja velocidad o sobrecarga del motor. Consulta la sección 10.1
Este parámetro funciona con'untamente con P-51 (Modo Control Motor) como se muestra a continuación:
EI valor se ajusta automáticamente de acuerdo al autotune realizado
o
O
Refuerzo de P•ll x P-07. Este voltaje es aplicado a 0.0Hz, linealmente se reduce hasta P•09 / 2
todos Refuerzo de P-ll x P-07. Este voltaje es aplicado a 0.0Hz, linealmente se reduce hasta P-09 / 2
1
Nivel de refuerzo de corriente = 4*P-11
2, 3,4 todos
Para motores de inducción, cuando PSI = 0 0 1, una forma de encontrar un ajuste adecuado de forma fácil sería hadendo funcionar
et motor sin carga o muy ligera . aproximadamente 5 Hz, y ajustando P.ll hasta que la corriente del motor sea aproximadamente la
corriente de magnetización (si se conoce) o en el intervalo que se muestra a continuación:
Tamaño 1: 60 — 80% de la corriente nominal del motor.
Tamaño 2: SO — 60% de fa corriente nominal del motor.
Tamaño 3: 40— 50% de la corriente nominal det motor.
Tamaño 4: 35 — 45% de la corriente nominal del motor.
P-12 Seleed6nReMcdodeControI inci al
O: Control Terminal. EI equipo responde directamente a las señales aplicadas en los terminales de control.
1: Control unidireccional del tedado. EI equipo puede ser controlado sólo en avance utilizando teclado del equipo u opción teclado
remoto (Optiport Plus & OptiPad).
2: Control Bidireccional del teclado. EI equipo puede ser controlado en avance V retroceso utilizando teclado del equipo u opción
teclado remoto (Optiport Plus & OptiPad). EI cambio de sentido de rotación se efectúa pulsando la tecla START en el teclado.
3: Control Modbus. Control vía Modbus RTU (RS48S) utilizando las rampas intemas Aceleración / Deceleración.
4: Control Modbus con rampas. Control vía Modbus RTU (RS48S) ajuste rampas Aceleración / Deceleración vía Modbus.
5: Control Pi. Control PI con señal de realimentación externa.
6: Control analógico sumatorio Pl. Control PI con señal de realimentación sumando la realimentación externa y entrada analógica 1.
7: Control CAN open. Control vía CAN (RS485) utilizando las rampas internas Aceleración / Deceleración.
8: Control CAN open con rampas. Control vía CAN (RS485) ajuste rampas Aceleración / Deceleración vía CAN.
9: Modo esdavo. Control vía convertidor Invertek en modo maestro. Dirección de la unidad Esclavo debe ser> 1.
Cuando P•12 = 1, 2.3, 4, 7, 8 0 9, la señal de habilitación se debe proporcionar en los terminales de control, entrada digital 1.
UALOI. Sotntnis:ro y de un Túnel de Viento polivalente en ia Universidad de Alcante.
12
21
ORITIA S BOREAS

---

## page-22

Selección del Modo de O d6n
proporciona un ajuste rápido para confleurar los parámetros principales de acuerdo con la aplicatión deseada, parámetro'.
aju;tados según la siguiente tabla.
O: Modo Industrial. Destinado a aplicaciones de uso general
1: Modo Bomba. Destinado a aplicaciones de bombas centrifugas
2: Modo Ventllador. Destinado a aplicaciones de ventilación
Característica de par (P-28 & P-29)
Aplicación Limite Corriente (P-54)
param.
General
Bomba
Ventilador
150%
110%
110%
Constante
Variable
Variable
Enganehe a! (P-33)
O : Off
2 : On
p-14 C6d' o de acceso Menú extendidoV Avanzado
65535
permite el acceso a grupo de parámetros extendidos y avanzados. EI código de acceso se debe ajustar en P-37 (por defecto: 101) y
permite ver y ajustar parámetros extendidos. EI valor ajustado en P-37 e incrementado en +100 nos permite ver y ajustar los
parámetros avanzados.
UALOI Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Ahcante.
UALOI [2 1,402 te•.01. 14/10/2025
ORITIA 6 BOBEAS
22

---

## page-23

3.4.3 Parámetros extendidos
cripdón
p-15 selección Función de Entradas Digitales
la función de las entradas digitales dependiendo del modo de control seleccionado en P.i2. Para ampliación de
ver sección 7; configuración macro entrada analógica y digital.
p-16 Entrada analógica a Formato de señal
Vea aba
U 10 señal o a 10 V (Unipolar). la frecuencia de salida será la ajustada en P.02 (Frecuencia/velocidad minima) si la referenda
analógica aplicada es = «0,0%. EI 100% de la señal significa que la frecuencia/velocidad de salida seré la del valor P-OI.
b 0- 10 = señal O a 10 V (Unipolar), operación bidireccional. EI motor puede funcionar en avance o retroceso únicamente
modificando ei valor de la entrada analógica 1. EI motor girará en sentido inverso de rotación si la referencia analógica después de la
escala y ei offset que se aplican es Por ejemplo para e' control bidireccional de una señal O • 10 V donde ei punto de inflexión
entre avance o retroceso sea e' 50% de la referencia analógica, ajuste P•3S = 200.096, P-39 = 50.096.
R 0-?0 = señal Oa 20mA-
= señal 4 a 20mA, Optidrive entra en modo fallo y muestra el código si el nivel de la señal cae por debajo de 3 mA
q-?O señal 4 a 20mA, Optidrive funcionará a velocidad programada 1 (P-20) si el nivel de la señal cae por debajo de 3 mA.
?D-q señal 20 a 4mA, Optidrive entra en modo fallo y muestra el código H-?OF si el nivel de la señal cae por debajo de 3 mA
= Señal 20 a 4mA, Optidrive funcionará a velocidad programada 1 (P-20) sí el nivel de la señal cae por debajo de 3 mA.
U = Señal 10 a O V (Unipolar). la frecuencia de salida será la ajustada en P-()l (Frecuencia/vefocldad máxima) si la referencia
analó ica aplicada es = «0,0%.
p-17 Máxima
kHz
Establece la frecuencia máxima de conmutación del equipo. SI visualizamos e' mensaje ' "-Ed t' en el ajuste de este parámetro y en
e! caso de que la temperatura del radiador del equipo sea excesiva, la frecuencia de conmutación será reducida de forma
automática, udiendc visualizar el nuevo valor en POO-
p.18 "e salida del relé
selecciona función asignada a la salida de relé. EI relé tiene dos terminales de salida, ON indica que el relé está activo, y por 10
tanto los termiaaies 1C y 11 se conectan o cortocircuitan.
O: Conveddcr ON cuando el motor está habilitado.
1: Cnnved4cr OZ. ON cuando se aplica alimentación al equipo y no hay ningún fallo.
2: Motor a ON cuando la frecuencia de salida coincide con la frecuencia de ajuste o consigna.
3: Alarma ON cuando el equipo está en fallo.
4: frecuentis de s*ida Lfmite. ON cuando la frecuencia de salida excede el límite ajustable fijado en P-19.
S: Corriente salSd2 Límite. ON cuando la corriente del motor excede el límite ajustable fijado en P-19.
6: Frea'ent.iõ Se salida < Límite. ON cuando la frecuencia de salida está por debajo del límite establecido ajustable en P-19.
7: Cordeme de "Sida < Urnite. ON cuando la corriente del motor es inferior al límite ajustable fijado en P-19.
8: Entrada analógica 2 LSmite. ON cuando la señal aplicada a la entrada analógica 2 excede el límite ajustable fijado en P-19
9: Equipo ustc para funcionar. ON cuando el equipo está con alimentación ininterrumpida, habilitado no hay nin ún fallo.
p-19
p-20
p-21
P-24
Nivel de '*elé
Ntve: d? adivacién ajustable utilizando la configuración de P-18 entre 4 y 8.
1 programada
Freagentiã 2 p ramada
i vei"dad 3 programada
Í 4 programada
0.0
0-01
-P-OI
• • -p-01
-p-Ol
200.0
P-OI
p-01
p-01
P-OI
1000 ' ' - _ '
5.0
25.0
40.0
P-09
Hz/ RPM
Hz/ RPM
Hz / RPM
Hz/ RPM
Frecuenciaswe;ocâdades seleccionadas por entradas digitales en función del ajuste de P-15
Si P-IO = O, jos -valores se ajustan en Hz. Si P-IO> O, los valores se introducen en RPM.
Cambiando el valor de P-09 se restablecerá todos los valores a los ajustes predeterminados de fábrica.
Nota
Segundá deztzadón. Tiempo de ra a {Paro rápido
600
Este parámetro permite Ja configuración de una segunda rampa de deceleración alternativa, que puede ser seleccionada por
entradas digitales (dependiendo de la configuración de P-15) o de forma automática en el caso de una pérdida del suministro
principal de alimentación P-05 = 2 0 3. Cuando se establece en 0.0s, el equipo para libre al activarse la segunda deceleración.
Cuando utilizamos mediante la configuración del P-15 una parada rápida, este tiempo de rampa es utilizado también.
Además, si P-24>O, P-02>O, P-26=O y P-27=P-02, este tiempo de rampa se aplica tanto a la aceleración como a la deceleración,
cuando trabajamos por debajo de la velocidad mínima. Esto puede ser útil para ciertas aplicaciones de bombas y compresores.
UALOI. Surnjnistro y construcción de un Túnel de Vento polivalente en la Universidad de Alicante.
UALOI 12 1,402 teg01. 14/10/2025
23
ORITIA S BOBEAS

---

## page-24

de analógica
, O: habilitado. ON cuando ei motor está habilitado.
Mínimo Máximo
11
Fábrica
1: convertidor OK ON cuando se aplica alimentación al equipo y no hay ningún fallo.
2: Motor a velocidad. ON cuando la frecuencia de salida coincide con la frecuencia de ajuste o consigna.
3: Alarma convertidor. ON cuando el equipo esté en fallo.
a: Frecuencia de salida Lfm'te. ON cuando la frecuencia de salida excede el límite ajustable fijado en P-19.
S: corriente de salida Lfmlte. ON cuando la corriente del motor excede el limite ajustable fijado en P-19.
8: Frecuenda de salida (Veloddzd de motor). O a P-OI, resolución 0.1Hz
9: Corriente de salida (Motor). O a 200% de P-08, resolución 0.1A
10: Potencia de sailda. O a 200% de la potencia del equipo.
11: Par Motor (Intensidad) O a20C% de P•08, resolución 0.1A
p-26 Banda de Histéresis Sa:tc
p-27 Punto central Salto &
0.0
0.0
Unidades
Hz / RPM
0.0
función de salto de frecuencia se usa para evitar ei funcionamiento a ciertas frecuencias de salida, por ejemplo una frecuencia
Hz / RPM
que produce una resonancia mecánica en una máquina en particular. EI parámetro P-27 define ei punto central de la banda de salto
de frecuencia y se usa en conjunción con P-26. Si la referencia aplicada al equipo está dentro de la banda, éste no mantendrá la
frecuencia de salida dentvo de la banda definida Y ejecutará las rampas definidas en y P-04 para salir y mantenerse en ei límite
P-28 Características V/F W,oste Voiia)e
P-29 Características WF frecuencia
p-07
Este parámetro ajusta un punto de frecuencia, en ei cual ei equipo aplica al motor ei voltaje ajustado en P-28. De esta forma se
Hz
puede personalizar una curva de dos tramos v/f con diferentes pendientes. se debe observar la temperatura del motor ya que este
parámetro podría provocar sobrecalentamiento e incluso daño en este, de no ser adecuados tos valores a•ustados.
p-30 Modo puesta era ze}aicio automática, Funcionamiento Modo Fuego
índice 1 : Modo uesta *Garcha reinido automático
NIA
selecciona si ei equipo debe ponerse en marcha automáticamente cuando la entrada de habilitación se encuentra cerrada y activa
en el momento de dar alimentación a éste. También configura la función de reinicio automático.
Ed9E-r : Después de alimentar o resetear ei equipo después de un fallo, este no se pondrá en marcha aun estando la entrada digital
1 cerrada. La entrada digital debe cerrarse después de alimentarse o resetearse el equipo para que la marcha tenga efecto.
RLlka-O : Después de alimentar o resetear el equipo , el equipo arrancará automáticamente si la entrada digital 1 esté cerrada.
RLJEa- I a RL/ka-S : Después de que el equipo entre en fallo, este ejecutará de 1 a 5 intentos ( ajustable como ROEo-n) para
reiniciarse en intervalos de 20 segundos. EI número de intentos se acumula en contador interno, y si el equipo se bloquea en el
último intento, este mostrará el fallo, y requerirá que el usuario 10 resetee manualmente. Para resetear el contador antes del reset
manual, el equipo tiene que ser apagado.
de entrada en Modo F o
Define ia lógica de funcionamiento cuando se selecciona un ajuste de P-15, que incluye el modo fuego, por ejemplo, 15, 16 & 17.
O: Normalmente Cerrado (NC). Modo fuego se activa cuando la entrada está abierta.
1: Normalmente Abierto (NO). Modo fuego se activa cuando la entrada está cerrada.
ndice3 ode entrada en Modo
Define la lógica de funcionamiento cuando se usa un ajuste de P-15, que incluye el modo fuego, por ejemplo, 15, 16 & 17.
O: Entrada Mantenida. EI variador permanecerá en modo fuego, mientras la señal se mantenga, ya sea NO o NC
1: Entrada Momentánea. EI variador permanecerá en modo fuego, siempre que reciba un pulso de la señal, ya sea NO o NC. Se
desactivará cuando deshabilitemos o apaguemos el convertidor
P-31 Selección Modo Arranque teclado
Este parámetro está activo sólo cuando se selecciona control por teclado (P-12 = 1 0 2) o modo Modbus (P-12 = 3 0 4) Cuando se
ajusta P-31 a 0,1, 4 0 S. el teclado de marcha y paro en frontal del equipo queda activado y los terminales externos 1 y 2 deben
estar cerrados para permitir marcha desde éste. Si se ajusta a 2, 3.6 0 7, el teclado de marcha y paro en frontal del equipo queda
desactivado y los terminales externos 1 Y 2 permiten la puesta en marcha del equipo.
O: Velocidad mínima, marcha por tedado.
2: Velocidad mínima, marcha por terminales.
4: Velocidad actual, marcha por teclado.
6: Velocidad actual, marcha por terminales.
P-32 índice 1 : Duración
índice 2 : Modo Inyección DC
1: Velocidad anterior, marcha por teclado.
3: Velocidad anterior, marcha por terminales.
5: Velocidad programada 4, marcha por teclado.
7: Velocidad programada 4, marcha por terminales.
índice 1: Define el tiem o durante ei cual se inyecta una corriente DC en el motor. EI nivel de inyección uede ser a•ustado en P-59.
ndice 2 : Configura la función de inyección DC de la siguiente forma:
O: inyección DC al parar. Se inyecta una corriente DC de nivel ajustado en P-59 después que la frecuencia de salida ha alcanzado
0.0Hz tras una orden de parada y durante el tiempo establecido en el índice 1. Con ello se intenta asegurar que el motor queda
detenido antes de que el equipo pase a modo SEOP.
Nota
• Si la unidad está en modo 5ERndbS antes de desactivarlo, la inyección DC es desactivada.
1: Inyección DC en puesta en marcha. Se inyecta una corriente DC de nivel ajustado en P-59 antes de que la salida de frecuencia se
incremente justo en el momento de poner en marcha el equipo V durante el tiempo establecido en el índice 1. De utilidad para
garantizar que el motor está detenido antes de iniciar la rampa de aceleración.
2: In ección DC en puesta en marcha & aro. Se inyecta una corriente DC se ún ajustes 0 1.
UALOI. Suministro y construcc;ón de un Túnel de Vento polivalente en la Universidad de Alicante.
(JALO' 12 1,402 tev01. 14,'10/'2025
ORITIA S BOBEAS
24

---

## page-25

par.
p.33
p-34
P-35
e-36
Descri ci6n
Enganche al vuelo
O: Deshabilitado.
Minimo M4*fmo Fábrfa Unidades
t: Hab"ltado. Cuando se habilita, el equlpo Intentará, al acttvar la marcha, determinar si e' motor esté girando, y comenzará a
controlar el motor desde su velocldad actual. Se puede observar un pequeño retraso al arrancar motores que no están glrando.
2: ués de fallo, rdlda de suministro eléctrico, o aro libre. Sólo activo en anche al welo en 105 casos descritos.
Habilitación unidad defrenada nod ible entamaño
O: Deshabilitado.
1: Habilitado con protección por Software. Habilita la unidad de frenada interna con protección por software para una resistencla
de 200W en continuo.
2: Habilitado sln protectlón por Software. Habilita la unidad de frenada Interna sin protección por software. Es necesario utilizar un
elemento de protección térmica exterior.
3: Habilitado por evento, con protección por Software. Como e! ajuste 1, sin embargo, la unidad de frenada sólo se activa durante
un cambio de la consigna de frecuencia, y se desactiva durante el funcionamiento a velocidad constante.
4: Habilitado por evento, sin protecdón por Software. Como el ajuste 2, sin embargo, la unidad de frenada sólo se activa durante
un cambio de la consi na de frecuencia, Y se desactiva durante el funcionamiento a velocidad constante.
Escalado Entrada Analógia 17 Esealado Velocidad esclavo
2000.0
ioo,o
Escalado entrada analógica 1. EI nivel de entrada analógica 1 se multiplica por este factor, EJ.: sl P.16 es ajustado para señal 0— IOV
y el factor de escalado es ajustado a 200.0%, 5V de entrada serán suficientes para funcionar a máxima velocidad [frecuencia (P-OI).
Esalado Velocidad Esclavo. Cuando se opera en modo esclavo (P-12 = 9), la velocidad de funcionamiento del equipo será la
velocidad del Maestro multiplicada por este factor, limitada por la velocidad mfnima máxima.
Confi ración de Comuniaeión Serie
índice 1: Direcd6n de Esdavo
Indice Z: Velocidad en baudios
9.6
ndice 3: Protección de pérdida de comunicación.
Ver aba
63
1000
3000
1
115.2
t 3000
Este parámetro tiene tres sub-ajustes que permiten configurar ia comunicación Modbus RTU. Son los siguientes:
Ir : Esdavo: Ran o : 0— 63, or defecto: 1
2" índice: Velocidad en baudios: Ajuste de la velocidad de transmisión y protocolo para el puerto de comunicación RS485 Interno.
Para Modbus RTU: Velocidades disponibles en Baudios 9.6, 19.2, 38.4, 57.6, 115.2, Kbps
Para CANo n : Velocidades dis nibles en Baudios 125, 250, 500 1.000 K s
3r fndice: Tiempo pérdida comunicación; Define el tiempo durante el cual el equipo funcionará aun no recibiendo un telegrama de
comando válido en Registro 1 (Palabra de control del Equipo) una vez que la unidad ha sido habilitada. Si se configura a O se
desactiva la supervisión. Si se configura un valor de 30, 100, 1000, 0 3000, se define eI limite de tiempo en milisegundos para ta
operación. Un sufijo'E ' selecciona bloqueo det equipo en caso de pérdida de comunicación. Un sufijo 'r' selecciona que el equipo se
9-37
9-38
parará con rampa libre (salida inmediatamente desactivada), pero no se bloqueará.
deaEeso
9999
"401
Define el código de acceso que se debe introducir en P-14 raacceder a los arámetros extendidos.
Blogueo de Acceso a
O: Desbloqueado. Todos los parámetros son accesibles y se pueden cambiar.
I: Bioqueado. Los valores de los parámetros se pueden visualizar pero no se pueden cambiar.
Envadaana inloffset
o •;íñ-z. 0
4500.0
Ajusta un offset, como porcentaje del rango del fondo de escala de la entrada, que es aplicado a la señal de entrada analógica. Este
parámetro opera en conjunción con P-35, y eI valor resultante puede ser visualizado en POO-OI.
EI valor resultante se define como un porcentaje, de acuerdo a la siguiente fórmula:- POO-OI = ( nivel señal aplicada(%) - P.39) x P-35
ndice 1 : Factor de esala
índice 2 : Parámetro a escalar
0.000
16.000
0.000
Permite al usuario programar eI Optidrive para mostrar diferentes unidades de salida una vez escaladas a partir de la salida de
frecuencia (Hz , Velocidad de Motor (RPM) o el nivel de señal de realimentación PI cuando opera en modo PI.
ndice I: Se utiliza ara a star eI multi licador de escala. EI valor del rámetro a escalar se multi lica reste factor.
Índice 2: Define eI parámetro a escalar de la siguiente manera: -
O: Velocidad de motor. EI escalado se aplica a la frecuencia de salida sí P-IO = O, o RPM del motor si P-IO> O.
I: Corriente del motor. EI escalado se aplica al valor de corriente del motor (Amps).
2: Señal Entrada analógica 2. La escala se aplica a la señal de la entrada analógica 2, representada internamente como 0-100,0%.
3: Realimentación Pl. EI escalado se aplica a la realimentación PI seleccionado por P-46, re resentada internamente como
Gananda porciona PJ
0.0
30.0
Ganancia proporcionat del controlador Pl. Valores altos provocan cambios grandes en la frecuencia de salida del equipo en
respuesta a pequeños cambios en la señal de realimentación. Un valor m elevado uede causar inestabilidad.
P42
p-43
P44
p.45
IJALOI
Tiempo integral PI
0.0
30.0
Tiempo inte ral del controlador Pi. Valores altos provocan una respuesta amortiguada para procesos ue responden con lentitud.
Modo operación PI
O: Directo. Utilizar este modo si al incrementar la velocidad del motor se incrementa la señal de realimentación.
1: Inverso. Utilizar este modo si al incrementar la velocidad del motor dismin e la señal de realimentación
Selección de la fuente de la señal de Referen Se
Selecciona la fuente para ei ajuste de referencia PI / Setpoint
O: Ajuste Setpoint Digital. Ajustar en P-4S.
1: Ajuste Setpoint entrada analógica I. Nivel de señal Analógica I, visualizable en POO-OI.
intd italPl
1100.0
Cuando P-44 = O, este parámetro ajusta la referencia (setpoint) digital utilizada por el controlador PI como un % del rango de la señal
Suministro y construcción de on Túnel de Viento poltva!ente en la Universidad de Ahcante.
12 t.402 te.01 '4/10/2025
25
ORITIA 6 BOREAS

---

## page-26

par.
p.46
Descri ión
Selección de la fuente de realimentación PI
M'nimo
M'xlm6
Unidades
Selecciona la fucntc de la señal de realimentación utilizado por e' controlador PI,
O: Entrada Analógica 2 (Termlnal 4). O — 10056. Ntvel visuallzab'e en POO•02.
1: Entrada Analógica 2 (Termlnal 6), O 10056. NIvel visuallzable en POO•OI.
2: Corriente del Motor. Escalab'e como % de P.08, O — 100%,
3: voltaje Bus DC Escalado O - 1000 V- O- 100%. valor visualizable en POO.08 en volts DC.
.p-47
4: Analógica 1 — Analógica 2: EI valor de Ent. Analog.2 se resta a ta Ent. Analog.l para dar una senal diferencia'. Valor limitado a O.
5: Ma r Analó Ica 1, Analó ica 2 . EI ma or valor de las dos entradas analó Icas es utilizado como reallmentaclón Pl.
Formato RR entrada anal Ica
U 0• 10 Senaldcoa 10V.
B 0-?0 Senal de O a 20mA.
q-?O Sena' de 4 a 20mA, el Optidrive se bloqueará y mostrará el código 4-20f si la señal cae por debajo de 3mA.
r H-?O c Senat de 4 a 20mA, et Optldrive realizará una rampa de parada si la senat cae por debajo de 3mA.
?D-H • Señal de 20 a 4mA el Optidrlve se bloquearé y mostraré el código 4•20f si la senat cae por debajo de 3mA
r Señal de 20 a 4mA, el Optidrlve realizará una rampa de parada sl la señal cae por debajo de 3mA.
.&c-kh Termistor. Válido con cual uier a uste de P•15 ue ten a entrada di Ital 3 como E.Trl . Nivel de dis aro: 3kO, reset a IkO.
' tie Espora
Cuando c' modo de espera se activa ajustando P•48 >O.Os, eI equipo entrará en modo espera tras un periodo de funcionamiento a
velocidad mrnlma (P-02) durante eI tiempo ajustado en P-48. Cuando estó en modo de espera, la pantalla muestra 5EnóY y la salida
del motor se desactlva. EI modo es rase uede desactivar a ustando el arámetro P-48=O.Os.
modoiespertarPIL
100.0v
Cuando cl equipo está funcionando en modo PI (P-12 5 0 6), y el modo en espera activado (P-48 P•49 se puede utilizar para
definir el nivel de error PI (EJ. Diferencia entre el valor de consigna y realimentación) requerido antes de que el equipo se ponga en
manha de nuevo después de entrar en modo de espera ( 5ERndbY). Esto permite que e' equipo ignore pequeños errores de la señal
dc realimentación V permanezca en modo de espera hasta que la realimentación caiga 10 suficiente,
Bis y salida analógica
Define nivel de histéresis para P.19 para evitar que el relé y la salida analógica se activen y desactiven repetidamente, cuando está
cerca del valor de dls aro.
II. Suministro y constucción de un Júnel de Viento polivalente la Universidad do Alicante,
1 1-'2 /.402 '0.01. 1,1/10/'2025
26
ORITIA 6 BOREAS

---

## page-27

3.4.4 Parámetros avanzados
Par. Descri ión
P-5i Modo Control Motor
O: Modo de control de Velocidad Vectorial.
1: Modo v,lf
2: Control de Velocidad Vectoriat para motor PM.
3: Control de Velocidad Vectorial para motor BLDC
Mínimo
Máximo
Unidades
4: Control de Velocidad Vectorial para motor de Reluctancia Síncrono (SynRel)
S: Centrol de Velocidad Vectorial para motor LSPM
p-52 deparámetrosde motor ( Auto-tune)
O: Deshabilitado
I: Habilitado. Cuando se activa, el equipo realiza una medición y cálculo de los datos requeridos del motor para un funcionamiento
óptimo. Asegúrese de que todos los parámetros relacionados con el motor están configurados correctamente antes de habilitar este
parámetro. Este parámetro puede ser utilizado para optimizar el funcionamiento cuando PSI = O y es totalmente necesario para
PSI=2, 3, 4 y 5. No se requiere Auto-ajuste si P-51 1.
;enModD Veeoñat
200.0
Parámetro de ganancia para et lazo del bucle de velocidad. Afecta de forma simultánea a P & I . No activo cuando P-51 1.
Fis dimite de corriente
i Define el límite de intensidad máxima en los modos que utilizan control vectorial.
de estator del Motor
0.00
Resistencia de estator del motor en ohm. Determinado por el auto-ajuste realizado.
deMatordele• - Lsd)
175.0
655.35
65535
inductancia operacional det directo en mH determinado por el auto-a-uste realizado.
indu&nda deMotofdel e
.6553.5
Inductancia operacional del eje en cuadratura en mH determinado por el auto•ajuste realizado.
0.0.
Velocidad de inyecdón corriente DC
—150,0
0.0
mH
mH
'Hz I RPW
Establece la velocidad a la que se aplica la corriente de inyección DC durante el frenado para detener motor permitiendo, si se
requiere, inyectar corriente DC antes de que el equipo alcance velocidad cero.
Nivel de Corriente de ínfeeción DC
20.0
p_59
P-60
Establece el nivel de corriente de frenado DC aplicada de acuerdo a las condiciones establecidas en P-32 y P-58.
Ind 1:Memoria valor térmico etenrbnieo de sobrecarga H
: Deshabilitado
: Habilitado. Cuando se la información calculada se mantiene después de desconectar el suministro eléctrico al equipo.
Ind2:Cestiónvalortérmico ctrónicodesobrecarga
: It-trp. Cuando el límite de sobrecarga supera el límite, el equipo se bloquea por It-trp para evitar daños en el motor
: Límite Corriente. Cuando el límite de corriente supera el 90%, la corriente de salida se reduce internamente al 100% del
-08, con el fin de evitar la alamatt-t . EI límite de corriente volverá al valor a•ustado en P-54 cuando la sobreca a se reduzca un 10%.
UALOI. Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Alican!e.
UAI-OI 1'2 1402 14/10/2025
ORITIA & BOBEAS
27

---

## page-28

3.4.5 Parámetros de sólo lectura de estado del convertidor
par.
poo.0i
poo.02
poo.03
poo.04
poo-05
poo.06
poo-07
poo-08
poo-09
POO-IO
PCO-II
POC-12
poo-fl3
PCC.í4
POCEiS
—0-20
PCB-22
.POO-24
• no-25
no-26
'900-35
Descri ón
Valor P Entrada Ana'ó ica
Valor Entrada Analó ica
Entrada referenda de velocidad (Hz/RPM
Estado entradas di [tales
Valor sallda PI
Ondulación/rizado del bus DC (V)
Volta e aplicado a' motor
Volta e DC bus
Temperatura radiador intemo
Tiem funcionamiento desde fecha faba h
Tiempo funcionamiento desde última alarma
Tiempo funcionamiento desde últlma alarma
Registro de alarmas
Tiempo fundonamlento desde última
deshabilitadón (h)
Re istro volta e DC bus
Registro temperatura radiador(9C)
Registro Corriente motor (A)
Re istro Ondulación/rizado bus DC (V
Registro Temperatura intema del equipo (9C)
Temperatura 'nterna e ui
Entrada datos proceso CAN open
Salida datos proceso CAN open
Tiempo acumulado con temperatura
radiador> 852C h
Tiempo acumulado con temperatura interna
equipo > 852C (h)
Velocidad estimada del rotor (Hz)
kWh acumulador / MWh acumulador
Tiempo de funcionamiento de los
ventiladores dele uipo (h
Versión de software y checksum
Identificador de ti de e ui
Número de serie del equipo
Corriente del motor Id / 'q
Frecuencia de conmutación PWM real(kHz)
Contador de fallos críticos 0-1
Contador de fallos críticos • 0-volts
Contador de fallos críticos - U-volts
Contador de fallos críticos - 0-temp (h / sink)
10096 = volta e máximo de entrada
100% = volta•e máximo de entrada
Visualizado en Hz si P•IO = O, de 10 contrario en RPM
Estado entradas di itales dele ui o
Valor de salida PI
Medición del rizado del bus DC
Valor voltaje RMS aplicado al motor
Volta•e DC bus intemo
Temperatura del radiador en t
No es osible resetear tiem car ando rámetros de fábrica.
Tiempo en marcha del equipo detenido al deshabilitar o bloquearse. Reset en próxima
habilitación si el equipo se bloquea. Reset también después de pérdida de suministro.
Tiempo en marcha del equipo detenido al deshabilitar o bloquearse. Reset en próxima
habilitación si el equipo se bloquea (bajo voltaje no considerado alarma) — no reset
con pérdida y recuperación de volta•e si no se produce una alarma anterior.
Visualiza las 4 alarmas más recientes con registro de tiempo.
Reloj de tiempo de funcionamiento detenido al deshabilitar eI equipo. EI valor se
resetea en próxima habilitación.
8 valores más recientes anteriores a la alarma. Actualizado cada 256ms
8 valores más recientes anteriores a la alarma. Actualizado cada 30s
8 valores más recientes anteriores a la alarma. Actualizado cada 256ms
8 valores más recientes anteriores a la alarma. Actualizado cada 22ms
8 valores más recientes anteriores a la alarma. Actualizado cada 30s
Tem ratura ambiente interior en
Datos de proceso entrantes (RX PDOI) para CAN open: PII, P12, P13, P14
Datos de proceso salientes (TX PDOI) para CAN open: POI, P02. poa, P04
Total de horas y minutos de operación acumuladas con temperatura del radiador por
encima de 850C
Total de horas y minutos de operación acumuladas con temperatura ambiente intema
por encima de 800C.
Velocidad estimada del rotor en Hz, en modos con control vectorial.
Número total de kWh / MWh consumido por el equipo.
Tiempo visualizado en hh: mm: ss. Primer valor muestra el tiempo en horas. pulse
Subir ara visualizar mm: ss.
Número de versión y checksum. "1" procesador de E / S, "2" etapa de potencia.
Caracterfsticas del e ui o, ti de convertidor códi o de versión de software.
Número de serie único.
Visualiza la corriente de magnetización (Id) y la corriente de par ('q). Presione Subir y
Ba•ar ara mostrarl
Frecuencia de conmutación actual del equipo.
Estos parámetros registran el número de veces que las distintas específicas alarmas
se producen, y son de utilidad para propósitos de diagnóstico.
POO.36
POO-37
poo-3B
900-39
p0040
POO-41
poc.42
poo.43
POO-44
POO.4S
?00-46
P0047
'?0049
Contador de fallos crfticos - b 0-1 (chopper)
Contador de fallos crfticos - 0-heat (control)
Contador de errores Modbus
Contador de errores comunicación CAN o en
Errores de comunicación procesador l/ O
Errores de comunicación uc etapa potencia
Tiempo de encendido del ui o h)
Corriente Fase U offset & ref
Corriente Fase V offset & ref
Corriente Fase W offset & ref
Indice 1: Tiempo total activo del Modo Fuego
Índice 2: Contador en Modo Fue o
Canal Osciloscopio 1 & 2 Optitools
Canal Osciloscopio 3 & 4 Optitools
Bootloader control de motor
Tiem o de vida total del e ui o con alimentación aplicada.
Valor interno
Valor interno
Valor interno
Tiempo total de activación del Modo Fuego
Muestra el número de veces que se ha activado en Modo Fue o
Visualiza señales para canales de osciloscopio 1 & 2 utilizados por Optitools
Visualiza señales para canales de oscilosco io 3 & 4 utilizados or Optitools
Valor interno
AUALOI. Suministro y construcción de un Tünelde Viento rnhva!ente en Ja Unh"ersidad de Aicante.
12 1,402 14/10/2025
ORITIA S BOBEAS
28

---

## page-29

3.4.6 Códigos de mensajes de alarma del variador de frecuencia
CódC0 Número
Descripción
Sin Fallo
Sobrecorriente de circuito frenada
Sobrecarga de resistencia frenada
Sobrecorriente de salida
Térmico de sobrecarga motor (12t)
Alarma de etapa potencia
Sobre Voltaje en ei bus DC
Bajo voltaje en el bus DC
Sobretemperatura radiador
Baja temperatura
Parámetros predeterminados de
fábrica cargados
Alarma extema
Perdida de comunicación Optibus
Rizado DC bus elevado
Perdida de fase entrada
SobreCorriente de Salida
Aeción correefva
de
alarma
0-1
ps-kr-p
E•Er
SC•ObS
FLE-dc
p—LOSS
h 0-1
E
RkF-O I
fitF-03
SC-FO
5C-FO?
IJA'-O'
URO!
00
01
02
03
05
06
07
08
09
10
11
12
13
14
15
16
17
18
19
21
22
23
41
42
43
44
50
o se requiere.
mprobar el estado de la resistencia externa de frenada y el cableado de conexión at equipo.
I convertidor entra en modo fallo para evitar daño a la resistencia de frenada.
recorriente instantánea en la salida del convertidor. Exceso de carga o sobrecarga en el motor.
ota: Después de una atarma la unldad no se puede restablecer de inmediato. Hay un tiempo
ntemo m ramado rasatva ardar a los com entes de tencia de osibles daños.
I equipo se bloquea después de entregar» 100% del valor en P•08 durante un perfodo de tiempo
ra evitar daños en el motor.
mpruebe si hav cortocircuito en eI motor y cable de conexión.
mpruebe si el voltaje de alimentación está dentro de los límites permitidos para eI equipo. Si se
roduce eI falto en desaceleración o parando, aumentar el tiempo de desaceleración en P•04 0
nstale una resistencia de frenado adecuada y active la función de frenado dinámico en P-34.
I voltaje de alimentación de entrada es demasiado bajo. Este fallo se produce siempre cuando se
esconecta la alimentación del equipo. SI se produce durante la marcha, comprobar la tensión de
timentación de entrada todos los com entes en la línea de alimentación af ui
I equipo está demasiado caliente- Compruebe que la temperatura ambiental alrededor del equipo
dentro de la especificación del equipo. Asegure que un caudal de aire suficiente circule
ibremente alrededor det equipo. Aumentar la ventilación del envolvente si es necesario. Asegurar
ue un caudal de aire sufidente entra en el equipo, y que las rejillas de entrada inferior y de salida
u rior no estén bl ueadas u obstruidas.
produce cuando la temperatura ambiente es inferior a -10 • C La temperatura debe elevarse por
ncima de -10 • C ra rmitir eren marcha el u-
Termistor defectuoso en radiador
Fallo de memoria intema (10)
Perdida de Señal 4•20mA
Fallo de Memoria interna (DSP)
Alarma Termistor PTC motor
Fallo Ventilador equipo (solo IP66 )
Temperatura intema del equipo
demasiado elevada
Fallo de autoajuste
Pérdida de mmunicación Modbus
Pérdida de comunicación
CANopen
-trip activado en la entrada digital 3. EI contacto normalmente cerrado se ha abierto por alguna
zón. SI termistor del motor está conectado asegúrese si el motor ese demasiado aliente.
mpruebe enlace de comunicadón entre el equipo y los dispositivos externos. Asegúrese de que
da uipo de la red tiene una dirección única.
mpruebe que las fases de alimentación entrantes están todas conectadas y equilibradas.
mpruebe que las fases de alimentación entrantes están todas conectadas V equilibradas.
mpruebe si hav cortocircuito en el motor y cable de conexión.
ota: Después de una alarma la unidad no se puede restablecer de inmediato. Hay un tiempo
nterno programado para salvaguardar a los componentes de potencia de posibles daños-
ntacte con su distribuidor Invertek Drives.
ulse la tecla de paro. Si el fallo persiste, consulte con su proveedor.
mpruebe la configuración (P-16 y P.47) y conexión de las dos entradas analógicas.
ulse la teda de paro. Si el fallo persiste, consulte con su proveedor.
bre temperatura en Termistor del motor, revise el motor y las cone»dones a este.
evise / ambie el ventilador de refrigeración.
temperatura ambiente del equipo es demasiado alta, compruebe que eI aire de refrigeración
cionado es el adecuado.
parámetros del motor medidos a través del autoajuste no son correctos.
mpruebe ta continuidad entre motor y equipo.
mprobar que las tres fases del motor estén equilibradas.
mpruebe eI cable entrante de la conexión del bus Modbus RTU.
mpruebe que al menos un registro está siendo escrito o leído cíclicamente dentro del límite de
iem de érdida de comunicación establecido en P-36 índice 3.
mpruebe eI able entrante de la conexión del bus CAN open.
Compruebe que existen comunicaciones cíclicas dentro del límite de tiempo de pérdida de
unicación establecido en P•36 índice 3.
y COOS!tliCC de un Túnel (j? Viento polivalente en ta Universidad de Aica•ue.
12 1.402 .re.o: '41102025
ORITIA S BOBEAS

---

## page-30

3.5 PARADA DE EMERGENCIA
En caso de emergencia, el variador de frecuencia puede ser detenido inmediatamente
mediante la seta de parada de emergencia dispuesta al efecto. Al pulsarla, se interrumpe
automáticamente el funcionamiento del variador, deteniendo de manera segura la
Turbomáquina.
Figura 13. Seta de Parada de emergencia.
8.6 MEDICIÓN DE LA VELOCIDAD
La velocidad del flujo en la Sección de Ensayo se mide mediante un tubo de Pitot conectado
al sistema de adquisición de datos.
tubo se coloca en la zona del túnel donde se desea realizar la medición.
de iniciar el ensayo, se recomienda:
• Verificar que los tubos de conexión no presentan obstrucciones ni fugas.
e Comprobar que los orificios del tubo de Pitot no estén obstruidos, ya que cualquier
bloqueo afectaría la precisión de la medición,
Comprobar que el tubo está correctamente alineado con la dirección del flujo de
aire.
Confirmar que el transductor de presión y el sistema de adquisición de datos están
correctamente conectados y operativos.
Vna vez realizadas las comprobaciones oportunas recomendadas en el presente manual
antes de la puesta en marcha, se puede accionar el variador de frecuencia para comenzar
W circulación del flujo del aire y visualizar la velocidad media medida en la interfaz del
"ftware.
Suministro y construcción de un Túnel de Viento polivalente en la Universidad de Alicante.
12 14/10/2025
30
ORITIA S BOBEAS

---

## page-31

4. MANTENIMIENTO
4.1 OBJETO
Con el objetivo de asegurar un funcionamiento óptimo del Túnel de viento y prolongar su vida
útil, es necesario realizar un mantenimiento adecuado y sistemático.
Este mantenimiento debe realizarse de forma periódica y preventiva, con el fin de detectar
posibles incidencias antes de que afecten al rendimiento del sistema.
42 INSPECCIONES GENERALES
Se recomienda realizar inspecciones visuales periódicas en las que se revisarán los
siguientes puntos:
EI circuito de aire permanece libre de obstáculos y sin acumulación de polvo o
residuos.
La estructura de soporte se encuentra estable.
Los paneles de madera y elementos de cierre no presentan deformaciones ni fisuras
apreciables.
Las conexiones eléctricas del sistema están firmes y sin signos de calentamiento.
EI cableado del variador de frecuencia y la Turbomáquina no presenta daños ni
peladuras.
Comprobación del correcto funcionamiento de las tomas de corriente en la zona de
trabajo.
Suministro y construccõón de un Túnel de Vien!0 en la Universidad de Aicante.
12 M02 14/10/2025
31
S BOBEAS

---

## page-32

4.5
4.3 VARIADOR DE FRECUENCIA Y SISTEMA ELÉCTRICO
.N Las comprobaciones periódicas del variador de frecuencia permiten garantizar que el equipo
funciona de manera segura y fiable, evitando riesgos de sobrecalentamiento o fallos
g;eléctricos. Para ello, se recomienda:
Verificar que el variador de frecuencia se encuentra correctamente ventilado y libre
de polvo,
Asegurar que las rejillas de ventilación del variador no están obstruidas.
Mantener el entorno limpio y seco, evitando la acumulación de polvo o humedad en
el equipo.
Comprobar periódicamente el estado de las conexiones eléctricas y tornillería del
variador.
o Antes de la puesta en marcha del ensayo, confirmar que el selector de parada de
emergencia funciona correctamente.
Nota: Por seguridad, el variador de frecuencia está protegido con una carcasa que evita
contactos accidentales. Cualquier revisión de los puntos donde se conectan los hilos en el
variador debe ser realizada únicamente por personal autorizado, con et equipo
-desconectado de Ja red eléctrica, debido a la presencia de tensión.
4.4 TURBOMÁQUINA
Se recomienda realizar las siguientes comprobaciones de mantenimiento:
Verificar visualmente el estado general de la Turbomáquina y su entorno,
asegurando que no existan cuerpos extraños en la zona de aspiración ni
obstrucciones en las rejillas de protección.
No introducir Jas manos ni objetos en el interior de la Turbomáquina bajo ningún
concepto. Para proteger al usuario, se han instalado rejillas de seguridad en la
entrada y salida de aíre de la Turbomáquina.
Comprobar que la Turbomáquina gira libremente y sin vibraciones anómalas al
accionarlo.
Durante el funcionamiento, escuchar posibles ruidos inusuales que puedan indicar
desequilibrios o roces.
Mantener limpio el sistema de ventilación, eliminando acumulaciones de polvo en la
rejilla o el entorno inmediato. Para ello, utilizar aire a baja presión o un paño seco.
Revisar periódicamente el apriete de los tornillos de anclaje de la Turbomáquina a la
estructura.
En caso de periodos prolongados sin uso, se recomienda accionar brevemente la
Turbomáquina una o dos veces al mes para evitar bloqueos o agarrotamientos.
SISTEMA DE MEDIDA
se recomienda comprobar periódicamente el estado del sistema de medida para asegurar
suocorrecto funcionamiento y la fiabilidad de las lecturas de velocidad.
-IR,OI. y construcc,ôn de un Túnel de 14en:'o pohva'ente en la Universidad de A;cante.
12 ,'.'02 teff. 14,10/2025
32
ORITIA 6 BOBEAS

---

## page-33

Verificar que el tubo de Pitot esté libre de obstrucciones y correctamente alineado
con el flujo.
Comprobar la integridad de los tubos de conexión al transductor de presión y su
estanqueidad.
Revisar que eI transductor y el sistema de adquisición de datos (DAQ) estén
correctamente conectados al ordenador de control.
Comprobar periódicamente que las lecturas de velocidad sean estables y
coherentes.
Evitar manipular el tubo de Pitot mientras eI túnel esté en funcionamiento.
LIMPIEZA
Aptes de cualquier acción de limpieza, asegurarse de que el Túnel de viento esté
completamente apagado y desconectado de la alimentación.
Limpiar las superficies del túnel con un paño seco o ligeramente humedecido con
agua, sin productos abrasivos.
Evitar el uso de aire a presión directa sobre los sensores o componentes eléctricos.
En los paneles transparentes de policarbonato de las puertas de la sección de
ensayo, no limpiar en seco para evitar rayaduras. Para ello, utilizar un paño suave y
limpio.
Mantener despejada la zona de ensayo antes de cada prueba.
Limpiar periódicamente las rejillas de protección de la Turbomáquina, retirando
polvo y suciedad acumulada para asegurar un flujo de aire uniforme y prevenir
sobrecalentamiento.
Evitar derrames de líquidos dentro del túnel; en caso de ocurrir, secar
inmediatamente para prevenir daños en madera, electrónica y superficies metálicas.
473, RECOMENDACIONES ADICIONALES
Además de las rutinas de mantenimiento descritas, se aconsejan estas medidas
co plementarias para preservar el correcto funcionamiento del túnel y del sistema de
con rol:
No operar el túnel si se detectan vibraciones anormales, ruidos inusuales o fallos
eléctricos.
Antes de cada jornada de uso, comprobar que el software de control (ejecutable
"Tunel viento.exe") se inicia correctamente y detecta el sistema de adquisición.
Revisar periódicamente la integridad de los cables y conexiones del sistema.
Mantener el área alrededor del túnel limpia y libre de objetos que puedan interferir
con el flujo de aire o generar riesgos.
No manipular los componentes de la Turbomáquina ni retirar las rejillas de
protección.
Evitar la exposición del túnel a humedad o derrames de líquidos sobre la estructura
o los equipos eléctricos.
Registrar cualquier anomalía observada durante la operación para su revisión y
mantenimiento correctivo posterior.
Suminist,o ; construcc.ón de un Túnel de Viento en la Universidad de Alicante
74,10/2025
33
S BOBEAS

---

