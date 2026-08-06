const express = require('express');
const router = express.Router();
const AuthBackend = require('../auth');
const auth = new AuthBackend();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// 🛡️ Rate limiting: máximo 10 intentos cada 15 minutos por IP
// Protege contra fuerza bruta de contraseñas y registro masivo de cuentas
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Demasiados intentos. Probá de nuevo en unos minutos.'
    }
});

// La clave secreta se carga desde .env (server.js corre dotenv.config() antes de importar este módulo)
const JWT_SECRET = process.env.JWT_SECRET;

// 🎯 RUTAS DE AUTENTICACIÓN - ACTUALIZADAS

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
    try {
        const result = await auth.register(req.body);
        
        // ✅ VERIFICAR Y CORREGIR LA ESTRUCTURA DEL TOKEN SI ES NECESARIO
        if (result.success && result.token) {
            console.log('🔐 Token generado en register, verificando estructura...');
            try {
                const decoded = jwt.verify(result.token, JWT_SECRET);
                console.log('📝 Token decodificado en register:', decoded);
            } catch (tokenError) {
                console.error('❌ Error en token generado:', tokenError);
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('❌ Error en register:', error);
        res.status(400).json(error);
    }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
    try {
        const result = await auth.login(req.body);
        
        // ✅ VERIFICAR Y CORREGIR LA ESTRUCTURA DEL TOKEN SI ES NECESARIO
        if (result.success && result.token) {
            console.log('🔐 Token generado en login, verificando estructura...');
            try {
                const decoded = jwt.verify(result.token, JWT_SECRET);
                console.log('📝 Token decodificado en login:', decoded);
                
                // ✅ ASEGURARSE DE QUE EL TOKEN TENGA userId
                if (!decoded.userId && decoded.id) {
                    console.log('🔄 Token tiene "id" pero no "userId", regenerando...');
                    // Regenerar token con estructura correcta
                    const correctedToken = jwt.sign(
                        {
                            userId: decoded.id,  // ✅ Usar 'userId' para consistencia
                            email: decoded.email,
                            name: decoded.name
                        },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );
                    result.token = correctedToken;
                    console.log('✅ Token corregido generado');
                }
            } catch (tokenError) {
                console.error('❌ Error en token generado:', tokenError);
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(401).json(error);
    }
});

// GET /api/auth/me (verificar token y obtener usuario)
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token requerido' });
        }

        console.log('🔐 Verificando token en /me...');
        const decoded = await auth.verifyToken(token);
        
        // ✅ COMPATIBILIDAD: Aceptar tanto 'userId' como 'id'
        const userId = decoded.userId || decoded.id;
        if (!userId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Token no contiene userId' 
            });
        }

        const userResult = await auth.getUserById(userId);
        
        res.json(userResult);
    } catch (error) {
        console.error('❌ Error en /me:', error);
        res.status(401).json(error);
    }
});

// ==================================================
// ✅ POST /api/auth/update-profile - VERSIÓN DEBUG CORREGIDA
// ==================================================

