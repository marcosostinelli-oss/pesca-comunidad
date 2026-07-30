const express = require('express');
const router = express.Router();

// ==================================================
// CALCULO DE MAREAS - dos capas:
//
// 1) RIO DE LA PLATA: se lee el pronostico oficial del Servicio de
//    Hidrografia Naval (SHN), que incluye el ajuste por viento/sudestada.
//    Es mas preciso que un calculo puramente astronomico para esta zona.
//
// 2) RESTO DEL MUNDO: calculo astronomico con la libreria "neaps"
//    (open source, sin API key, cobertura mundial).
// ==================================================

const SHN_URL = 'https://www.hidro.gov.ar/oceanografia/pronostico.asp';

const RIO_DE_LA_PLATA_STATIONS = [
    { match: 'PUERTO LA PLATA', name: 'Puerto La Plata', lat: -34.85, lng: -57.90 },
    { match: 'PUERTO DE BUENOS AIRES', name: 'Puerto de Buenos Aires', lat: -34.60, lng: -58.36 },
    { match: 'SAN FERNANDO', name: 'San Fernando', lat: -34.45, lng: -58.55 },
    { match: 'ISLA MART', name: 'Isla Martin Garcia', lat: -34.17, lng: -58.25 },
    { match: 'CANAL PUNTA INDIO', name: 'Canal Punta Indio', lat: -35.35, lng: -57.15 }
];

function isInRioDeLaPlata(lat, lng) {
    return lat <= -34.0 && lat >= -35.6 && lng <= -56.5 && lng >= -58.8;
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestRioDeLaPlataStation(lat, lng) {
    let best = null;
    let bestDist = Infinity;
    for (const s of RIO_DE_LA_PLATA_STATIONS) {
        const d = haversineKm(lat, lng, s.lat, s.lng);
        if (d < bestDist) {
            bestDist = d;
            best = s;
        }
    }
    return best;
}

let shnCache = { text: null, expiresAt: 0 };
const SHN_CACHE_TTL_MS = 30 * 60 * 1000;

async function fetchShnPlainText() {
    if (shnCache.text && shnCache.expiresAt > Date.now()) {
        return shnCache.text;
    }

    const response = await fetch(SHN_URL);
    if (!response.ok) {
        throw new Error(`SHN respondio ${response.status}`);
    }
    const html = await response.text();

    const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&aacute;/gi, 'a').replace(/&eacute;/gi, 'e').replace(/&iacute;/gi, 'i')
        .replace(/&oacute;/gi, 'o').replace(/&uacute;/gi, 'u').replace(/&ntilde;/gi, 'n')
        .replace(/\s+/g, ' ')
        .toUpperCase()
        .trim();

    shnCache = { text, expiresAt: Date.now() + SHN_CACHE_TTL_MS };
    return text;
}

function parseStationEvents(segment) {
    const regex = /(PLEAMAR|BAJAMAR)\s+(\d{2}:\d{2}|-{1,3})\s+([\d.,]+|-{1,3})\s+(\d{2}\/\d{2}\/\d{4})/g;
    const events = [];
    let m;
    while ((m = regex.exec(segment)) !== null) {
        const estado = m[1];
        const hora = m[2];
        const altura = m[3];
        const fecha = m[4];
        if (hora.includes('-') || altura.includes('-')) continue;

        const partesFecha = fecha.split('/').map(Number);
        const dd = partesFecha[0], mm = partesFecha[1], yyyy = partesFecha[2];
        const partesHora = hora.split(':').map(Number);
        const hh = partesHora[0], min = partesHora[1];
        const time = new Date(Date.UTC(yyyy, mm - 1, dd, hh + 3, min));

        events.push({
            type: estado === 'PLEAMAR' ? 'high' : 'low',
            time: time,
            height: parseFloat(altura.replace(',', '.'))
        });
    }
    return events.sort((a, b) => a.time - b.time);
}

