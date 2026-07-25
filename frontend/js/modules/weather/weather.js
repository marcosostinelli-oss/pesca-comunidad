// ==================================================
// SERVICIO DE CLIMA - OPEN-METEO (GRATUITO, SIN API KEY)
// Capa de datos: solo fetch y cálculos, sin HTML.
// Reemplaza la lógica que antes vivía duplicada en map-core.js
// ==================================================

export class WeatherService {

    // Clima actual
    async getCurrentWeather(lat, lng) {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=auto`
        );

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (!data.current_weather) {
            throw new Error('No se pudieron obtener datos del clima');
        }

        const weather = data.current_weather;

        return {
            temperature: Math.round(weather.temperature),
            windspeed: Math.round(weather.windspeed),
            winddirection: weather.winddirection,
            weathercode: weather.weathercode,
            description: this.getWeatherDescription(weather.weathercode),
            emoji: this.getWeatherEmoji(weather.weathercode)
        };
    }

    // Pronóstico extendido (por defecto 3 días)
    async getForecast(lat, lng, days = 3) {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=${days}`
        );

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (!data.daily) {
            throw new Error('No se pudieron obtener datos del pronóstico');
        }

        const daily = data.daily;
        const forecast = [];

        for (let i = 0; i < days; i++) {
            // ✅ Parsear como fecha LOCAL (año, mes, día) para evitar que
            // "new Date('2026-07-25')" se interprete como UTC y se corra
            // un día hacia atrás en husos horarios negativos (ej: Argentina, UTC-3)
            const [year, month, day] = daily.time[i].split('-').map(Number);
            const date = new Date(year, month - 1, day);
            forecast.push({
                isToday: i === 0,
                dayName: date.toLocaleDateString('es-ES', { weekday: 'long' }),
                formattedDate: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                maxTemp: Math.round(daily.temperature_2m_max[i]),
                minTemp: Math.round(daily.temperature_2m_min[i]),
                weathercode: daily.weathercode[i],
                emoji: this.getWeatherEmoji(daily.weathercode[i])
            });
        }

        return forecast;
    }

    // Mareas simuladas según ubicación y hora (misma lógica que antes en map-core.js)
    getTides(lat, lng) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        const isRising = hours < 6 || (hours >= 12 && hours < 18);
        const currentHeight = (1.0 + Math.sin((hours + minutes / 60) * Math.PI / 12) * 0.8).toFixed(1);

        const nextHigh = hours < 6 ? '06:30' : hours < 18 ? '18:20' : '06:30 (+1)';
        const nextLow = hours < 12 ? '12:45' : '00:45 (+1)';

        return {
            current: isRising ? 'Subiendo' : 'Bajando',
            currentHeight,
            nextHigh,
            nextLow
        };
    }

    // Puntaje de condiciones de pesca en base al clima actual
    calculateFishingScore(weather) {
        let score = 7;

        const temp = weather.temperature;
        if (temp >= 15 && temp <= 25) score += 2;
        else if (temp >= 10 && temp <= 30) score += 1;
        else score -= 1;

        const wind = weather.windspeed;
        if (wind >= 5 && wind <= 15) score += 1;
        else if (wind > 20) score -= 2;

        const weatherCode = weather.weathercode;
        if (weatherCode === 0 || weatherCode === 1) score += 1;
        else if (weatherCode >= 61 && weatherCode <= 82) score -= 2;
        else if (weatherCode === 95) score -= 3;

        return Math.max(1, Math.min(10, score));
    }

    // ==================================================
    // Utilidades de interpretación de códigos de clima (Open-Meteo)
    // ==================================================

    getWeatherDescription(weatherCode) {
        const descriptions = {
            0: 'Despejado',
            1: 'Mayormente despejado',
            2: 'Parcialmente nublado',
            3: 'Nublado',
            45: 'Niebla',
            48: 'Niebla escarchada',
            51: 'Llovizna ligera',
            53: 'Llovizna moderada',
            55: 'Llovizna densa',
            61: 'Lluvia ligera',
            63: 'Lluvia moderada',
            65: 'Lluvia intensa',
            80: 'Chubascos ligeros',
            81: 'Chubascos moderados',
            82: 'Chubascos violentos',
            95: 'Tormenta eléctrica'
        };
        return descriptions[weatherCode] || 'Condición desconocida';
    }

    getWeatherEmoji(weatherCode) {
        const emojis = {
            0: '☀️',
            1: '🌤️',
            2: '⛅',
            3: '☁️',
            45: '🌫️',
            48: '🌫️',
            51: '🌦️',
            53: '🌦️',
            55: '🌧️',
            61: '🌧️',
            63: '🌧️',
            65: '🌧️',
            80: '🌦️',
            81: '🌦️',
            82: '⛈️',
            95: '⛈️'
        };
        return emojis[weatherCode] || '🌈';
    }
}