router.post('/update-profile', async (req, res) => {
    try {
        console.log('=== 🎯 DEBUG DETALLADO - INICIANDO ACTUALIZACIÓN DE PERFIL ===');
        
        // 🔍 DEBUG: Imprimir TODO lo que llega
        console.log('🔍 Body completo recibido:', JSON.stringify(req.body, null, 2));
        console.log('🔍 Headers:', req.headers);
        console.log('🔍 Content-Type:', req.headers['content-type']);
        
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            console.log('❌ No hay token en la solicitud');
            return res.status(401).json({ 
                success: false, 
                message: 'Token requerido' 
            });
        }

        console.log('🔐 Verificando token...');
        const decoded = await auth.verifyToken(token);
        
        const userId = decoded.userId || decoded.id;
        if (!userId) {
            console.log('❌ Token no contiene userId');
            return res.status(403).json({ 
                success: false, 
                message: 'Token no contiene userId' 
            });
        }

        console.log('✅ Token válido para usuario ID:', userId);
        
        // 🔍 DEBUG: Imprimir cada campo individualmente
        console.log('🔍 Campos recibidos uno por uno:');
        console.log('- name:', req.body.name);
        console.log('- whatsapp:', req.body.whatsapp);
        console.log('- experience:', req.body.experience);
        console.log('- favorite_species:', req.body.favorite_species);
        console.log('- city:', req.body.city);
        console.log('- province:', req.body.province);
        console.log('- country:', req.body.country);
        
        // ⚠️ IMPORTANTE: El frontend está enviando profile_privacy, NO privacy
        console.log('- profile_privacy:', req.body.profile_privacy);
        console.log('- privacy:', req.body.privacy);
        
        // ⚠️ IMPORTANTE: El frontend está enviando campos individuales, NO social_media
        console.log('- facebook_url:', req.body.facebook_url);
        console.log('- instagram_url:', req.body.instagram_url);
        console.log('- tiktok_url:', req.body.tiktok_url);
        console.log('- social_media:', req.body.social_media);

        // ✅ EXTRAER DATOS CON VALORES POR DEFECTO - USANDO EL FORMATO VIEJO
        const {
            name = null,
            whatsapp = null,
            experience = 'beginner',
            favorite_species = null,
            city = null,
            province = null,
            country = 'Argentina',
            profile_privacy = 'public',  // ⚠️ EL FRONTEND ENVÍA profile_privacy
            facebook_url = null,         // ⚠️ EL FRONTEND ENVÍA facebook_url
            instagram_url = null,        // ⚠️ EL FRONTEND ENVÍA instagram_url
            tiktok_url = null,           // ⚠️ EL FRONTEND ENVÍA tiktok_url
            profile_picture_url = null,
            cover_photo_url = null
        } = req.body;

        console.log('✅ Datos extraídos (después de desestructurar):');
        console.log('- profile_privacy:', profile_privacy);
        console.log('- facebook_url:', facebook_url);
        console.log('- instagram_url:', instagram_url);
        console.log('- tiktok_url:', tiktok_url);

        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.join(__dirname, '../pesca-comunidad.db');
        const database = new sqlite3.Database(dbPath);

        // ✅ CONSULTA SQL SIMPLIFICADA Y DIRECTA
        const sql = `
            UPDATE users SET 
                name = ?,
                whatsapp = ?,
                experience = ?,
                favorite_species = ?,
                city = ?,
                province = ?,
                country = ?,
                profile_privacy = ?,
                facebook_url = ?,
                instagram_url = ?,
                tiktok_url = ?,
                profile_picture_url = ?,
                cover_photo_url = ?
            WHERE id = ?
        `;

        const params = [
            name,
            whatsapp,
            experience,
            favorite_species,
            city,
            province,
            country,
            profile_privacy,  // ⚠️ ESTE DEBE SER 'private' o 'public'
            facebook_url,
            instagram_url,
            tiktok_url,
            profile_picture_url,
            cover_photo_url,
            userId
        ];

        console.log('🛠 Ejecutando SQL con parámetros:');
        console.log('📦 Parámetros:', params);

        database.run(sql, params, function(err) {
            if (err) {
                console.error('❌ ERROR SQL:', err.message);
                console.error('❌ SQL completo:', sql);
                console.error('❌ Parámetros:', JSON.stringify(params, null, 2));
                
                database.close();
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error actualizando perfil en base de datos',
                    error: err.message,
                    sqlError: true
                });
            }
            
            console.log('✅ Query ejecutada exitosamente');
            console.log('📊 Cambios realizados en DB:', this.changes);
            
            // ✅ VERIFICAR INMEDIATAMENTE los cambios en la base de datos
            database.get(
                `SELECT name, profile_privacy, facebook_url, instagram_url, tiktok_url, whatsapp, experience
                 FROM users 
                 WHERE id = ?`,
                [userId],
                (err, row) => {
                    if (err) {
                        console.error('❌ Error verificando actualización:', err.message);
                    } else if (!row) {
                        console.error('❌ No se encontró el usuario después de actualizar');
                    } else {
                        console.log('🔍 VERIFICACIÓN INMEDIATA EN DB:');
                        console.log('- Nombre:', row.name);
                        console.log('- Privacidad:', row.profile_privacy);
                        console.log('- Facebook URL:', row.facebook_url);
                        console.log('- Instagram URL:', row.instagram_url);
                        console.log('- TikTok URL:', row.tiktok_url);
                        console.log('- WhatsApp:', row.whatsapp);
                        console.log('- Experiencia:', row.experience);
                    }
                    
                    database.close();
                    
                    if (this.changes === 0) {
                        console.log('⚠️ No se realizaron cambios en la base de datos');
                        return res.status(404).json({ 
                            success: false, 
                            message: 'Usuario no encontrado o no hubo cambios',
                            changes: this.changes
                        });
                    }
                    
                    res.json({ 
                        success: true, 
                        message: 'Perfil actualizado exitosamente',
                        changes: this.changes,
                        userId: userId,
                        updatedData: row || null
                    });
                }
            );
        });

    } catch (error) {
        console.error('❌ ERROR GENERAL en update-profile:', error);
        console.error('❌ Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message,
            stack: error.stack
        });
    }
});

// ==================================================
// ✅ GET /api/auth/user/:id - VERSIÓN MEJORADA
// ==================================================

