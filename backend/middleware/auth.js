// ==================================================
// MIDDLEWARE DE AUTENTICACIÓN - VERSIÓN DEBUG
// ==================================================

const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// La clave secreta se carga desde .env (server.js corre dotenv.config() antes de importar este módulo)
const JWT_SECRET = process.env.JWT_SECRET;

// Conectar a la base de datos (para consultar si es guía)
const dbPath = path.join(__dirname, '../pesca-comunidad.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos en auth.js:', err);
    } else {
        console.log('✅ Conectado a la base de datos SQLite desde auth.js');
    }
});

function authenticateToken(req, res, next) {
    console.log('🔐 MIDDLEWARE - Iniciando verificación de token...');
    
    // Obtener el header de autorización de múltiples formas
    const authHeader = req.headers['authorization'] || 
                      req.headers['Authorization'] || 
                      req.header('authorization');
    
    console.log('📨 Todos los headers recibidos:', req.headers);
    console.log('🔍 Header Authorization específico:', authHeader);

    if (!authHeader) {
        console.log('❌ No se encontró header Authorization');
        return res.status(401).json({ 
            success: false,
            message: 'Token de acceso requerido' 
        });
    }

    // Extraer el token de forma más robusta
    let token;
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Eliminar "Bearer "
    } else {
        token = authHeader; // Asumir que es solo el token
    }

    console.log('🔑 Token extraído:', token ? `${token.substring(0, 50)}...` : 'UNDEFINED');
    console.log('📏 Longitud del token:', token ? token.length : 0);

    if (!token || token === 'null' || token === 'undefined') {
        console.log('❌ Token está vacío, null o undefined');
        return res.status(401).json({ 
            success: false,
            message: 'Token de acceso requerido' 
        });
    }

    // Verificar que el token tenga formato JWT básico (3 partes separadas por puntos)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
        console.log('❌ Token no tiene formato JWT válido. Partes:', tokenParts.length);
        return res.status(403).json({ 
            success: false,
            message: 'Token con formato inválido' 
        });
    }

    try {
        console.log('🔄 Verificando token con JWT...');
        const decoded = jwt.verify(token, JWT_SECRET);
        
        console.log('✅ Token decodificado exitosamente:', {
            userId: decoded.userId,
            email: decoded.email,
            exp: decoded.exp,
            iat: decoded.iat
        });

        // Verificar que tenga userId
        if (!decoded.userId) {
            console.log('❌ Token no contiene userId');
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

        console.log(`✅ Usuario autenticado: ${decoded.email} (ID: ${decoded.userId})`);
        next();

    } catch (error) {
        console.error('❌ Error verificando token:', {
            name: error.name,
            message: error.message,
            expiredAt: error.expiredAt
        });

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
            return res.status(403).json({ 
                success: false,
                message: `Error de autenticación: ${error.message}` 
            });
        }
    }
}

// ==================================================
// ✅ NUEVO MIDDLEWARE: VERIFICAR SI ES GUÍA
// ==================================================

function isGuide(req, res, next) {
    console.log('🔍 MIDDLEWARE - Verificando si usuario es guía...');
    
    if (!req.user || !req.user.userId) {
        console.log('❌ No hay usuario autenticado');
        return res.status(401).json({ 
            success: false,
            message: 'Usuario no autenticado' 
        });
    }

    const userId = req.user.userId;
    
    // Consultar si el usuario está registrado como guía
    const sql = `
        SELECT g.*, u.user_type 
        FROM guides g
        JOIN users u ON g.user_id = u.id
        WHERE g.user_id = ? AND g.is_active = 1
    `;
    
    db.get(sql, [userId], (err, guide) => {
        if (err) {
            console.error('❌ Error consultando si es guía:', err);
            return res.status(500).json({ 
                success: false,
                message: 'Error interno del servidor' 
            });
        }

        if (!guide) {
            console.log(`❌ Usuario ${userId} no es guía activo`);
            return res.status(403).json({ 
                success: false,
                message: 'Acceso restringido: debes ser guía activo para realizar esta acción' 
            });
        }

        // Verificar tipo de usuario
        if (guide.user_type !== 'guide') {
            console.log(`❌ Usuario ${userId} no tiene tipo "guide"`);
            return res.status(403).json({ 
                success: false,
                message: 'Acceso restringido: tipo de usuario incorrecto' 
            });
        }

        // Agregar información del guía al request
        req.guide = {
            guideId: guide.id,
            license_number: guide.license_number,
            is_verified: guide.is_verified,
            ...guide
        };

        console.log(`✅ Usuario ${userId} es guía (ID: ${guide.id}, Verificado: ${guide.is_verified})`);
        next();
    });
}

// ==================================================
// ✅ NUEVO MIDDLEWARE: VERIFICAR SI ES GUÍA VERIFICADO
// ==================================================

function isVerifiedGuide(req, res, next) {
    console.log('🔍 MIDDLEWARE - Verificando si es guía verificado...');
    
    // Primero verificar que sea guía
    if (!req.guide) {
        console.log('❌ No se encontró información de guía');
        return res.status(403).json({ 
            success: false,
            message: 'Acceso restringido: debes ser guía' 
        });
    }

    if (!req.guide.is_verified) {
        console.log(`❌ Guía ${req.guide.guideId} no está verificado`);
        return res.status(403).json({ 
            success: false,
            message: 'Acceso restringido: tu cuenta de guía necesita ser verificada por administración' 
        });
    }

    console.log(`✅ Guía ${req.guide.guideId} está verificado`);
    next();
}

