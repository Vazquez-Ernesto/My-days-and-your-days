// Cuestionario en pareja: 5 preguntas por día, iguales para los dos.
// Las preguntas se eligen de forma determinística (vínculo + fecha), así no hace falta que el servidor las conozca.
import { diffDays } from './dates.js';

export const QUESTIONS_PER_DAY = 5;

/**
 * Versiones del banco. El orden de cada pareja sale de mezclar el banco, así que agregar preguntas
 * cambiaría las del día: por eso cada versión rige desde una fecha y las anteriores quedan congeladas.
 * Para sumar preguntas: agregarlas AL FINAL de QUESTIONS y sumar una versión con fecha futura
 * (unos días de margen para que los dos teléfonos se actualicen).
 */
export const BANKS = [
  { from: '2026-01-01', size: 64 },
  { from: '2026-11-25', size: 159 },
];

export const QUESTIONS = [
  // --- comunicación ---
  { cat: 'Comunicación', q: 'Te escriben “Ok.” con punto final. ¿Qué pensás?', o: ['Que está todo bien', 'Que algo le pasa', 'Que está ocupado/a', 'Le pregunto directo qué onda'] },
  { cat: 'Comunicación', q: '¿Cómo preferís arreglar una discusión?', o: ['Hablándolo en el momento', 'Dejando que se enfríe y después charlamos', 'Con un abrazo y listo', 'Por mensaje, me sale mejor'] },
  { cat: 'Comunicación', q: 'Cuando estás bajón, ¿qué necesitás del otro?', o: ['Que me escuche sin dar consejos', 'Que me haga reír', 'Que me deje mi espacio', 'Que me diga qué hacer'] },
  { cat: 'Comunicación', q: '¿Audio o mensaje de texto?', o: ['Audio, siempre', 'Texto, los audios me matan', 'Audio corto, no un podcast', 'Llamada y listo'] },
  { cat: 'Comunicación', q: 'Si algo te molesta del otro, ¿qué hacés?', o: ['Lo digo enseguida', 'Espero a ver si se repite', 'Lo tiro en chiste', 'Me lo guardo (y después exploto)'] },
  { cat: 'Comunicación', q: '¿Cómo demostrás más que querés a alguien?', o: ['Con palabras lindas', 'Con tiempo juntos', 'Con detalles y regalitos', 'Con abrazos y mimos'] },
  { cat: 'Comunicación', q: '¿Y cómo te gusta más que te lo demuestren a vos?', o: ['Que me lo digan', 'Que me dediquen tiempo', 'Un detalle inesperado', 'Contacto físico'] },
  { cat: 'Comunicación', q: 'Clavaste el visto sin querer. ¿Qué hacés?', o: ['Respondo apenas me doy cuenta', 'Pido perdón con un sticker', 'Hago como que no pasó nada', 'Llamo directamente'] },
  { cat: 'Comunicación', q: '¿Qué tema te cuesta más hablar en pareja?', o: ['La plata', 'La familia', 'Los celos', 'Lo que quiero a futuro'] },
  { cat: 'Comunicación', q: 'Después de una pelea, ¿quién suele dar el primer paso?', o: ['Yo', 'El otro', 'Depende de quién tenga la culpa', 'Los dos a la vez, por suerte'] },

  // --- decisiones ---
  { cat: 'Decisiones', q: 'Hay que elegir dónde comer. ¿Qué pasa?', o: ['Decido yo rápido', '“Me da igual” (pero no)', 'Tiramos opciones hasta coincidir', 'Termina siendo pizza'] },
  { cat: 'Decisiones', q: 'Para una compra grande, vos sos de…', o: ['Comparar precios una semana', 'Comprar con el corazón', 'Pedir opinión a todo el mundo', 'Esperar la oferta de cuotas sin interés'] },
  { cat: 'Decisiones', q: 'Te ofrecen un laburo mejor pero en otra ciudad. ¿Qué es lo primero que pensás?', o: ['En la plata', 'En nosotros', 'En la familia y amigos', 'En la aventura'] },
  { cat: 'Decisiones', q: 'Si tenemos que decidir algo importante, preferís…', o: ['Decidirlo juntos sí o sí', 'Que decida quien más sabe del tema', 'Hacer una lista de pros y contras', 'Seguir la intuición'] },
  { cat: 'Decisiones', q: 'Ganamos 500 mil pesos de la nada. ¿Qué hacemos?', o: ['Viajamos', 'Ahorro / dólares', 'Nos damos un gustito y ahorramos el resto', 'Arreglamos algo de la casa'] },
  { cat: 'Decisiones', q: '¿Cómo manejás la plata en pareja?', o: ['Todo en común', 'Cada uno lo suyo y gastos a medias', 'Proporcional a lo que gana cada uno', 'Lo vamos viendo'] },
  { cat: 'Decisiones', q: 'Un viernes a la noche cae un plan improvisado. Vos…', o: ['Me sumo de una', 'Depende de quién vaya', 'Prefiero quedarme en casa', 'Digo que sí y después me arrepiento'] },
  { cat: 'Decisiones', q: 'Cuando te equivocás en una decisión…', o: ['Lo reconozco enseguida', 'Me cuesta admitirlo', 'Busco cómo arreglarlo sin decir nada', 'Le echo la culpa al horóscopo'] },
  { cat: 'Decisiones', q: 'Para el finde largo, ¿qué elegís?', o: ['Escapada a algún lado', 'Casa, series y manta', 'Ver a la familia', 'Asado con amigos'] },
  { cat: 'Decisiones', q: '¿Quién organiza más las cosas en la pareja?', o: ['Yo', 'El otro', 'Mitad y mitad', 'Nadie, vamos improvisando'] },

  // --- gustos ---
  { cat: 'Gustos', q: 'El mate, ¿cómo?', o: ['Amargo', 'Dulce', 'Con yuyos o cáscara de naranja', 'No tomo mate (perdón)'] },
  { cat: 'Gustos', q: 'Domingo perfecto:', o: ['Asado al mediodía', 'Dormir hasta tarde y facturas', 'Salir a pasear', 'No salir de la cama'] },
  { cat: 'Gustos', q: '¿Qué serie o peli elegís para ver juntos?', o: ['Comedia', 'Policial / suspenso', 'Romántica', 'Terror (y abrazados)'] },
  { cat: 'Gustos', q: 'Vacaciones ideales:', o: ['Playa en la costa', 'Montaña en el sur', 'Ciudad grande para pasear', 'Algún lugar con pileta y all inclusive'] },
  { cat: 'Gustos', q: 'Pedimos pizza. ¿De qué la pedís?', o: ['Muzza clásica', 'Fugazzeta', 'Con ananá (sin culpa)', 'Napolitana'] },
  { cat: 'Gustos', q: '¿Qué música no puede faltar en un viaje en auto?', o: ['Rock nacional', 'Cumbia o cuarteto', 'Reggaetón / trap', 'Lo que pongan, yo duermo'] },
  { cat: 'Gustos', q: 'Un regalo que te encantaría recibir:', o: ['Una experiencia (cena, viaje)', 'Algo hecho a mano', 'Algo que necesitaba hace rato', 'Una carta'] },
  { cat: 'Gustos', q: '¿Sos más de día o de noche?', o: ['Madrugador/a a full', 'Nocturno/a total', 'Depende del día', 'Ni de día ni de noche: siesta'] },
  { cat: 'Gustos', q: 'Para comer afuera, ¿qué preferís?', o: ['Parrilla', 'Sushi', 'Pastas', 'Hamburguesas'] },
  { cat: 'Gustos', q: 'En el boliche o en la previa, vos sos…', o: ['El alma de la fiesta', 'El que charla en un rincón', 'El que se quiere ir temprano', 'Ya no salgo, gracias'] },

  // --- vida cotidiana ---
  { cat: 'Día a día', q: '¿Qué tarea de la casa odiás más?', o: ['Lavar los platos', 'Planchar / doblar ropa', 'Limpiar el baño', 'Hacer las compras'] },
  { cat: 'Día a día', q: 'Cuando llegás cansado/a del laburo, necesitás…', o: ['Contar todo mi día', 'Un rato de silencio', 'Comer algo rico ya', 'Un abrazo largo'] },
  { cat: 'Día a día', q: '¿Cómo te gusta dormir?', o: ['Abrazados', 'Cada uno en su lado', 'Con la tele prendida', 'Con ventilador aunque haga frío'] },
  { cat: 'Día a día', q: 'Un mensaje de buenos días…', o: ['Es fundamental', 'Me gusta pero no es necesario', 'Si es con meme, mejor', 'Me da igual'] },
  { cat: 'Día a día', q: 'Cuando estás enfermo/a, sos…', o: ['El paciente más dramático', 'Sigo como si nada', 'Quiero que me mimen', 'Quiero que me dejen tranquilo/a'] },
  { cat: 'Día a día', q: '¿Quién cocina mejor en la pareja?', o: ['Yo', 'El otro', 'Los dos, cada uno su especialidad', 'Delivery es nuestro chef'] },
  { cat: 'Día a día', q: 'Cuando estás de mal humor, lo mejor es…', o: ['Comida', 'Dormir', 'Hablarlo', 'Hacer algo de ejercicio'] },
  { cat: 'Día a día', q: 'El celular en la mesa mientras comemos:', o: ['Prohibido', 'Si es urgente, ok', 'No me molesta', 'Yo soy el que lo usa (perdón)'] },
  { cat: 'Día a día', q: '¿Qué detalle chiquito del otro te alegra el día?', o: ['Que me prepare un mate', 'Un mensaje sin motivo', 'Que se acuerde de algo que dije', 'Que me haga reír'] },
  { cat: 'Día a día', q: 'Tu forma de bajar un cambio:', o: ['Caminar', 'Una serie', 'Música', 'Charlar con alguien'] },

  // --- pareja ---
  { cat: 'Nosotros', q: '¿Qué te enamoró primero del otro?', o: ['Su sonrisa / su mirada', 'Su humor', 'Cómo me trataba', 'Su forma de ser con los demás'] },
  { cat: 'Nosotros', q: '¿Cuál es nuestro mejor plan juntos?', o: ['Cocinar juntos', 'Salir a comer', 'Viajar', 'Quedarnos en casa sin hacer nada'] },
  { cat: 'Nosotros', q: 'Los celos en la pareja…', o: ['Un poquito es normal', 'Nada, cero', 'Depende de la situación', 'Mejor hablarlos siempre'] },
  { cat: 'Nosotros', q: '¿Cada cuánto necesitás un rato solo/a?', o: ['Todos los días un ratito', 'Una vez por semana', 'Casi nunca', 'Cuando estoy estresado/a'] },
  { cat: 'Nosotros', q: 'Un aniversario ideal:', o: ['Cena romántica', 'Escapada de finde', 'Algo tranqui en casa', 'Una sorpresa que no me espere'] },
  { cat: 'Nosotros', q: '¿Qué es lo que más valorás en una pareja?', o: ['La confianza', 'El humor', 'El respeto', 'La pasión'] },
  { cat: 'Nosotros', q: '¿Quién se enoja más rápido?', o: ['Yo', 'El otro', 'Los dos igual', 'Ninguno, somos un monje'] },
  { cat: 'Nosotros', q: '¿Quién pide perdón más rápido?', o: ['Yo', 'El otro', 'Los dos igual', 'Nos cuesta a los dos'] },
  { cat: 'Nosotros', q: 'Las fechas importantes (cumple, aniversario):', o: ['Me acuerdo de todas', 'Me acuerdo con ayuda del celular', 'Se me pasan (perdón)', 'Las recuerda el otro por los dos'] },
  { cat: 'Nosotros', q: 'En una foto juntos, ¿quién posa mejor?', o: ['Yo', 'El otro', 'Ninguno, salimos re mal', 'Los dos somos modelos'] },

  // --- futuro ---
  { cat: 'Futuro', q: 'En 5 años te imaginás…', o: ['Viviendo juntos en otro lugar', 'Con hijos o pensándolo', 'Con más viajes encima', 'Igual que ahora pero mejor'] },
  { cat: 'Futuro', q: 'Si adoptamos una mascota, ¿cuál?', o: ['Perro, sí o sí', 'Gato', 'Perro y gato', 'Ninguna, gracias'] },
  { cat: 'Futuro', q: 'La casa soñada:', o: ['Departamento en la ciudad', 'Casa con patio y parrilla', 'Casita en las afueras', 'Cerca del mar'] },
  { cat: 'Futuro', q: 'Si pudieras vivir un año en otro país…', o: ['España o Italia', 'Brasil o algún lugar con playa', 'Estados Unidos o Canadá', 'No me iría de Argentina'] },
  { cat: 'Futuro', q: '¿Qué te gustaría aprender juntos?', o: ['Un idioma', 'A bailar', 'A cocinar algo nuevo', 'Algún deporte'] },
  { cat: 'Futuro', q: 'Un sueño que te gustaría cumplir pronto:', o: ['Un viaje grande', 'Cambiar de laburo', 'Mudarnos', 'Empezar un proyecto propio'] },

  // --- ¿qué harías si…? ---
  { cat: '¿Qué harías si…?', q: 'Te ganás la lotería. Lo primero que hacés:', o: ['Ayudo a mi familia', 'Me compro una casa', 'Renuncio al laburo', 'Viajo por el mundo'] },
  { cat: '¿Qué harías si…?', q: 'Nos perdemos en la ruta sin señal. Vos…', o: ['Pregunto en la primera estación de servicio', 'Sigo, seguro que llegamos', 'Me pongo nervioso/a', 'Lo disfruto, es una aventura'] },
  { cat: '¿Qué harías si…?', q: 'Tu ex te escribe “¿Cómo andás?”. ¿Qué hacés?', o: ['No respondo', 'Respondo cortito', 'Se lo cuento a mi pareja', 'Le muestro el mensaje y nos reímos'] },
  { cat: '¿Qué harías si…?', q: 'Se corta la luz toda la noche. ¿Qué hacemos?', o: ['Charlamos a la luz de una vela', 'Dormimos temprano', 'Juegos de mesa', 'Me desespero sin wifi'] },
  { cat: '¿Qué harías si…?', q: 'Tenemos un día entero libre y sin plata. ¿Qué hacemos?', o: ['Picnic en una plaza', 'Maratón de series', 'Caminata larga', 'Cocinamos algo con lo que haya'] },
  { cat: '¿Qué harías si…?', q: 'Tu suegra cae de sorpresa un domingo. Vos…', o: ['La recibo con mate', 'Me escondo un rato', 'Encantado/a, que se quede a comer', 'Depende de la suegra'] },
  { cat: '¿Qué harías si…?', q: 'Rompés algo que el otro quiere mucho. ¿Qué hacés?', o: ['Lo confieso enseguida', 'Intento arreglarlo antes de decir nada', 'Compro uno nuevo', 'Le echo la culpa al gato'] },
  { cat: '¿Qué harías si…?', q: 'Te podés teletransportar una vez, ahora mismo. ¿A dónde?', o: ['A una playa paradisíaca', 'A la casa de mi familia', 'A un recital', 'Al lado tuyo'] },
  // ===== Banco v2 (desde BANK_V2_FROM). Agregar SOLO al final: el orden de las anteriores no se toca. =====
  // --- comunicación ---
  { cat: 'Comunicación', q: '¿Qué te sale mejor: pedir perdón o perdonar?', o: ['Pedir perdón', 'Perdonar', 'Las dos cosas', 'Ninguna, soy orgulloso/a'] },
  { cat: 'Comunicación', q: 'Estás preocupado/a por algo del laburo. ¿Lo contás?', o: ['Sí, apenas llego', 'Cuando me preguntan', 'Solo si es grave', 'Me lo guardo para no cargar al otro'] },
  { cat: 'Comunicación', q: 'Un “tenemos que hablar” te genera…', o: ['Pánico total', 'Curiosidad', 'Tranquilidad, hablar está bueno', 'Ganas de salir corriendo'] },
  { cat: 'Comunicación', q: '¿Qué te gustaría que el otro te pregunte más seguido?', o: ['Cómo me fue en el día', 'Qué necesito', 'Qué estoy soñando', 'Si estoy bien de verdad'] },
  { cat: 'Comunicación', q: 'Cuando el otro está enojado, vos…', o: ['Le pregunto qué le pasa', 'Le doy espacio', 'Trato de hacerlo reír', 'Me enojo yo también'] },
  { cat: 'Comunicación', q: '¿Qué frase te desarma en una discusión?', o: ['“Tenés razón”', '“Te entiendo”', '“Perdoname”', '“Vení, abrazame”'] },
  { cat: 'Comunicación', q: 'Un elogio que te encanta escuchar:', o: ['Qué lindo/a estás', 'Qué inteligente sos', 'Qué buena persona sos', 'Me hacés muy feliz'] },
  { cat: 'Comunicación', q: 'Si pudieras cambiar algo de cómo discutimos:', o: ['Que no levantemos la voz', 'Que no dejemos pasar tanto tiempo', 'Que escuchemos más', 'Nada, discutimos bien'] },
  { cat: 'Comunicación', q: '¿Cuánto te importa que te avisen si van a llegar tarde?', o: ['Muchísimo', 'Un poco', 'Nada, no me hago drama', 'Depende de cuán tarde'] },
  { cat: 'Comunicación', q: 'Para decir algo difícil, ¿qué momento elegís?', o: ['Caminando juntos', 'En el auto', 'Antes de dormir', 'Con un mate de por medio'] },
  // --- nosotros ---
  { cat: 'Nosotros', q: '¿Cuál es “nuestra” canción?', o: ['Tenemos una y la sabemos los dos', 'Tenemos varias', 'Todavía no tenemos', 'Cada uno diría una distinta'] },
  { cat: 'Nosotros', q: '¿Qué nos hace más reír juntos?', o: ['Los memes', 'Las cosas que nos pasan', 'Imitar a gente', 'Los chistes internos'] },
  { cat: 'Nosotros', q: 'El momento del día que más disfrutás juntos:', o: ['El desayuno', 'La cena', 'Antes de dormir', 'Los fines de semana a la mañana'] },
  { cat: 'Nosotros', q: '¿Qué hacemos mejor como equipo?', o: ['Organizar viajes', 'Resolver problemas', 'Cocinar', 'Hacernos reír'] },
  { cat: 'Nosotros', q: '¿En qué nos parecemos más?', o: ['En el humor', 'En los valores', 'En los gustos', 'En lo cabezas duras'] },
  { cat: 'Nosotros', q: '¿En qué somos más distintos?', o: ['En el orden', 'En la plata', 'En los horarios', 'En cómo enfrentamos los problemas'] },
  { cat: 'Nosotros', q: 'Un apodo para el otro:', o: ['Algo tierno (amor, gordi, bebu)', 'Su nombre de siempre', 'Un apodo que solo entendemos nosotros', 'Depende del humor del día'] },
  { cat: 'Nosotros', q: '¿Qué te gustaría que hagamos más seguido?', o: ['Salir a comer', 'Viajar', 'Quedarnos abrazados sin hacer nada', 'Ver amigos juntos'] },
  { cat: 'Nosotros', q: 'Si nuestra relación fuera una película, sería…', o: ['Una comedia romántica', 'Una de aventuras', 'Un drama con final feliz', 'Una de esas que se repiten en la tele'] },
  { cat: 'Nosotros', q: 'Lo que más admirás del otro:', o: ['Su paciencia', 'Su buen humor', 'Lo trabajador/a que es', 'Cómo trata a los demás'] },
  { cat: 'Nosotros', q: '¿Quién es más romántico/a?', o: ['Yo', 'El otro', 'Los dos por igual', 'Ninguno, somos más de chistes'] },
  { cat: 'Nosotros', q: '¿Quién se duerme primero viendo una peli?', o: ['Yo, siempre', 'El otro', 'Los dos a la vez', 'Ninguno, somos de terminarla'] },
  // --- gustos ---
  { cat: 'Gustos', q: '¿Mate dulce o amargo?', o: ['Amargo', 'Dulce', 'Con edulcorante', 'No tomo mate'] },
  { cat: 'Gustos', q: 'Un domingo perfecto arranca con…', o: ['Facturas y mate', 'Dormir hasta el mediodía', 'Salir a correr', 'Desayuno en la cama'] },
  { cat: 'Gustos', q: '¿Asado de qué no puede faltar?', o: ['Vacío', 'Chorizo y morcilla', 'Entraña', 'Provoleta (no es carne, pero bueno)'] },
  { cat: 'Gustos', q: 'Helado: ¿qué gusto pedís sí o sí?', o: ['Dulce de leche granizado', 'Chocolate', 'Frutilla al agua', 'Siempre pruebo uno nuevo'] },
  { cat: 'Gustos', q: '¿Serie o película?', o: ['Serie para maratonear', 'Película y a dormir', 'Documental', 'Lo que elija el otro'] },
  { cat: 'Gustos', q: '¿Qué género te gana siempre?', o: ['Comedia', 'Terror', 'Romántica', 'Acción'] },
  { cat: 'Gustos', q: 'Playa o montaña:', o: ['Playa', 'Montaña', 'Las dos en el mismo viaje', 'Ciudad, gracias'] },
  { cat: 'Gustos', q: 'Frío o calor:', o: ['Frío, con manta', 'Calor, con pileta', 'Primavera, ni uno ni otro', 'Me quejo de los dos'] },
  { cat: 'Gustos', q: '¿Empanadas fritas o al horno?', o: ['Fritas', 'Al horno', 'Me da igual mientras haya', 'Depende de quién las haga'] },
  { cat: 'Gustos', q: 'Un recital al que irías sí o sí:', o: ['Rock nacional', 'Cumbia o cuarteto', 'Pop internacional', 'Algo bien tranqui, acústico'] },
  { cat: 'Gustos', q: 'Para un regalo, preferís…', o: ['Algo útil', 'Una experiencia (viaje, cena)', 'Algo hecho a mano', 'Plata y me compro lo que quiero'] },
  { cat: 'Gustos', q: '¿Cuál es tu comida de bajón?', o: ['Pizza', 'Hamburguesa', 'Milanesa con papas fritas', 'Algo dulce'] },
  // --- día a día ---
  { cat: 'Día a día', q: '¿Quién controla el control remoto?', o: ['Yo', 'El otro', 'Nos turnamos', 'Lo pierde siempre alguien'] },
  { cat: 'Día a día', q: 'El lado de la cama:', o: ['Izquierdo', 'Derecho', 'El del medio (y molesto)', 'No me importa'] },
  { cat: 'Día a día', q: '¿Cómo es tu despertar?', o: ['Me levanto con la primera alarma', 'Posponga, posponga, posponga', 'Me despierto solo/a sin alarma', 'Necesito café antes de hablar'] },
  { cat: 'Día a día', q: 'Las compras del súper:', o: ['Con lista y en orden', 'Voy y veo qué hay', 'Por delivery', 'Que vaya el otro'] },
  { cat: 'Día a día', q: 'Platos sucios en la pileta:', o: ['Se lavan al toque', 'Mañana los lavo', 'Que se remojen un rato', 'Lavavajillas y listo'] },
  { cat: 'Día a día', q: '¿Qué hacés primero al llegar a casa?', o: ['Me cambio la ropa', 'Me tiro en el sillón', 'Abro la heladera', 'Busco al otro para saludarlo'] },
  { cat: 'Día a día', q: 'El orden en casa es…', o: ['Fundamental', 'Importante, pero sin obsesión', 'Un caos organizado', 'Un tema de discusión'] },
  { cat: 'Día a día', q: 'La temperatura del aire acondicionado:', o: ['Bien frío', 'Templado', 'Apagado, abro la ventana', 'Siempre discutimos esto'] },
  { cat: 'Día a día', q: 'Antes de dormir, ¿qué hacés?', o: ['Scrolleo el celular', 'Leo un libro', 'Charlamos', 'Me duermo en dos minutos'] },
  { cat: 'Día a día', q: '¿Quién es más puntual?', o: ['Yo', 'El otro', 'Los dos', 'Ninguno, llegamos tarde juntos'] },
  // --- decisiones ---
  { cat: 'Decisiones', q: 'Elegir dónde comer un sábado:', o: ['Decido yo rápido', 'Que decida el otro', 'Tardamos una hora', 'Vamos al lugar de siempre'] },
  { cat: 'Decisiones', q: 'Una compra grande, ¿cómo la decidís?', o: ['Investigo semanas', 'Pregunto a todo el mundo', 'Me tiro de cabeza', 'La charlamos juntos'] },
  { cat: 'Decisiones', q: 'Si hay que elegir entre ver a mi familia o a tus amigos…', o: ['Familia primero', 'Amigos esta vez', 'Hacemos las dos cosas', 'Nos quedamos en casa'] },
  { cat: 'Decisiones', q: '¿Cómo decidimos qué serie ver?', o: ['Elige uno, mira el otro', 'Votación', 'Una cada uno', 'Pasamos media hora en el menú'] },
  { cat: 'Decisiones', q: 'Si te ofrecen un laburo mejor en otra ciudad…', o: ['Lo charlamos y vemos', 'Lo agarro', 'No me iría', 'Solo si nos vamos juntos'] },
  { cat: 'Decisiones', q: 'En un viaje, ¿planificar o improvisar?', o: ['Todo planificado', 'Improvisar', 'Lo básico planificado', 'Que planifique el otro'] },
  { cat: 'Decisiones', q: '¿Cómo tomás decisiones importantes?', o: ['Con la cabeza', 'Con el corazón', 'Con una lista de pros y contras', 'Consultándolo con la almohada'] },
  { cat: 'Decisiones', q: 'Si no nos ponemos de acuerdo, ¿qué hacemos?', o: ['Cede el que menos le importa', 'Nos turnamos', 'Buscamos una opción nueva', 'Piedra, papel o tijera'] },
  // --- futuro ---
  { cat: 'Futuro', q: '¿Cómo te imaginás de viejitos?', o: ['Viajando', 'En una casa con jardín', 'Con nietos alrededor', 'Igual que ahora, pero con canas'] },
  { cat: 'Futuro', q: 'Un viaje que tenemos que hacer sí o sí:', o: ['El sur argentino', 'Europa', 'El Caribe', 'Japón o algún lugar lejos'] },
  { cat: 'Futuro', q: '¿Casamiento?', o: ['Fiesta grande', 'Algo íntimo', 'Solo por civil', 'No hace falta'] },
  { cat: 'Futuro', q: 'Algo que te gustaría construir juntos:', o: ['Una familia', 'Una casa', 'Un emprendimiento', 'Muchos recuerdos de viajes'] },
  { cat: 'Futuro', q: 'Dentro de un año, ¿qué te gustaría haber logrado?', o: ['Ahorrar', 'Viajar', 'Mejorar la salud', 'Aprender algo nuevo'] },
  { cat: 'Futuro', q: '¿Qué tradición te gustaría que tengamos?', o: ['Un viaje por año', 'Una cena especial por mes', 'Navidad siempre juntos', 'Festejar cada aniversario a lo grande'] },
  // --- ¿qué harías si…? ---
  { cat: '¿Qué harías si…?', q: 'Encontrás una billetera con plata en la calle. ¿Qué hacés?', o: ['Busco al dueño', 'La llevo a la comisaría', 'La dejo donde está', 'Me la quedo (no se lo digo a nadie)'] },
  { cat: '¿Qué harías si…?', q: 'Nos quedamos encerrados en el ascensor una hora. Vos…', o: ['Mantengo la calma', 'Llamo a todo el mundo', 'Aprovecho para charlar', 'Entro en pánico'] },
  { cat: '¿Qué harías si…?', q: 'Te invitan a un casamiento donde no conocés a nadie. ¿Qué hacés?', o: ['Me hago amigos en la mesa', 'Me quedo pegado/a al otro', 'Bailo toda la noche', 'Me voy temprano'] },
  { cat: '¿Qué harías si…?', q: 'Tenés un superpoder por un día:', o: ['Volar', 'Leer la mente', 'Ser invisible', 'Teletransportarme'] },
  { cat: '¿Qué harías si…?', q: 'Te quedás sin internet una semana. ¿Cómo sobrevivís?', o: ['Leo todo lo que tenía pendiente', 'Salgo más', 'Sufro mucho', 'Ni me doy cuenta'] },
  { cat: '¿Qué harías si…?', q: 'El otro se olvida de tu cumpleaños. Vos…', o: ['Me hago el/la ofendido/a', 'Se lo recuerdo con humor', 'Me enojo en serio', 'Lo perdono si hay torta'] },
  { cat: '¿Qué harías si…?', q: 'Podés cenar con cualquier persona famosa. ¿Con quién?', o: ['Un/a deportista', 'Un/a músico/a', 'Un/a actor o actriz', 'Alguien de la historia'] },
  { cat: '¿Qué harías si…?', q: 'Nos regalan un viaje con salida mañana. ¿Qué hacés?', o: ['Armo la valija ya', 'Veo si puedo faltar al laburo', 'Lo dejo para otra fecha', 'Le pregunto mil cosas al otro'] },
  { cat: '¿Qué harías si…?', q: 'Te dan a elegir: casa en la playa o en la montaña, gratis.', o: ['Playa', 'Montaña', 'La vendo y viajo', 'La que elija el otro'] },
  { cat: '¿Qué harías si…?', q: 'Cae un amigo a las 2 de la mañana a contarte un problema.', o: ['Lo hago pasar y pongo la pava', 'Lo escucho en la puerta', 'Le digo que mañana hablamos', 'Despierto al otro para que me ayude'] },
  // --- plata ---
  { cat: 'Plata', q: '¿Sos más de ahorrar o de gastar?', o: ['Ahorrar', 'Gastar', 'Ahorro para después gastar', 'Depende del mes'] },
  { cat: 'Plata', q: 'La plata en pareja:', o: ['Todo junto', 'Cada uno lo suyo', 'Un fondo común para gastos de la casa', 'Todavía no lo hablamos'] },
  { cat: 'Plata', q: 'Te sobra un poco de plata a fin de mes. ¿Qué hacés?', o: ['La guardo', 'Me doy un gusto', 'La uso para algo de los dos', 'La invierto'] },
  { cat: 'Plata', q: 'Una salida a comer, ¿quién paga?', o: ['Mitad y mitad', 'El que invita', 'Nos turnamos', 'El que tenga más ese mes'] },
  { cat: 'Plata', q: '¿En qué no te importa gastar de más?', o: ['Comida rica', 'Viajes', 'Ropa', 'Tecnología'] },
  { cat: 'Plata', q: 'Antes de comprar algo caro, ¿lo consultás con el otro?', o: ['Siempre', 'Si es muy caro', 'Casi nunca', 'Le aviso después'] },
  { cat: 'Plata', q: 'Un gasto del otro que no entendés:', o: ['Ropa o zapatillas', 'Delivery', 'Cosas de tecnología', 'Ninguno, respeto'] },
  // --- familia y amigos ---
  { cat: 'Familia y amigos', q: 'Los domingos en familia:', o: ['Todos los domingos', 'Una vez por mes alcanza', 'Solo en fechas especiales', 'Prefiero domingos de a dos'] },
  { cat: 'Familia y amigos', q: '¿Cuántos hijos te imaginás?', o: ['Ninguno', 'Uno', 'Dos', 'Tres o más'] },
  { cat: 'Familia y amigos', q: 'Mis amigos y vos:', o: ['Se llevan bárbaro', 'Se toleran', 'Todavía se están conociendo', 'Mejor cada uno con los suyos'] },
  { cat: 'Familia y amigos', q: 'Una juntada con amigos ideal:', o: ['Asado en una casa', 'Salir a un bar', 'Juegos de mesa', 'Una escapada de fin de semana'] },
  { cat: 'Familia y amigos', q: 'Navidad y Año Nuevo:', o: ['Una con cada familia', 'Todo con mi familia', 'Todo con la tuya', 'Los dos solos, de viaje'] },
  { cat: 'Familia y amigos', q: '¿A quién de tu familia se parece más el otro?', o: ['A mi mamá', 'A mi papá', 'A algún hermano/a', 'A nadie, es único/a'] },
  { cat: 'Familia y amigos', q: 'Un consejo de tu familia que te sirvió en la pareja:', o: ['Nunca irse a dormir enojados', 'Elegir las peleas', 'Tener cosas propias', 'Reírse de uno mismo'] },
  // --- recuerdos ---
  { cat: 'Recuerdos', q: '¿Te acordás de nuestra primera cita?', o: ['Al detalle', 'Más o menos', 'Me acuerdo de lo que comimos', 'Mejor no preguntes'] },
  { cat: 'Recuerdos', q: 'El viaje juntos que más recordás:', o: ['El primero', 'El más lejos', 'Una escapada corta', 'Todavía falta el mejor'] },
  { cat: 'Recuerdos', q: '¿Quién dijo “te quiero” primero?', o: ['Yo', 'El otro', 'Los dos a la vez', 'No me acuerdo (y debería)'] },
  { cat: 'Recuerdos', q: 'Un momento en que el otro te sorprendió:', o: ['Con un regalo', 'Cuando estuve mal', 'En un viaje', 'Todavía lo estoy esperando'] },
  { cat: 'Recuerdos', q: 'De chico/a soñabas con ser…', o: ['Deportista', 'Artista', 'Médico/a o maestro/a', 'Algo que me da vergüenza decir'] },
  { cat: 'Recuerdos', q: 'La primera impresión que te dio el otro:', o: ['Me pareció lindo/a', 'Me pareció tímido/a', 'Me hizo reír', 'No me cayó tan bien al principio'] },
  // --- picante (suave) ---
  { cat: 'Picante 🌶️', q: '¿Mañana, tarde o noche?', o: ['Mañana', 'Siesta', 'Noche', 'Cuando surja'] },
  { cat: 'Picante 🌶️', q: 'Lo que más te gusta para empezar:', o: ['Besos', 'Masajes', 'Una charla con onda', 'Que me sorprendan'] },
  { cat: 'Picante 🌶️', q: 'Una cita romántica ideal:', o: ['Cena con velas', 'Escapada a un hotel', 'Noche en casa sin celulares', 'Bailar juntos'] },
  { cat: 'Picante 🌶️', q: '¿Qué te parece más sexy del otro?', o: ['Su sonrisa', 'Su mirada', 'Su voz', 'Su forma de ser'] },
  { cat: 'Picante 🌶️', q: 'Probar algo nuevo en la intimidad te parece…', o: ['Divertido', 'Bien, si lo charlamos antes', 'Me da un poco de vergüenza', 'Prefiero lo que ya conocemos'] },
  { cat: 'Picante 🌶️', q: 'Un mensaje subido de tono en medio del día:', o: ['Me encanta', 'Me pone nervioso/a', 'Depende de dónde esté', 'Mejor en persona'] },
  { cat: 'Picante 🌶️', q: 'Después de una pelea, ¿la reconciliación?', o: ['Con un abrazo largo', 'Con una charla', 'Con algo más… 😏', 'Con comida rica'] },
];

