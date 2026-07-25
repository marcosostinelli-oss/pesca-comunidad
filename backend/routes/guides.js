const express = require('express');
const router = express.Router();
const { dbRun, dbGet, dbAll } = require('../database'); // ✅ USAR CONEXIÓN COMPARTIDA
const { authenticateToken } = require('../middleware/auth');

// Obtener todos los guías activos
router.get('/', async (req, res) => {
    try {
        const { zone, min_price, max_price } = req.query;
        
        let sql = `
            SELECT g.*, u.name, u.email,
                   AVG(gr.rating) as avg_rating,
                   COUNT(gr.id) as total_reviews
            FROM guides g
            JOIN users u ON g.user_id = u.id
            LEFT JOIN guide_reviews gr ON g.id = gr.guide_id
            WHERE g.is_active = 1
        `;
        
        const params = [];
        
        if (zone) {
            sql += ' AND (g.zones LIKE ? OR g.zones = ?)';
            params.push(`%${zone}%`, zone);
        }
        
        if (min_price) {
            sql += ' AND g.price_per_day >= ?';
            params.push(min_price);
        }
        
        if (max_price) {
            sql += ' AND g.price_per_day <= ?';
            params.push(max_price);
        }
        
        sql += ' GROUP BY g.id ORDER BY avg_rating DESC LIMIT 50';
        
        const guides = await dbAll(sql, params);
        
        // Parsear JSON de servicios y zonas
        const parsedGuides = guides.map(guide => ({
            ...guide,
            services: guide.services ? JSON.parse(guide.services) : [],
            zones: guide.zones ? JSON.parse(guide.zones) : []
        }));
        
        res.json(parsedGuides);
    } catch (error) {
        console.error('Error obteniendo guías:', error);
        res.status(500).json({ error: 'Error al obtener guías' });
    }
});

// Obtener guía por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT g.*, u.name, u.email,
                   AVG(gr.rating) as avg_rating,
                   COUNT(gr.id) as total_reviews
            FROM guides g
            JOIN users u ON g.user_id = u.id
            LEFT JOIN guide_reviews gr ON g.id = gr.guide_id
            WHERE g.id = ?
            GROUP BY g.id
        `;
        
        const guide = await dbGet(sql, [id]);
        
        if (!guide) {
            return res.status(404).json({ error: 'Guía no encontrado' });
        }
        
        // Obtener servicios del guía
        const services = await dbAll('SELECT * FROM guide_services WHERE guide_id = ?', [id]);
        
        // Obtener reviews
        const reviews = await dbAll(`
            SELECT gr.*, u.name
            FROM guide_reviews gr
            JOIN users u ON gr.user_id = u.id
            WHERE gr.guide_id = ?
            ORDER BY gr.created_at DESC
            LIMIT 10
        `, [id]);
        
        // Parsear JSON
        const parsedGuide = {
            ...guide,
            services: guide.services ? JSON.parse(guide.services) : [],
            zones: guide.zones ? JSON.parse(guide.zones) : [],
            services_list: services,
            reviews
        };
        
        res.json(parsedGuide);
    } catch (error) {
        console.error('Error obteniendo guía:', error);
        res.status(500).json({ error: 'Error al obtener guía' });
    }
});

// Obtener guía por user_id
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const sql = `
            SELECT g.*, u.name, u.email
            FROM guides g
            JOIN users u ON g.user_id = u.id
            WHERE g.user_id = ?
        `;
        
        const guide = await dbGet(sql, [userId]);
        
        if (!guide) {
            return res.status(404).json({ error: 'Guía no encontrado' });
        }
        
        // Parsear JSON
        const parsedGuide = {
            ...guide,
            services: guide.services ? JSON.parse(guide.services) : [],
            zones: guide.zones ? JSON.parse(guide.zones) : []
        };
        
        res.json(parsedGuide);
    } catch (error) {
        console.error('Error obteniendo guía por usuario:', error);
        res.status(500).json({ error: 'Error al obtener guía' });
    }
});

// Registrar como guía (requiere autenticación)
router.post('/register', authenticateToken, async (req, res) => {
    try {
        const { 
            license_number, 
            years_experience, 
            description, 
            services, 
            zones, 
            price_per_day,
            contact_phone,
            contact_email 
        } = req.body;
        
        // Verificar si ya es guía
        const existingGuide = await dbGet('SELECT * FROM guides WHERE user_id = ?', [req.user.userId]);
        
        if (existingGuide) {
            return res.status(400).json({ error: 'Ya estás registrado como guía' });
        }
        
        // Crear guía
        const sql = `
            INSERT INTO guides (
                user_id, license_number, years_experience, description, 
                services, zones, price_per_day, contact_phone, contact_email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            req.user.userId,
            license_number || null,
            years_experience || 0,
            description || '',
            services ? JSON.stringify(services) : '[]',
            zones ? JSON.stringify(zones) : '[]',
            price_per_day || 0,
            contact_phone || null,
            contact_email || req.user.email
        ];
        
        const result = await dbRun(sql, params);
        
        // Actualizar tipo de usuario
        await dbRun('UPDATE users SET user_type = ? WHERE id = ?', ['guide', req.user.userId]);
        
        res.json({
            message: 'Registro como guía exitoso',
            guideId: result.lastID
        });
    } catch (error) {
        console.error('Error registrando guía:', error);
        res.status(500).json({ error: 'Error al registrarse como guía' });
    }
});

