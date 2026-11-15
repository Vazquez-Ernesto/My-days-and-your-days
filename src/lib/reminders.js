// Decide qué recordatorios corresponden HOY. Función pura: fácil de testear.

export const DEFAULT_REMINDERS = { enabled: false, daysBefore: 2, fertile: true };

/**
 * @param summary  resultado de cycleSummary()
 * @param prefs    { daysBefore, fertile }
 * @returns [{ id, title, body }] — el id incluye la fecha para no avisar dos veces el mismo día
 */
export function dueReminders(summary, prefs, today) {
  if (!summary) return [];
  const out = [];
  const d = summary.daysUntilNext;
  const add = (type, title, body) => out.push({ id: `${type}:${today}`, type, title, body });

  if (summary.phase === 'late') {
    add('late', 'Período atrasado', `Tu período lleva ${-d} día${d === -1 ? '' : 's'} de atraso.`);
  } else if (!summary.onPeriod && d === 0) {
    add('period-today', 'Tu período podría llegar hoy', 'Tené a mano lo que necesites 💗');
  } else if (!summary.onPeriod && d > 0 && d <= prefs.daysBefore) {
    add('period-soon', `Tu período llega en ${d} día${d === 1 ? '' : 's'}`, 'Un buen momento para prepararte.');
  }

  if (prefs.fertile) {
    if (summary.cycleDay === summary.ovulationDay - 5) {
      add('fertile', 'Empieza tu ventana fértil', 'Probabilidad de embarazo alta durante los próximos días.');
    } else if (summary.cycleDay === summary.ovulationDay) {
      add('ovulation', 'Hoy es tu día de ovulación estimado', 'Probabilidad de embarazo más alta del ciclo.');
    }
  }
  return out;
}