// ==================================================
// ✅ NUEVO MIDDLEWARE: VERIFICAR SI ES GUÍA O USUARIO NORMAL
// ==================================================

function checkUserType(req, res, next) {
    console.log('🔍 MIDDLEWARE - Verificando tipo de usuario...');
    
    if (!req.user || !req.user.userId) {
        console.log('❌ No hay usuario autenticado');
        return res.status(401).json({ 
            success: false,
            message: 'Usuario no autenticado' 
        });
    }

    const userId = req.user.userId;
    
    // Consultar tipo de usuario
    const sql = `SELECT user_type FROM users WHERE id = ?`;
    
    db.get(sql, [userId], (err, user) => {
        if (err) {
            console.error('❌ Error consultando tipo de usuario:', err);
            return res.status(500).json({ 
                success: false,
                message: 'Error interno del servidor' 
            });
        }

        if (!user) {
            console.log(`❌ Usuario ${userId} no encontrado`);
            return res.status(404).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }

        // Agregar tipo de usuario al request
        req.user.user_type = user.user_type || 'fisherman';
        
        console.log(`✅ Usuario ${userId} es tipo: ${req.user.user_type}`);
        next();
    });
}

// ==================================================
// ✅ NUEVO MIDDLEWARE: VERIFICAR PERMISOS PARA SPOTS
// ==================================================

function checkSpotPermissions(req, res, next) {
    console.log('🔍 MIDDLEWARE - Verificando permisos para spots...');
    
    if (!req.user || !req.user.userId) {
        console.log('❌ No hay usuario autenticado');
        return res.status(401).json({ 
            success: false,
            message: 'Usuario no autenticado' 
        });
    }

    const userId = req.user.userId;
    const spotId = req.params.spotId || req.params.id;
    
    if (!spotId) {
        console.log('⚠️ No hay spotId en la solicitud');
        return next(); // Continuar si no hay spot específico
    }

    // Consultar si el spot pertenece al usuario
    const sql = `SELECT user_id, spot_type FROM fishing_spots WHERE id = ?`;
    
    db.get(sql, [spotId], (err, spot) => {
        if (err) {
            console.error('❌ Error consultando spot:', err);
            return res.status(500).json({ 
                success: false,
                message: 'Error interno del servidor' 
            });
        }

        if (!spot) {
            console.log(`❌ Spot ${spotId} no encontrado`);
            return res.status(404).json({ 
                success: false,
                message: 'Spot no encontrado' 
            });
        }

        // Verificar permisos
        if (spot.user_id !== userId) {
            console.log(`❌ Usuario ${userId} no es dueño del spot ${spotId}`);
            return res.status(403).json({ 
                success: false,
                message: 'Acceso denegado: no eres el dueño de este spot' 
            });
        }

        console.log(`✅ Usuario ${userId} tiene permisos sobre spot ${spotId}`);
        
        // Agregar información del spot al request
        req.spot = spot;
        next();
    });
}

// ==================================================
// ✅ NUEVO MIDDLEWARE: VERIFICAR SI PUEDE CREAR SPOTS DE GUÍA
// ==================================================

function canCreateGuideSpot(req, res, next) {
    console.log('🔍 MIDDLEWARE - Verificando si puede crear spot de guía...');
    
    if (!req.user || !req.user.userId) {
        console.log('❌ No hay usuario autenticado');
        return res.status(401).json({ 
            success: false,
            message: 'Usuario no autenticado' 
        });
    }

    const userId = req.user.userId;
    
    // Consultar si el usuario es guía activo
    const sql = `
        SELECT COUNT(*) as count 
        FROM guides 
        WHERE user_id = ? AND is_active = 1
    `;
    
    db.get(sql, [userId], (err, result) => {
        if (err) {
            console.error('❌ Error consultando guía:', err);
            return res.status(500).json({ 
                success: false,
                message: 'Error interno del servidor' 
            });
        }

        if (result.count === 0) {
            console.log(`❌ Usuario ${userId} no es guía activo`);
            return res.status(403).json({ 
                success: false,
                message: 'Solo los guías activos pueden crear spots especiales' 
            });
        }

        console.log(`✅ Usuario ${userId} puede crear spots de guía`);
        next();
    });
}

// ==================================================
// ✅ FUNCIONES AUXILIARES
// ==================================================

// Obtener información completa del usuario (incluyendo si es guía)
function getUserInfo(userId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT u.*, g.id as guide_id, g.is_verified, g.is_active as guide_active
            FROM users u
            LEFT JOIN guides g ON u.id = g.user_id
            WHERE u.id = ?
        `;
        
        db.get(sql, [userId], (err, user) => {
            if (err) {
                reject(err);
            } else {
                resolve(user);
            }
        });
    });
}

// Verificar si un usuario específico es guía
function verifyUserIsGuide(userId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT COUNT(*) as is_guide 
            FROM guides 
            WHERE user_id = ? AND is_active = 1
        `;
        
        db.get(sql, [userId], (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result.is_guide > 0);
            }
        });
    });
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