// Actualizar perfil de guía
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el guía pertenece al usuario
        const guide = await dbGet('SELECT * FROM guides WHERE id = ? AND user_id = ?', [id, req.user.userId]);
        
        if (!guide) {
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        const { 
            license_number, 
            years_experience, 
            description, 
            services, 
            zones, 
            price_per_day,
            contact_phone,
            contact_email,
            is_active 
        } = req.body;
        
        const sql = `
            UPDATE guides SET
                license_number = COALESCE(?, license_number),
                years_experience = COALESCE(?, years_experience),
                description = COALESCE(?, description),
                services = COALESCE(?, services),
                zones = COALESCE(?, zones),
                price_per_day = COALESCE(?, price_per_day),
                contact_phone = COALESCE(?, contact_phone),
                contact_email = COALESCE(?, contact_email),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const params = [
            license_number,
            years_experience,
            description,
            services ? JSON.stringify(services) : null,
            zones ? JSON.stringify(zones) : null,
            price_per_day,
            contact_phone,
            contact_email,
            is_active,
            id
        ].map(param => param === undefined ? null : param);
        
        await dbRun(sql, params);
        
        res.json({ message: 'Perfil actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando guía:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// Agregar review a guía
router.post('/:id/reviews', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment, trip_date } = req.body;
        
        // Verificar que el guía existe
        const guide = await dbGet('SELECT user_id FROM guides WHERE id = ?', [id]);
        
        if (!guide) {
            return res.status(404).json({ error: 'Guía no encontrado' });
        }
        
        // Verificar que el usuario no sea el propio guía
        if (guide.user_id === req.user.userId) {
            return res.status(400).json({ error: 'No puedes calificarte a ti mismo' });
        }
        
        // Verificar si ya ha hecho una review
        const existingReview = await dbGet(
            'SELECT * FROM guide_reviews WHERE guide_id = ? AND user_id = ?', 
            [id, req.user.userId]
        );
        
        if (existingReview) {
            return res.status(400).json({ error: 'Ya has calificado a este guía' });
        }
        
        // Validar rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'El rating debe estar entre 1 y 5' });
        }
        
        const sql = `
            INSERT INTO guide_reviews (guide_id, user_id, rating, comment, trip_date)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await dbRun(sql, [id, req.user.userId, rating, comment || null, trip_date || null]);
        
        res.json({
            message: 'Review agregada correctamente',
            reviewId: result.lastID
        });
    } catch (error) {
        console.error('Error agregando review:', error);
        res.status(500).json({ error: 'Error al agregar review' });
    }
});

// Obtener reviews de un guía
router.get('/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        
        const reviews = await dbAll(`
            SELECT gr.*, u.name
            FROM guide_reviews gr
            JOIN users u ON gr.user_id = u.id
            WHERE gr.guide_id = ?
            ORDER BY gr.created_at DESC
            LIMIT 20
        `, [id]);
        
        res.json(reviews);
    } catch (error) {
        console.error('Error obteniendo reviews:', error);
        res.status(500).json({ error: 'Error al obtener reviews' });
    }
});

// Obtener guías por proximidad (para mapa)
router.get('/map/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 50 } = req.query; // radius en km
        
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Se requieren coordenadas' });
        }
        
        // Esta es una aproximación simple - en producción usarías PostGIS o cálculos más precisos
        const sql = `
            SELECT g.*, u.name,
                   AVG(gr.rating) as avg_rating,
                   6371 * acos(
                       cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?))
                       + sin(radians(?)) * sin(radians(latitude))
                   ) as distance
            FROM guides g
            JOIN users u ON g.user_id = u.id
            LEFT JOIN guide_reviews gr ON g.id = gr.guide_id
            WHERE g.is_active = 1
            GROUP BY g.id
            HAVING distance < ?
            ORDER BY distance
            LIMIT 50
        `;
        
        const guides = await dbAll(sql, [parseFloat(lat), parseFloat(lng), parseFloat(lat), parseFloat(radius)]);
        
        // Parsear JSON
        const parsedGuides = guides.map(guide => ({
            ...guide,
            services: guide.services ? JSON.parse(guide.services) : [],
            zones: guide.zones ? JSON.parse(guide.zones) : []
        }));
        
        res.json(parsedGuides);
    } catch (error) {
        console.error('Error obteniendo guías cercanas:', error);
        res.status(500).json({ error: 'Error al obtener guías cercanas' });
    }
});

module.exports = router;