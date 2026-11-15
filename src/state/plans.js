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
      'Registro diario: flujo, síntomas, ánimo y notas',
      'Estadísticas básicas',
      'Tema claro y oscuro',
    ],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    monthly: { price: 2.99, label: '$2.99 / mes' },
    yearly: { price: 19.99, label: '$19.99 / año', badge: 'Ahorrás 44%' },
    trialDays: 7,
    features: [
      'Sin anuncios',
      'Predicciones a 12 meses',
      'Gráficos de historial de ciclos y síntomas',
      'Exportar datos (CSV) para tu médica/o',
      'Bloqueo con PIN',
      'Modo pareja: compartí tu calendario',
    ],
  },
};

export const FEATURES = {
  noAds: 'premium',
  longPredictions: 'premium',
  advancedStats: 'premium',
  export: 'premium',
  pinLock: 'premium',
  partnerMode: 'premium',
};

export function hasFeature(plan, feature) {
  const required = FEATURES[feature] ?? 'free';
  return required === 'free' || plan === 'premium';
}

export const PREDICTION_MONTHS = { free: 3, premium: 12 };
