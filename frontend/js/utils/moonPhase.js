// ==================================================
// CÁLCULO DE FASE LUNAR - matemático puro, sin API externa
// Basado en el ciclo sinódico lunar (29.53 días) desde una luna nueva
// de referencia conocida (6 de enero de 2000, 18:14 UTC).
// Precisión aproximada: +/- 1 día, suficiente para referencia de pesca.
// ==================================================

const SYNODIC_MONTH = 29.530588861; // días
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

export function getMoonPhase(date = new Date()) {
    const daysSinceKnown = (date.getTime() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
    let phase = (daysSinceKnown % SYNODIC_MONTH) / SYNODIC_MONTH;
    if (phase < 0) phase += 1;

    const age = phase * SYNODIC_MONTH; // días desde la última luna nueva
    const illumination = Math.round((1 - Math.cos(2 * Math.PI * phase)) / 2 * 100);

    let name, emoji, solunarRating, solunarText;

    if (phase < 0.03 || phase > 0.97) {
        name = 'Luna Nueva'; emoji = '🌑';
        solunarRating = 'Alta';
        solunarText = 'Marea viva (mayor amplitud) — tradicionalmente considerada una de las mejores fases para pescar.';
    } else if (phase < 0.22) {
        name = 'Luna Creciente'; emoji = '🌒';
        solunarRating = 'Media';
        solunarText = 'Actividad solunar moderada, en aumento hacia el cuarto creciente.';
    } else if (phase < 0.28) {
        name = 'Cuarto Creciente'; emoji = '🌓';
        solunarRating = 'Baja';
        solunarText = 'Marea muerta (menor amplitud) — tradicionalmente uno de los momentos más flojos del mes.';
    } else if (phase < 0.47) {
        name = 'Luna Gibosa Creciente'; emoji = '🌔';
        solunarRating = 'Media';
        solunarText = 'Actividad solunar en aumento, acercándose a la luna llena.';
    } else if (phase < 0.53) {
        name = 'Luna Llena'; emoji = '🌕';
        solunarRating = 'Alta';
        solunarText = 'Marea viva (mayor amplitud) — junto con la luna nueva, tradicionalmente el mejor momento del mes.';
    } else if (phase < 0.72) {
        name = 'Luna Gibosa Menguante'; emoji = '🌖';
        solunarRating = 'Media';
        solunarText = 'Actividad solunar moderada, en descenso hacia el cuarto menguante.';
    } else if (phase < 0.78) {
        name = 'Cuarto Menguante'; emoji = '🌗';
        solunarRating = 'Baja';
        solunarText = 'Marea muerta (menor amplitud) — tradicionalmente uno de los momentos más flojos del mes.';
    } else {
        name = 'Luna Menguante'; emoji = '🌘';
        solunarRating = 'Media';
        solunarText = 'Actividad solunar moderada, acercándose a la próxima luna nueva.';
    }

    const daysToNewMoon = Math.round((1 - phase) * SYNODIC_MONTH);
    const daysToFullMoon = Math.round(phase < 0.5 ? (0.5 - phase) * SYNODIC_MONTH : (1.5 - phase) * SYNODIC_MONTH);

    return {
        name,
        emoji,
        illumination,
        age: Math.round(age),
        solunarRating,
        solunarText,
        daysToNewMoon,
        daysToFullMoon
    };
}
