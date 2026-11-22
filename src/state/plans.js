// Definición de planes y "feature flags". Toda la app pregunta acá
// si una función está disponible, así cambiar qué es Premium es editar un solo archivo.

export const PLANS = {
  free: {
    id: 'free',
    name: 'Gratis',
    price: '$0',
    features: [
      'Calendario y predicción del próximo período',
      'Ventana fértil y ovulación',
      'Registro diario: flujo, síntomas, ánimo, relaciones, peso y temperatura',
      'Recordatorios: período, ovulación, píldora y cita médica',
      'Análisis de síntomas, vida sexual y cronología',
      'Modo pareja: tu pareja ve tu ciclo y tus momentos (gratis por ahora)',
      'Tema claro y oscuro',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    // precios de referencia; los reales (en pesos) los define el servidor
    monthly: { price: 2.99, label: 'USD 2,99 / mes' },
    yearly: { price: 19.99, label: 'USD 19,99 / año', badge: 'Ahorrás 44%' },
    trialDays: 7,
    features: [
      'Sin anuncios',
      'Predicciones a 12 meses',
      'Patrones de síntomas por ciclo',
      'Gráfico del largo de tus ciclos',
      'Vista anual del calendario',
      'Exportar datos (CSV) para tu médica/o',
      'Bloqueo con PIN',
    ],
  },
};

/** Comparación Gratis vs Premium: [función, gratis, premium] (true/false o un texto). */
export const COMPARE = [
  ['Calendario, predicción y ventana fértil', true, true],
  ['Registro diario y recordatorios', true, true],
  ['Modo pareja y cuestionario', true, true],
  ['Predicciones hacia adelante', '3 meses', '12 meses'],
  ['Sin anuncios', false, true],
  ['Patrones de síntomas por ciclo', false, true],
  ['Gráfico del largo de tus ciclos', false, true],
  ['Vista anual del calendario', false, true],
  ['Exportar datos para tu médica/o', false, true],
  ['Bloqueo con PIN', false, true],
];

export const FEATURES = {
  noAds: 'premium',
  longPredictions: 'premium',
  advancedStats: 'premium',
  symptomPatterns: 'premium',
  yearView: 'premium',
  export: 'premium',
  pinLock: 'premium',
  partnerMode: 'free', // decisión de producto: gratis mientras crecemos
};

export function hasFeature(plan, feature) {
  const required = FEATURES[feature] ?? 'free';
  return required === 'free' || plan === 'premium';
}

export const PREDICTION_MONTHS = { free: 3, premium: 12 };