router.get('/user/:id', async (req, res) => {
    try {
        console.log('=== 👤 SOLICITANDO PERFIL DE USUARIO ===');
        
        const token = req.headers.authorization?.replace('Bearer ', '');
        const userId = req.params.id;
        
        console.log(`🔍 Solicitando perfil del usuario ID: ${userId}`);
        console.log(`🔐 Token presente: ${!!token}`);

        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.join(__dirname, '../pesca-comunidad.db');
        const db = new sqlite3.Database(dbPath);

        // ✅ CONSULTA CON TODOS LOS CAMPOS DE LA TABLA
        const sql = `
            SELECT 
                id, 
                name, 
                email, 
                whatsapp, 
                experience, 
                favorite_species, 
                city, 
                province, 
                country,
                created_at,
                last_login,
                is_active,
                profile_privacy,
                facebook_url,
                instagram_url,
                tiktok_url,
                profile_picture_url,
                cover_photo_url
            FROM users 
            WHERE id = ?
        `;

        console.log('🛠 Ejecutando consulta para usuario ID:', userId);

        db.get(sql, [userId], (err, user) => {
            if (err) {
                console.error('❌ Error de base de datos:', err.message);
                db.close();
                return res.status(500).json({ 
                    success: false,
                    error: 'Error interno del servidor',
                    details: err.message
                });
            }

            if (!user) {
                console.log(`❌ Usuario no encontrado: ${userId}`);
                db.close();
                return res.status(404).json({ 
                    success: false,
                    error: 'Usuario no encontrado' 
                });
            }

            console.log(`✅ Usuario encontrado: ${user.name} (${user.email})`);
            console.log(`🔒 Privacidad del perfil: ${user.profile_privacy}`);

            // ✅ VERIFICACIÓN DE PRIVACIDAD
            if (user.profile_privacy === 'private') {
                console.log('🔒 Este perfil es PRIVADO, verificando acceso...');
                
                if (!token) {
                    console.log('❌ No hay token - Acceso denegado');
                    db.close();
                    return res.status(403).json({
                        success: false,
                        error: 'Este perfil es privado. Inicia sesión como este usuario para verlo.'
                    });
                }
                
                try {
                    // Verificar token
                    const decoded = jwt.verify(token, JWT_SECRET);
                    const currentUserId = decoded.userId || decoded.id;
                    
                    console.log(`🔑 Usuario actual desde token: ${currentUserId}`);
                    console.log(`🔑 Usuario solicitado: ${userId}`);
                    
                    if (parseInt(currentUserId) !== parseInt(userId)) {
                        console.log('❌ No es el dueño del perfil - Acceso denegado');
                        db.close();
                        return res.status(403).json({
                            success: false,
                            error: 'Este perfil es privado y no tienes permiso para verlo.'
                        });
                    }
                    
                    console.log('✅ Es el dueño del perfil - Acceso permitido');
                } catch (tokenError) {
                    console.log('❌ Token inválido:', tokenError.message);
                    db.close();
                    return res.status(403).json({
                        success: false,
                        error: 'Token inválido. No puedes ver perfiles privados.'
                    });
                }
            } else {
                console.log('🔓 Este perfil es PÚBLICO - Acceso permitido');
            }

            // ✅ FORMATEAR LA RESPUESTA PARA COMPATIBILIDAD
            const userResponse = {
                id: user.id,
                name: user.name,
                email: user.email,
                whatsapp: user.whatsapp,
                experience: user.experience,
                favorite_species: user.favorite_species,
                city: user.city,
                province: user.province,
                country: user.country,
                created_at: user.created_at,
                last_login: user.last_login,
                is_active: user.is_active,
                
                // ⚠️ CAMPOS VIEJOS (lo que usa tu frontend actual)
                profile_privacy: user.profile_privacy,
                facebook_url: user.facebook_url,
                instagram_url: user.instagram_url,
                tiktok_url: user.tiktok_url,
                
                // ⚠️ CAMPOS NUEVOS (para compatibilidad futura)
                privacy: user.profile_privacy,
                social_media: {
                    facebook: user.facebook_url,
                    instagram: user.instagram_url,
                    tiktok: user.tiktok_url
                },
                
                profile_picture_url: user.profile_picture_url,
                cover_photo_url: user.cover_photo_url
            };

            console.log('📤 Enviando respuesta formateada al frontend');
            
            db.close();
            
            res.json({
                success: true,
                data: userResponse
            });
        });

    } catch (error) {
        console.error('❌ Error obteniendo perfil de usuario:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const result = await auth.requestPasswordReset(email);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Error al procesar la solicitud'
        });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const result = await auth.resetPasswordWithToken(token, newPassword);
        res.json(result);
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Error al restablecer la contraseña'
        });
    }
});

module.exports = router;
