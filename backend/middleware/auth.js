// ==================================================
// MIDDLEWARE DE AUTENTICACIÓN
// ==================================================

const jwt = require('jsonwebtoken');
// ✅ Usar la conexión compartida y optimizada (WAL, timeouts, cache) en vez de abrir una propia
const { dbGet } = require('../database');

// La clave secreta se carga desde .env (server.js corre dotenv.config() antes de importar este módulo)
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'] || req.header('authorization');

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido'
        });
    }

    // Extraer el token de forma robusta
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({
            success: false,
            message: 'Token de acceso requerido'
        });
    }

    // Verificar que el token tenga formato JWT básico (3 partes separadas por puntos)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        return res.status(403).json({
            success: false,
            message: 'Token con formato inválido'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded.userId) {
            return res.status(403).json({
                success: false,
                message: 'Token incompleto: falta userId'
            });
        }

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            name: decoded.name
        };

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: `Token inválido: ${error.message}`
            });
        } else {
            console.error('❌ Error verificando token:', error.message);
            return res.status(403).json({
                success: false,
                message: `Error de autenticación: ${error.message}`
            });
        }
    }
}

// ==================================================
// VERIFICAR SI ES GUÍA
// ==================================================

async function isGuide(req, res, next) {
    if (!req.user || !req.user.userId) {
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }

    try {
        const userId = req.user.userId;

        const guide = await dbGet(
            `SELECT g.*, u.user_type 
             FROM guides g
             JOIN users u ON g.user_id = u.id
             WHERE g.user_id = ? AND g.is_active = 1`,
            [userId]
        );

        if (!guide) {
            return res.status(403).json({
                success: false,
                message: 'Acceso restringido: debes ser guía activo para realizar esta acción'
            });
        }

        if (guide.user_type !== 'guide') {
            return res.status(403).json({
                success: false,
                message: 'Acceso restringido: tipo de usuario incorrecto'
            });
        }

        req.guide = {
            guideId: guide.id,
            license_number: guide.license_number,
            is_verified: guide.is_verified,
            ...guide
        };

        next();
    } catch (error) {
        console.error('❌ Error consultando si es guía:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

// ==================================================
// VERIFICAR SI ES GUÍA VERIFICADO
// ==================================================

function isVerifiedGuide(req, res, next) {
    if (!req.guide) {
        return res.status(403).json({
            success: false,
            message: 'Acceso restringido: debes ser guía'
        });
    }

    if (!req.guide.is_verified) {
        return res.status(403).json({
            success: false,
            message: 'Acceso restringido: tu cuenta de guía necesita ser verificada por administración'
        });
    }

    next();
}

// ==================================================
// VERIFICAR TIPO DE USUARIO (guía / pescador)
// ==================================================

async function checkUserType(req, res, next) {
    if (!req.user || !req.user.userId) {
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }

    try {
        const userId = req.user.userId;

        const user = await dbGet(`SELECT user_type FROM users WHERE id = ?`, [userId]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        req.user.user_type = user.user_type || 'fisherman';
        next();
    } catch (error) {
        console.error('❌ Error consultando tipo de usuario:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

// ==================================================
// VERIFICAR PERMISOS SOBRE UN SPOT
// ==================================================

async function checkSpotPermissions(req, res, next) {
    if (!req.user || !req.user.userId) {
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }

    const userId = req.user.userId;
    const spotId = req.params.spotId || req.params.id;

    if (!spotId) {
        return next(); // Continuar si no hay spot específico
    }

    try {
        const spot = await dbGet(`SELECT user_id, spot_type FROM fishing_spots WHERE id = ?`, [spotId]);

        if (!spot) {
            return res.status(404).json({
                success: false,
                message: 'Spot no encontrado'
            });
        }

        if (spot.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado: no eres el dueño de este spot'
            });
        }

        req.spot = spot;
        next();
    } catch (error) {
        console.error('❌ Error consultando spot:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

// ==================================================
// VERIFICAR SI PUEDE CREAR SPOTS DE GUÍA
// ==================================================

async function canCreateGuideSpot(req, res, next) {
    if (!req.user || !req.user.userId) {
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }

    try {
        const userId = req.user.userId;

        const result = await dbGet(
            `SELECT COUNT(*) as count FROM guides WHERE user_id = ? AND is_active = 1`,
            [userId]
        );

        if (result.count === 0) {
            return res.status(403).json({
                success: false,
                message: 'Solo los guías activos pueden crear spots especiales'
            });
        }

        next();
    } catch (error) {
        console.error('❌ Error consultando guía:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

// ==================================================
// FUNCIONES AUXILIARES
// ==================================================

async function getUserInfo(userId) {
    return dbGet(
        `SELECT u.*, g.id as guide_id, g.is_verified, g.is_active as guide_active
         FROM users u
         LEFT JOIN guides g ON u.id = g.user_id
         WHERE u.id = ?`,
        [userId]
    );
}

async function verifyUserIsGuide(userId) {
    const result = await dbGet(
        `SELECT COUNT(*) as is_guide FROM guides WHERE user_id = ? AND is_active = 1`,
        [userId]
    );
    return result.is_guide > 0;
}

module.exports = {
    authenticateToken,
    isGuide,
    isVerifiedGuide,
    checkUserType,
    checkSpotPermissions,
    canCreateGuideSpot,
    getUserInfo,
    verifyUserIsGuide
};
