const express = require('express');
const router = express.Router();
const AuthBackend = require('../auth');
const auth = new AuthBackend();
const jwt = require('jsonwebtoken');

// Clave secreta para JWT - DEBE SER LA MISMA QUE EN EL MIDDLEWARE
const JWT_SECRET = process.env.JWT_SECRET || 'pesca-comunidad-secret-key-2024-segura';

// 🎯 RUTAS DE AUTENTICACIÓN - ACTUALIZADAS

// POST /api/auth/register
router.post('/register', async (req, res) => {
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
router.post('/login', async (req, res) => {
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

// ==================================================
// ✅ ENDPOINTS DE DEBUG (MANTENER PARA TROUBLESHOOTING)
// ==================================================

router.post('/debug-token', async (req, res) => {
    try {
        console.log('🔍 DEBUG ENDPOINT - Iniciando...');
        
        const authHeader = req.headers.authorization;
        console.log('📨 Header Authorization recibido:', authHeader);

        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'No se recibió header Authorization' 
            });
        }

        // Extraer token
        const token = authHeader.startsWith('Bearer ') ? 
                     authHeader.substring(7) : authHeader;

        console.log('🔑 Token extraído:', token ? `${token.substring(0, 30)}...` : 'VACÍO');
        console.log('📏 Longitud del token:', token ? token.length : 0);

        if (!token || token === 'null' || token === 'undefined') {
            return res.json({
                success: false,
                message: 'Token vacío o inválido',
                tokenReceived: token
            });
        }

        // Verificar formato JWT
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            return res.json({
                success: false,
                message: 'Token no tiene formato JWT válido',
                parts: tokenParts.length,
                tokenPreview: token.substring(0, 50)
            });
        }

        // Intentar verificar con JWT
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'pesca-comunidad-secret-key-2024-segura';

        console.log('🔄 Verificando con JWT_SECRET:', JWT_SECRET);

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log('✅ Token VÁLIDO con JWT:', decoded);
            
            return res.json({
                success: true,
                message: 'Token válido',
                method: 'jwt_verify',
                decoded: decoded,
                hasUserId: !!decoded.userId,
                userId: decoded.userId,
                email: decoded.email
            });

        } catch (jwtError) {
            console.log('❌ Error con jwt.verify:', jwtError.message);
            
            // Intentar con AuthBackend
            try {
                const decoded = await auth.verifyToken(token);
                console.log('✅ Token VÁLIDO con AuthBackend:', decoded);
                
                return res.json({
                    success: true,
                    message: 'Token válido',
                    method: 'auth_backend',
                    decoded: decoded,
                    hasUserId: !!decoded.userId,
                    userId: decoded.userId,
                    email: decoded.email
                });

            } catch (authError) {
                console.log('❌ Error con auth.verifyToken:', authError.message);
                
                return res.json({
                    success: false,
                    message: 'Token inválido con ambos métodos',
                    errors: {
                        jwtError: jwtError.message,
                        authError: authError.message
                    },
                    tokenPreview: token.substring(0, 50)
                });
            }
        }

    } catch (error) {
        
        console.error('❌ Error inesperado en debug-token:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

// ✅ ENDPOINT PARA DEBUG DE ESTRUCTURA DE TABLA
router.get('/debug-table-structure', (req, res) => {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = path.join(__dirname, '../pesca-comunidad.db');
    const db = new sqlite3.Database(dbPath);
    
    db.all(`PRAGMA table_info(users)`, (err, rows) => {
        if (err) {
            console.error('❌ Error obteniendo estructura:', err);
            db.close();
            return res.status(500).json({ error: err.message });
        }
        
        console.log('📊 Estructura de tabla users:');
        rows.forEach(col => {
            console.log(`- ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
        });
        
        db.close();
        res.json({ columns: rows });
    });
});

// ✅ ENDPOINT PARA ARREGLAR COLUMNAS FALTANTES
router.post('/fix-table-columns', async (req, res) => {
    try {
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.join(__dirname, '../pesca-comunidad.db');
        const db = new sqlite3.Database(dbPath);
        
        const queries = [
            `ALTER TABLE users ADD COLUMN profile_privacy TEXT DEFAULT 'public'`,
            `ALTER TABLE users ADD COLUMN facebook_url TEXT`,
            `ALTER TABLE users ADD COLUMN instagram_url TEXT`,
            `ALTER TABLE users ADD COLUMN tiktok_url TEXT`,
            `ALTER TABLE users ADD COLUMN profile_picture_url TEXT`,
            `ALTER TABLE users ADD COLUMN cover_photo_url TEXT`
        ];
        
        const results = [];
        
        for (const query of queries) {
            try {
                await new Promise((resolve, reject) => {
                    db.run(query, function(err) {
                        if (err) {
                            // Si la columna ya existe, ignorar el error
                            if (err.message.includes('duplicate column name') || 
                                err.message.includes('already exists')) {
                                results.push({ query, status: 'already_exists', error: err.message });
                                resolve();
                            } else {
                                reject(err);
                            }
                        } else {
                            results.push({ query, status: 'added', changes: this.changes });
                            resolve();
                        }
                    });
                });
            } catch (error) {
                results.push({ query, status: 'error', error: error.message });
            }
        }
        
        db.close();
        res.json({ success: true, results });
        
    } catch (error) {
        console.error('❌ Error arreglando tabla:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================================================
// ✅ NUEVO: ENDPOINT DE TEST DIRECTO
// ==================================================

router.post('/test-update-direct', async (req, res) => {
    try {
        console.log('=== 🧪 TEST DIRECTO - SIN VERIFICACIÓN DE TOKEN ===');
        console.log('🔍 Body recibido:', JSON.stringify(req.body, null, 2));
        
        const {
            name = 'Test User',
            whatsapp = '123456789',
            experience = 'beginner',
            favorite_species = 'Test Fish',
            city = 'Test City',
            province = 'Test Province',
            country = 'Argentina',
            profile_privacy = 'public',
            facebook_url = 'https://facebook.com/test',
            instagram_url = 'https://instagram.com/test',
            tiktok_url = null
        } = req.body;

        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.join(__dirname, '../pesca-comunidad.db');
        const db = new sqlite3.Database(dbPath);

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
                tiktok_url = ?
            WHERE id = 1
        `;

        const params = [
            name,
            whatsapp,
            experience,
            favorite_species,
            city,
            province,
            country,
            profile_privacy,
            facebook_url,
            instagram_url,
            tiktok_url
        ];

        console.log('🛠 Ejecutando test SQL con parámetros:', params);

        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error en test:', err.message);
                db.close();
                return res.status(500).json({ 
                    success: false, 
                    error: err.message 
                });
            }
            
            console.log('✅ Test ejecutado, cambios:', this.changes);
            
            db.get('SELECT * FROM users WHERE id = 1', (err, row) => {
                db.close();
                res.json({
                    success: true,
                    changes: this.changes,
                    updatedUser: row
                });
            });
        });

    } catch (error) {
        console.error('❌ Error en test:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;