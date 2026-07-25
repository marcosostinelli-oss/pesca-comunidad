const express = require('express');
const router = express.Router();
const { dbRun, dbGet, dbAll } = require('../database'); // ✅ USAR CONEXIÓN COMPARTIDA
const { authenticateToken } = require('../middleware/auth');

// ==================================================
// ENDPOINTS DE LA API PARA AMIGOS - OPTIMIZADOS
// ==================================================

// POST /api/friends/send-request - Enviar solicitud de amistad
router.post('/send-request', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendEmail } = req.body;

        if (!friendEmail) {
            return res.status(400).json({ 
                success: false, 
                message: 'El email del amigo es requerido' 
            });
        }

        const currentUser = await dbGet('SELECT email FROM users WHERE id = ?', [userId]);
        if (currentUser.email === friendEmail) {
            return res.status(400).json({ 
                success: false, 
                message: 'No puedes enviarte una solicitud de amistad a ti mismo' 
            });
        }

        const friendUser = await dbGet('SELECT id, name, email FROM users WHERE email = ?', [friendEmail]);
        
        if (!friendUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        const existingRequest = await dbGet(
            `SELECT id FROM friend_requests 
             WHERE ((from_user_id = ? AND to_user_id = ?) 
             OR (from_user_id = ? AND to_user_id = ?)) 
             AND status = 'pending'`,
            [userId, friendUser.id, friendUser.id, userId]
        );

        if (existingRequest) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya existe una solicitud pendiente' 
            });
        }

        const existingFriend = await dbGet(
            `SELECT id FROM friends 
             WHERE ((user_id = ? AND friend_id = ?) 
             OR (user_id = ? AND friend_id = ?)) 
             AND status = 'accepted'`,
            [userId, friendUser.id, friendUser.id, userId]
        );

        if (existingFriend) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya son amigos' 
            });
        }

        const result = await dbRun(
            'INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, ?)',
            [userId, friendUser.id, 'pending']
        );

        res.json({
            success: true,
            message: 'Solicitud de amistad enviada',
            requestId: result.lastID
        });

    } catch (error) {
        console.error('❌ Error enviando solicitud de amistad:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/friends/pending-requests - Obtener solicitudes pendientes
router.get('/pending-requests', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const pendingRequests = await dbAll(`
            SELECT 
                fr.id,
                fr.from_user_id,
                fr.status,
                fr.created_at,
                u.name as from_user_name,
                u.email as from_user_email
            FROM friend_requests fr
            JOIN users u ON fr.from_user_id = u.id
            WHERE fr.to_user_id = ? AND fr.status = 'pending'
            ORDER BY fr.created_at DESC
            LIMIT 50
        `, [userId]);

        res.json({
            success: true,
            requests: pendingRequests
        });

    } catch (error) {
        console.error('❌ Error obteniendo solicitudes pendientes:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/friends/sent-requests - Obtener solicitudes enviadas
router.get('/sent-requests', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const sentRequests = await dbAll(`
            SELECT 
                fr.id,
                fr.to_user_id,
                fr.status,
                fr.created_at,
                u.name as to_user_name,
                u.email as to_user_email
            FROM friend_requests fr
            JOIN users u ON fr.to_user_id = u.id
            WHERE fr.from_user_id = ? AND fr.status = 'pending'
            ORDER BY fr.created_at DESC
            LIMIT 50
        `, [userId]);

        res.json({
            success: true,
            requests: sentRequests
        });

    } catch (error) {
        console.error('❌ Error obteniendo solicitudes enviadas:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/friends/accept-request - Aceptar solicitud de amistad
router.post('/accept-request', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { requestId } = req.body;

        if (!requestId) {
            return res.status(400).json({ 
                success: false, 
                message: 'El ID de la solicitud es requerido' 
            });
        }

        const request = await dbGet(`
            SELECT * FROM friend_requests 
            WHERE id = ? AND to_user_id = ? AND status = 'pending'
        `, [requestId, userId]);

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitud no encontrada o ya procesada' 
            });
        }

        // Usar una transacción para asegurar atomicidad
        await dbRun('BEGIN TRANSACTION');
        
        try {
            await dbRun('UPDATE friend_requests SET status = ? WHERE id = ?', ['accepted', requestId]);
            await dbRun('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)', [request.from_user_id, userId, 'accepted']);
            await dbRun('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)', [userId, request.from_user_id, 'accepted']);
            await dbRun('COMMIT');
        } catch (error) {
            await dbRun('ROLLBACK');
            throw error;
        }

        res.json({
            success: true,
            message: 'Solicitud de amistad aceptada'
        });

    } catch (error) {
        console.error('❌ Error aceptando solicitud de amistad:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// POST /api/friends/reject-request - Rechazar solicitud de amistad
router.post('/reject-request', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { requestId } = req.body;

        if (!requestId) {
            return res.status(400).json({ 
                success: false, 
                message: 'El ID de la solicitud es requerido' 
            });
        }

        const request = await dbGet(`
            SELECT * FROM friend_requests 
            WHERE id = ? AND to_user_id = ? AND status = 'pending'
        `, [requestId, userId]);

        if (!request) {
            return res.status(404).json({ 
                success: false, 
                message: 'Solicitud no encontrada o ya procesada' 
            });
        }

        await dbRun('UPDATE friend_requests SET status = ? WHERE id = ?', ['rejected', requestId]);

        res.json({
            success: true,
            message: 'Solicitud de amistad rechazada'
        });

    } catch (error) {
        console.error('❌ Error rechazando solicitud de amistad:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/friends/list - Obtener lista de amigos
router.get('/list', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const friends = await dbAll(`
            SELECT 
                f.id,
                f.friend_id,
                f.status,
                f.created_at,
                u.name,
                u.email,
                u.whatsapp,
                u.experience,
                u.favorite_species,
                u.city,
                u.province,
                u.country
            FROM friends f
            JOIN users u ON f.friend_id = u.id
            WHERE f.user_id = ? AND f.status = 'accepted'
            ORDER BY u.name ASC
            LIMIT 100
        `, [userId]);

        res.json({
            success: true,
            friends: friends
        });

    } catch (error) {
        console.error('❌ Error obteniendo lista de amigos:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// DELETE /api/friends/remove - Eliminar amigo
router.delete('/remove', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { friendId } = req.body;

        if (!friendId) {
            return res.status(400).json({ 
                success: false, 
                message: 'El ID del amigo es requerido' 
            });
        }

        const friendship = await dbGet(`
            SELECT id FROM friends 
            WHERE user_id = ? AND friend_id = ? AND status = 'accepted'
        `, [userId, friendId]);

        if (!friendship) {
            return res.status(404).json({ 
                success: false, 
                message: 'Amistad no encontrada' 
            });
        }

        await dbRun('BEGIN TRANSACTION');
        
        try {
            await dbRun('DELETE FROM friends WHERE user_id = ? AND friend_id = ?', [userId, friendId]);
            await dbRun('DELETE FROM friends WHERE user_id = ? AND friend_id = ?', [friendId, userId]);
            await dbRun('COMMIT');
        } catch (error) {
            await dbRun('ROLLBACK');
            throw error;
        }

        res.json({
            success: true,
            message: 'Amigo eliminado correctamente'
        });

    } catch (error) {
        console.error('❌ Error eliminando amigo:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/friends/search - Buscar usuarios por nombre o email
router.get('/search', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({ 
                success: false, 
                message: 'La búsqueda debe tener al menos 2 caracteres' 
            });
        }

        const searchTerm = `%${query}%`;
        const users = await dbAll(`
            SELECT 
                id,
                name,
                email,
                whatsapp,
                experience,
                favorite_species,
                city,
                province,
                country
            FROM users 
            WHERE (name LIKE ? OR email LIKE ?) 
            AND id != ? 
            AND is_active = 1
            ORDER BY name ASC
            LIMIT 20
        `, [searchTerm, searchTerm, userId]);

        res.json({
            success: true,
            users: users
        });

    } catch (error) {
        console.error('❌ Error buscando usuarios:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// GET /api/friends/stats - Obtener estadísticas de amigos
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [friendsCount, pendingRequestsCount, sentRequestsCount] = await Promise.all([
            dbGet('SELECT COUNT(*) as count FROM friends WHERE user_id = ? AND status = "accepted"', [userId]),
            dbGet('SELECT COUNT(*) as count FROM friend_requests WHERE to_user_id = ? AND status = "pending"', [userId]),
            dbGet('SELECT COUNT(*) as count FROM friend_requests WHERE from_user_id = ? AND status = "pending"', [userId])
        ]);

        const stats = {
            friends: friendsCount.count,
            pendingRequests: pendingRequestsCount.count,
            sentRequests: sentRequestsCount.count
        };

        res.json({
            success: true,
            stats: stats
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de amigos:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

module.exports = router;