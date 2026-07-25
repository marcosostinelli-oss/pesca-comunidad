const express = require('express');
const router = express.Router();
const { dbRun, dbGet, dbAll } = require('../database'); // ✅ USAR CONEXIÓN COMPARTIDA
const { authenticateToken } = require('../middleware/auth');

// ==================================================
// ENDPOINTS DE LA API PARA SPOTS - OPTIMIZADOS
// ==================================================

// GET /api/spots - Obtener todos los spots públicos
router.get('/', async (req, res) => {
    try {
        console.log('📥 GET /api/spots - Obteniendo spots públicos');
        
        // Agregar paginación para evitar cargar demasiados datos
        const { limit = 50, offset = 0 } = req.query;
        
        const spots = await dbAll(`
            SELECT 
                fs.*, 
                u.name as user_name
            FROM fishing_spots fs 
            LEFT JOIN users u ON fs.user_id = u.id 
            WHERE (fs.visibility = 'public' OR fs.visibility = 'público')
            ORDER BY fs.created_at DESC
            LIMIT ? OFFSET ?
        `, [parseInt(limit), parseInt(offset)]);

        // ✅ OPTIMIZADO: Parsear solo si existe
        const spotsWithParsedFacilities = spots.map(spot => {
            if (spot.facilities && spot.facilities !== '[]' && spot.facilities !== '') {
                try {
                    spot.facilities = JSON.parse(spot.facilities);
                } catch (e) {
                    console.warn(`⚠️ No se pudo parsear facilities para el spot ${spot.id}:`, spot.facilities);
                    spot.facilities = [];
                }
            } else {
                spot.facilities = [];
            }
            return spot;
        });

        console.log(`✅ Enviando ${spotsWithParsedFacilities.length} spots públicos`);
        res.json(spotsWithParsedFacilities);

    } catch (error) {
        console.error('❌ Error obteniendo spots:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// GET /api/spots/public - Solo spots públicos (alias)
router.get('/public', async (req, res) => {
    try {
        console.log('📥 GET /api/spots/public - Obteniendo spots públicos');
        
        const spots = await dbAll(`
            SELECT 
                fs.*, 
                u.name as user_name
            FROM fishing_spots fs 
            LEFT JOIN users u ON fs.user_id = u.id 
            WHERE (fs.visibility = 'public' OR fs.visibility = 'público')
            ORDER BY fs.created_at DESC
            LIMIT 100
        `);

        const spotsWithParsedFacilities = spots.map(spot => {
            if (spot.facilities && spot.facilities !== '[]' && spot.facilities !== '') {
                try {
                    spot.facilities = JSON.parse(spot.facilities);
                } catch (e) {
                    spot.facilities = [];
                }
            } else {
                spot.facilities = [];
            }
            return spot;
        });

        console.log(`✅ Enviando ${spotsWithParsedFacilities.length} spots públicos`);
        res.json(spotsWithParsedFacilities);

    } catch (error) {
        console.error('❌ Error obteniendo spots públicos:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// GET /api/spots/my-spots - Obtener spots del usuario autenticado
router.get('/my-spots', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`📥 GET /api/spots/my-spots - Obteniendo spots del usuario ${userId}`);
        
        const spots = await dbAll(`
            SELECT 
                fs.*, 
                u.name as user_name
            FROM fishing_spots fs 
            LEFT JOIN users u ON fs.user_id = u.id 
            WHERE fs.user_id = ?
            ORDER BY fs.created_at DESC
            LIMIT 100
        `, [userId]);

        const spotsWithParsedFacilities = spots.map(spot => {
            if (spot.facilities && spot.facilities !== '[]' && spot.facilities !== '') {
                try {
                    spot.facilities = JSON.parse(spot.facilities);
                } catch (e) {
                    spot.facilities = [];
                }
            } else {
                spot.facilities = [];
            }
            return spot;
        });

        console.log(`✅ Enviando ${spotsWithParsedFacilities.length} spots del usuario`);
        res.json(spotsWithParsedFacilities);

    } catch (error) {
        console.error('❌ Error obteniendo spots del usuario:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// GET /api/spots/all-user-spots - Obtener todos los spots del usuario
router.get('/all-user-spots', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`📥 GET /api/spots/all-user-spots - Usuario ${userId}`);
        
        // Usar Promise.all para ejecutar ambas consultas en paralelo
        const [userSpots, publicSpots] = await Promise.all([
            dbAll(`
                SELECT fs.*, u.name as user_name
                FROM fishing_spots fs 
                LEFT JOIN users u ON fs.user_id = u.id 
                WHERE fs.user_id = ?
                ORDER BY fs.created_at DESC
                LIMIT 100
            `, [userId]),
            dbAll(`
                SELECT fs.*, u.name as user_name
                FROM fishing_spots fs 
                LEFT JOIN users u ON fs.user_id = u.id 
                WHERE (fs.visibility = 'public' OR fs.visibility = 'público') 
                AND fs.user_id != ?
                ORDER BY fs.created_at DESC
                LIMIT 100
            `, [userId])
        ]);

        const allSpots = [...userSpots, ...publicSpots];

        const spotsWithParsedFacilities = allSpots.map(spot => {
            if (spot.facilities && spot.facilities !== '[]' && spot.facilities !== '') {
                try {
                    spot.facilities = JSON.parse(spot.facilities);
                } catch (e) {
                    spot.facilities = [];
                }
            } else {
                spot.facilities = [];
            }
            return spot;
        });

        console.log(`✅ Enviando ${spotsWithParsedFacilities.length} spots`);
        res.json(spotsWithParsedFacilities);

    } catch (error) {
        console.error('❌ Error obteniendo todos los spots del usuario:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// GET /api/spots/:id - Obtener un spot específico
router.get('/:id', async (req, res) => {
    try {
        const spotId = req.params.id;
        console.log(`📥 GET /api/spots/${spotId} - Obteniendo spot específico`);
        
        const spot = await dbGet(`
            SELECT fs.*, u.name as user_name
            FROM fishing_spots fs 
            LEFT JOIN users u ON fs.user_id = u.id 
            WHERE fs.id = ?
        `, [spotId]);

        if (!spot) {
            return res.status(404).json({ error: 'Spot no encontrado' });
        }

        if (spot.facilities && spot.facilities !== '[]' && spot.facilities !== '') {
            try {
                spot.facilities = JSON.parse(spot.facilities);
            } catch (e) {
                spot.facilities = [];
            }
        } else {
            spot.facilities = [];
        }

        console.log(`✅ Spot encontrado: ${spot.name}`);
        res.json(spot);

    } catch (error) {
        console.error('❌ Error obteniendo spot:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// POST /api/spots - Crear nuevo spot
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { 
            name, 
            latitude, 
            longitude, 
            water_type, 
            type,
            description, 
            species, 
            best_time, 
            visibility,
            accessibility,
            facilities
        } = req.body;

        console.log('📤 POST /api/spots - Creando spot');

        const spotType = type || water_type;

        if (!name || !latitude || !longitude || !spotType) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios' 
            });
        }

        let facilitiesString = null;
        if (facilities && Array.isArray(facilities) && facilities.length > 0) {
            facilitiesString = JSON.stringify(facilities);
        }

        const result = await dbRun(
            `INSERT INTO fishing_spots 
            (user_id, name, latitude, longitude, water_type, type, description, species, best_time, visibility, accessibility, facilities) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, 
                name, 
                latitude, 
                longitude, 
                spotType,
                spotType,
                description || null, 
                species || null, 
                best_time || 'mañana', 
                visibility || 'public',
                accessibility || 'moderado',
                facilitiesString
            ]
        );

        const newSpot = await dbGet(`
            SELECT fs.*, u.name as user_name
            FROM fishing_spots fs 
            LEFT JOIN users u ON fs.user_id = u.id 
            WHERE fs.id = ?
        `, [result.lastID]);

        if (newSpot.facilities && newSpot.facilities !== '[]' && newSpot.facilities !== '') {
            try {
                newSpot.facilities = JSON.parse(newSpot.facilities);
            } catch (e) {
                newSpot.facilities = [];
            }
        } else {
            newSpot.facilities = [];
        }

        console.log(`✅ Spot creado: ${newSpot.name} (ID: ${result.lastID})`);
        res.status(201).json(newSpot);

    } catch (error) {
        console.error('❌ Error creando spot:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// PUT /api/spots/:id - Actualizar un spot
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const spotId = req.params.id;
        const userId = req.user.userId;
        const { 
            name, 
            latitude, 
            longitude, 
            water_type, 
            type,
            description, 
            species, 
            best_time, 
            visibility,
            accessibility,
            facilities
        } = req.body;

        console.log(`✏️ PUT /api/spots/${spotId} - Actualizando spot`);

        const spot = await dbGet('SELECT user_id FROM fishing_spots WHERE id = ?', [spotId]);
        
        if (!spot) {
            return res.status(404).json({ error: 'Spot no encontrado' });
        }
        
        if (spot.user_id !== userId) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }

        const spotType = type || water_type;

        if (!name || !latitude || !longitude || !spotType) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios' 
            });
        }

        let facilitiesString = null;
        if (facilities && Array.isArray(facilities) && facilities.length > 0) {
            facilitiesString = JSON.stringify(facilities);
        }

        const result = await dbRun(
            `UPDATE fishing_spots 
            SET name = ?, latitude = ?, longitude = ?, water_type = ?, type = ?, 
                description = ?, species = ?, best_time = ?, visibility = ?, 
                accessibility = ?, facilities = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
                name, 
                latitude, 
                longitude, 
                spotType,
                spotType,
                description || null, 
                species || null, 
                best_time || 'mañana', 
                visibility || 'public',
                accessibility || 'moderado',
                facilitiesString,
                spotId
            ]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Spot no encontrado' });
        }

        const updatedSpot = await dbGet(`
            SELECT fs.*, u.name as user_name
            FROM fishing_spots fs 
            LEFT JOIN users u ON fs.user_id = u.id 
            WHERE fs.id = ?
        `, [spotId]);

        if (updatedSpot.facilities && updatedSpot.facilities !== '[]' && updatedSpot.facilities !== '') {
            try {
                updatedSpot.facilities = JSON.parse(updatedSpot.facilities);
            } catch (e) {
                updatedSpot.facilities = [];
            }
        } else {
            updatedSpot.facilities = [];
        }

        console.log(`✅ Spot actualizado: ${updatedSpot.name}`);
        res.json(updatedSpot);

    } catch (error) {
        console.error('❌ Error actualizando spot:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// DELETE /api/spots/:id - Eliminar un spot
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const spotId = req.params.id;
        const userId = req.user.userId;

        console.log(`🗑️ DELETE /api/spots/${spotId} - Eliminando spot`);

        const spot = await dbGet('SELECT user_id FROM fishing_spots WHERE id = ?', [spotId]);
        
        if (!spot) {
            return res.status(404).json({ error: 'Spot no encontrado' });
        }
        
        if (spot.user_id !== userId) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }

        const result = await dbRun('DELETE FROM fishing_spots WHERE id = ?', [spotId]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Spot no encontrado' });
        }

        console.log(`✅ Spot eliminado: ID ${spotId}`);
        res.status(204).send();

    } catch (error) {
        console.error('❌ Error eliminando spot:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

module.exports = router;