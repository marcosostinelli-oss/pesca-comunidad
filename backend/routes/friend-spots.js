const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

// Configuración de la base de datos
const dbPath = path.join(__dirname, '..', 'pesca-comunidad.db');
const db = new sqlite3.Database(dbPath);

// 🔧 PROMISIFY PARA LAS RUTAS
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// ==================================================
// ENDPOINTS DE LA API PARA SPOTS DE AMIGOS
// ==================================================

// GET /api/friend-spots - Obtener spots de amigos
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`📥 GET /api/friend-spots - Obteniendo spots de amigos para usuario ${userId}`);

        const friendSpots = await dbAll(`
            SELECT DISTINCT
                fs.*, 
                u.name as user_name,
                u.email as user_email
            FROM fishing_spots fs 
            LEFT JOIN users u ON fs.user_id = u.id 
            LEFT JOIN friends f ON (fs.user_id = f.friend_id AND f.user_id = ?)
            WHERE (fs.visibility = 'friends-only' OR fs.visibility = 'solo-amigos')
            AND f.status = 'accepted'
            AND fs.user_id != ?
            ORDER BY fs.created_at DESC
        `, [userId, userId]);

        // Parsear facilities de JSON string a array
        const spotsWithParsedFacilities = friendSpots.map(spot => {
            if (spot.facilities) {
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

        console.log(`✅ Enviando ${spotsWithParsedFacilities.length} spots de amigos`);
        res.json(spotsWithParsedFacilities);

    } catch (error) {
        console.error('❌ Error obteniendo spots de amigos:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// GET /api/friend-spots/all - Obtener todos los spots (públicos + amigos + propios)
router.get('/all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`📥 GET /api/friend-spots/all - Obteniendo TODOS los spots para usuario ${userId}`);

        // Spots del usuario
        const userSpots = await dbAll(`
            SELECT 
                fs.*, 
                u.name as user_name
            FROM fishing_spots fs 
            LEFT JOIN users u ON fs.user_id = u.id 
            WHERE fs.user_id = ?
            ORDER BY fs.created_at DESC
        `, [userId]);

        // Spots públicos de otros usuarios
        const publicSpots = await dbAll(`
            SELECT 
                fs.*, 
                u.name as user_name
            FROM fishing_spots fs 
            LEFT JOIN users u ON fs.user_id = u.id 
            WHERE (fs.visibility = 'public' OR fs.visibility = 'público') 
            AND fs.user_id != ?
            ORDER BY fs.created_at DESC
        `, [userId]);

        // Spots de amigos
        const friendSpots = await dbAll(`
            SELECT DISTINCT
                fs.*, 
                u.name as user_name
            FROM fishing_spots fs 
            LEFT JOIN users u ON fs.user_id = u.id 
            LEFT JOIN friends f ON (fs.user_id = f.friend_id AND f.user_id = ?)
            WHERE (fs.visibility = 'friends-only' OR fs.visibility = 'solo-amigos')
            AND f.status = 'accepted'
            AND fs.user_id != ?
            ORDER BY fs.created_at DESC
        `, [userId, userId]);

        // Combinar todos los spots
        const allSpots = [...userSpots, ...publicSpots, ...friendSpots];

        // Parsear facilities de JSON string a array para todos los spots
        const spotsWithParsedFacilities = allSpots.map(spot => {
            if (spot.facilities) {
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

        console.log(`✅ Enviando ${spotsWithParsedFacilities.length} spots totales (${userSpots.length} propios + ${publicSpots.length} públicos + ${friendSpots.length} de amigos)`);
        res.json(spotsWithParsedFacilities);

    } catch (error) {
        console.error('❌ Error obteniendo todos los spots:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

module.exports = router;