/** Generador pseudoaleatorio con semilla (mulberry32): mismo resultado en los dos teléfonos. */
function seeded(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Orden propio de cada pareja (mezcla con semilla = id del vínculo) sobre las primeras `size` preguntas. */
function orderFor(pairId, size) {
  const idx = Array.from({ length: size }, (_, i) => i);
  const rnd = seeded(pairId || 'mydays');
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/** Las 5 preguntas del día. Recorre el banco en orden: no se repiten hasta haberlas usado todas. */
export function bankFor(date) {
  return BANKS.reduce((cur, b) => (date >= b.from ? b : cur), BANKS[0]);
}

export function questionsFor(pairId, date) {
  const bank = bankFor(date);
  const order = orderFor(pairId, bank.size);
  const day = diffDays(date, bank.from);
  const start = ((day * QUESTIONS_PER_DAY) % order.length + order.length) % order.length;
  return Array.from({ length: QUESTIONS_PER_DAY }, (_, i) => {
    const id = order[(start + i) % order.length];
    return { id, ...QUESTIONS[id] };
  });
}

/** Ids de las preguntas del día: viajan con las respuestas para comprobar que los dos respondieron lo mismo. */
export const questionIds = (pairId, date) => questionsFor(pairId, date).map((q) => q.id);

/**
 * ¿Las respuestas del otro son de las mismas preguntas? Si su app es de otra versión del banco, no.
 * Sin ids (app vieja) solo confiamos en las fechas del banco original.
 */
export function sameQuestions(theirIds, pairId, date) {
  if (Array.isArray(theirIds)) return theirIds.join(',') === questionIds(pairId, date).join(',');
  return bankFor(date) === BANKS[0];
}

export function compare(mine, theirs) {
  const matches = mine.filter((a, i) => a === theirs[i]).length;
  return { matches, percent: Math.round((matches / QUESTIONS_PER_DAY) * 100) };
}

export function syncLabel(matches) {
  if (matches === 5) return { emoji: '🔥', title: '¡Almas gemelas!', text: 'Coincidieron en todo. ¿Se copiaron?' };
  if (matches >= 3) return { emoji: '💞', title: 'Re en sintonía', text: 'Piensan bastante parecido, y en lo que no, se complementan.' };
  if (matches === 2) return { emoji: '🌱', title: 'Parecidos, pero cada uno con lo suyo', text: 'Hay mucho para charlar: ahí está lo lindo.' };
  return { emoji: '🌗', title: 'Polos opuestos que se complementan', text: 'Distintos, y eso suma. Buena excusa para una charla con mate.' };
}

/** Estado del cuestionario del día para mostrar en pantalla. */
export function quizStatus(entry) {
  if (!entry?.mine) return 'todo';
  if (!entry.theirs) return 'waiting';
  if (entry.mismatch) return 'mismatch';
  return 'done';
}
