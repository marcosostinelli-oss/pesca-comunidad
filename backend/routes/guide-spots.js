const express = require('express');
const router = express.Router();
const { db, dbRun, dbGet, dbAll } = require('../database');
const { authenticateToken, isGuide } = require('../middleware/auth'); // ✅ CORREGIDO

// Middleware para verificar si es guía (ahora ya viene del auth.js)
const verifyIsGuide = async (req, res, next) => {
    try {
        const guide = await dbGet('SELECT * FROM guides WHERE user_id = ? AND is_active = 1', [req.user.userId]);
        
        if (!guide) {
            return res.status(403).json({ 
                success: false,
                message: 'Debes ser guía activo para realizar esta acción' 
            });
        }

        req.guide = guide;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Error verificando estado de guía' });
    }
};

// Crear spot como guía (con icono diferente)
router.post('/', authenticateToken, verifyIsGuide, async (req, res) => {
    try {
        const { 
            name, 
            description, 
            latitude, 
            longitude, 
            fishing_conditions,
            best_season,
            fish_species,
            access_type,
            public 
        } = req.body;
        
        if (!name || !latitude || !longitude) {
            return res.status(400).json({ error: 'Nombre y coordenadas son requeridos' });
        }
        
        // Usar la tabla de spots (fishing_spots)
        const spotsTableName = 'fishing_spots';
        
        const sql = `
            INSERT INTO ${spotsTableName} (
                name, description, latitude, longitude, 
                fishing_conditions, best_season, fish_species,
                access_type, public, user_id, spot_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            name,
            description || '',
            parseFloat(latitude),
            parseFloat(longitude),
            fishing_conditions || '',
            best_season || '',
            fish_species ? JSON.stringify(fish_species) : '[]',
            access_type || 'public',
            public !== undefined ? (public ? 1 : 0) : 1,
            req.user.userId,
            'guide'
        ];
        
        const result = await dbRun(sql, params);
        
        res.json({
            message: 'Spot de guía creado correctamente',
            spotId: result.lastID
        });
    } catch (error) {
        console.error('Error creando spot de guía:', error);
        res.status(500).json({ error: 'Error al crear spot' });
    }
});

// Obtener spots de un guía específico
router.get('/guide/:guideId', async (req, res) => {
    try {
        const { guideId } = req.params;
        
        // Obtener user_id del guía
        const guide = await dbGet('SELECT user_id FROM guides WHERE id = ?', [guideId]);
        
        if (!guide) {
            return res.status(404).json({ error: 'Guía no encontrado' });
        }
        
        const spotsTableName = 'fishing_spots';
        
        const sql = `
            SELECT s.*, u.username 
            FROM ${spotsTableName} s
            JOIN users u ON s.user_id = u.id
            WHERE s.user_id = ? AND s.spot_type = 'guide'
            ORDER BY s.created_at DESC
        `;
        
        const spots = await dbAll(sql, [guide.user_id]);
        
        // Parsear fish_species si es JSON
        const parsedSpots = spots.map(spot => ({
            ...spot,
            fish_species: spot.fish_species ? JSON.parse(spot.fish_species) : []
        }));
        
        res.json(parsedSpots);
    } catch (error) {
        console.error('Error obteniendo spots de guía:', error);
        res.status(500).json({ error: 'Error al obtener spots' });
    }
});

// Obtener spots de todos los guías para el mapa
router.get('/map/all', async (req, res) => {
    try {
        const spotsTableName = 'fishing_spots';
        
        const sql = `
            SELECT 
                s.*, 
                u.username,
                u.user_type,
                g.description as guide_description,
                g.price_per_day,
                g.contact_phone,
                g.contact_email
            FROM ${spotsTableName} s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN guides g ON u.id = g.user_id
            WHERE u.user_type = 'guide' 
            AND (s.public = 1 OR ? = 1)
            ORDER BY s.created_at DESC
        `;
        
        // Por defecto solo mostrar públicos
        const showPrivate = req.query.user_id ? 1 : 0;
        
        const spots = await dbAll(sql, [showPrivate]);
        
        // Parsear fish_species si es JSON
        const parsedSpots = spots.map(spot => ({
            ...spot,
            fish_species: spot.fish_species ? JSON.parse(spot.fish_species) : []
        }));
        
        res.json(parsedSpots);
    } catch (error) {
        console.error('Error obteniendo spots de guías:', error);
        res.status(500).json({ error: 'Error al obtener spots de guías' });
    }
});

// Obtener mis spots como guía (autenticado)
router.get('/my-spots', authenticateToken, verifyIsGuide, async (req, res) => {
    try {
        const spotsTableName = 'fishing_spots';
        
        const sql = `
            SELECT * FROM ${spotsTableName} 
            WHERE user_id = ? AND spot_type = 'guide'
            ORDER BY created_at DESC
        `;
        
        const spots = await dbAll(sql, [req.user.userId]);
        
        // Parsear fish_species si es JSON
        const parsedSpots = spots.map(spot => ({
            ...spot,
            fish_species: spot.fish_species ? JSON.parse(spot.fish_species) : []
        }));
        
        res.json(parsedSpots);
    } catch (error) {
        console.error('Error obteniendo mis spots:', error);
        res.status(500).json({ error: 'Error al obtener mis spots' });
    }
});

// Actualizar spot de guía
router.put('/:spotId', authenticateToken, verifyIsGuide, async (req, res) => {
    try {
        const { spotId } = req.params;
        const spotsTableName = 'fishing_spots';
        
        // Verificar que el spot pertenece al guía
        const spot = await dbGet(
            `SELECT * FROM ${spotsTableName} WHERE id = ? AND user_id = ? AND spot_type = 'guide'`,
            [spotId, req.user.userId]
        );
        
        if (!spot) {
            return res.status(404).json({ error: 'Spot no encontrado o no autorizado' });
        }
        
        const { 
            name, 
            description, 
            fishing_conditions,
            best_season,
            fish_species,
            access_type,
            public 
        } = req.body;
        
        const sql = `
            UPDATE ${spotsTableName} SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                fishing_conditions = COALESCE(?, fishing_conditions),
                best_season = COALESCE(?, best_season),
                fish_species = COALESCE(?, fish_species),
                access_type = COALESCE(?, access_type),
                public = COALESCE(?, public)
            WHERE id = ?
        `;
        
        const params = [
            name,
            description,
            fishing_conditions,
            best_season,
            fish_species ? JSON.stringify(fish_species) : null,
            access_type,
            public,
            spotId
        ].map(param => param === undefined ? null : param);
        
        await dbRun(sql, params);
        
        res.json({ message: 'Spot actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando spot:', error);
        res.status(500).json({ error: 'Error al actualizar spot' });
    }
});

// Eliminar spot de guía
router.delete('/:spotId', authenticateToken, verifyIsGuide, async (req, res) => {
    try {
        const { spotId } = req.params;
        const spotsTableName = 'fishing_spots';
        
        // Verificar que el spot pertenece al guía
        const spot = await dbGet(
            `SELECT * FROM ${spotsTableName} WHERE id = ? AND user_id = ? AND spot_type = 'guide'`,
            [spotId, req.user.userId]
        );
        
        if (!spot) {
            return res.status(404).json({ error: 'Spot no encontrado o no autorizado' });
        }
        
        await dbRun(`DELETE FROM ${spotsTableName} WHERE id = ?`, [spotId]);
        
        res.json({ message: 'Spot eliminado correctamente' });
    } catch (error) {
        console.error('Error eliminando spot:', error);
        res.status(500).json({ error: 'Error al eliminar spot' });
    }
});

module.exports = router;