async function getRioDeLaPlataForecast(lat, lng) {
    const text = await fetchShnPlainText();
    const station = findNearestRioDeLaPlataStation(lat, lng);

    const startIdx = text.indexOf(station.match);
    if (startIdx === -1) {
        throw new Error(`No se encontro la seccion "${station.match}" en el pronostico del SHN. Puede haber cambiado el formato de la pagina.`);
    }

    let endIdx = text.length;
    for (const other of RIO_DE_LA_PLATA_STATIONS) {
        if (other.match === station.match) continue;
        const idx = text.indexOf(other.match, startIdx + station.match.length);
        if (idx !== -1 && idx < endIdx) endIdx = idx;
    }

    const segment = text.slice(startIdx, endIdx);
    const events = parseStationEvents(segment);

    if (events.length === 0) {
        throw new Error(`No se pudieron extraer eventos de marea para "${station.name}" del pronostico del SHN`);
    }

    const now = new Date();
    const past = [...events].reverse().find(e => e.time <= now);
    const next = events.find(e => e.time > now);

    let currentHeight = null;
    let isRising = null;

    if (past && next) {
        const span = next.time - past.time;
        const progress = span > 0 ? (now - past.time) / span : 0;
        currentHeight = past.height + (next.height - past.height) * progress;
        isRising = next.height > past.height;
    } else if (next) {
        currentHeight = next.height;
        isRising = true;
    } else if (past) {
        currentHeight = past.height;
        isRising = false;
    }

    const nextHighEvent = events.find(e => e.type === 'high' && e.time > now);
    const nextLowEvent = events.find(e => e.type === 'low' && e.time > now);

    const formatTime = (d) => d ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }) : '--:--';

    return {
        success: true,
        current: isRising === null ? '-' : (isRising ? 'Subiendo' : 'Bajando'),
        currentHeight: currentHeight !== null ? currentHeight.toFixed(2) : '--',
        nextHigh: formatTime(nextHighEvent ? nextHighEvent.time : null),
        nextLow: formatTime(nextLowEvent ? nextLowEvent.time : null),
        source: `Pronostico oficial SHN (${station.name}) - incluye ajuste por viento`
    };
}

function roundCoord(n) {
    return Math.round(n * 10) / 10;
}

function formatTimeLocal(date) {
    return date ? new Date(date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
}

const globalCache = new Map();
const GLOBAL_CACHE_TTL_MS = 60 * 60 * 1000;

async function getGlobalForecast(lat, lng) {
    const cacheKey = `${roundCoord(lat)},${roundCoord(lng)}`;
    const cached = globalCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    const neapsModule = await import('neaps');
    const getExtremesPrediction = neapsModule.getExtremesPrediction;

    const now = new Date();
    const start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const prediction = await getExtremesPrediction({ latitude: lat, longitude: lng, start: start, end: end, units: 'meters' });

    const events = (prediction.extremes || [])
        .map(e => ({ type: e.high ? 'high' : 'low', time: new Date(e.time), height: e.level }))
        .sort((a, b) => a.time - b.time);

    const nextHighEvent = events.find(e => e.type === 'high' && e.time > now);
    const nextLowEvent = events.find(e => e.type === 'low' && e.time > now);
    const past = [...events].reverse().find(e => e.time <= now);
    const next = events.find(e => e.time > now);

    let currentHeight = null;
    let isRising = null;
    if (past && next) {
        const span = next.time - past.time;
        const progress = span > 0 ? (now - past.time) / span : 0;
        currentHeight = past.height + (next.height - past.height) * progress;
        isRising = next.height > past.height;
    } else if (next) {
        currentHeight = next.height;
        isRising = true;
    }

    const stationName = (prediction.station && prediction.station.name) || 'estacion cercana';
    const stationCountry = (prediction.station && prediction.station.country) || '';

    const result = {
        success: true,
        current: isRising === null ? '-' : (isRising ? 'Subiendo' : 'Bajando'),
        currentHeight: currentHeight !== null ? currentHeight.toFixed(2) : '--',
        nextHigh: formatTimeLocal(nextHighEvent ? nextHighEvent.time : null),
        nextLow: formatTimeLocal(nextLowEvent ? nextLowEvent.time : null),
        source: `Calculo propio - armonicos (estacion: ${stationName}${stationCountry ? ', ' + stationCountry : ''})`
    };

    globalCache.set(cacheKey, { data: result, expiresAt: Date.now() + GLOBAL_CACHE_TTL_MS });
    return result;
}

router.get('/', async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({ success: false, message: 'lat y lng son requeridos y deben ser numeros' });
        }

        if (isInRioDeLaPlata(lat, lng)) {
            try {
                const result = await getRioDeLaPlataForecast(lat, lng);
                return res.json(result);
            } catch (shnError) {
                console.error('Fallo la capa SHN, usando calculo astronomico como respaldo:', shnError.message);
            }
        }

        const result = await getGlobalForecast(lat, lng);
        res.json(result);

    } catch (error) {
        console.error('Error en /api/tides:', error.message);
        res.status(502).json({ success: false, message: error.message });
    }
});

module.exports = router;
