// Cuestionario en pareja: 5 preguntas por día, iguales para los dos.
// Las preguntas se eligen de forma determinística (vínculo + fecha), así no hace falta que el servidor las conozca.
import { diffDays } from './dates.js';

export const QUESTIONS_PER_DAY = 5;

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

/** Orden propio de cada pareja (mezcla con semilla = id del vínculo). */
function orderFor(pairId) {
  const idx = QUESTIONS.map((_, i) => i);
  const rnd = seeded(pairId || 'mydays');
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/** Las 5 preguntas del día. Recorre el banco en orden: no se repiten hasta haberlas usado todas. */
export function questionsFor(pairId, date) {
  const order = orderFor(pairId);
  const day = diffDays(date, '2026-01-01');
  const start = ((day * QUESTIONS_PER_DAY) % order.length + order.length) % order.length;
  return Array.from({ length: QUESTIONS_PER_DAY }, (_, i) => {
    const id = order[(start + i) % order.length];
    return { id, ...QUESTIONS[id] };
  });
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
  return 'done';
}
