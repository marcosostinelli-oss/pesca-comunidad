require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 5001;

// 🔐 Configuración de seguridad
if (!process.env.JWT_SECRET) {
    console.error('❌ Falta la variable de entorno JWT_SECRET. Creá un archivo .env en /backend con JWT_SECRET=tu_clave_secreta');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
// 🛡️ CORS restringido a orígenes conocidos (configurable por .env)
// En local, agregá ALLOWED_ORIGINS=http://localhost:5001 a tu .env si hace falta
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5001,http://127.0.0.1:5001')
    .split(',')
    .map(origin => origin.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Permitir pedidos sin origin (apps móviles, Postman, curl) y los de la lista permitida
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`⚠️ CORS bloqueado para origin: ${origin}`);
            callback(new Error('No permitido por CORS'));
        }
    }
}));
app.use(express.json());

// 🔧 MIDDLEWARE PARA MANEJAR TIMEOUTS GLOBALES
app.use((req, res, next) => {
    // Configurar timeout de 30 segundos para la solicitud
    req.setTimeout(30000, () => {
        console.log(`⏱️  Request timeout: ${req.method} ${req.url}`);
        if (!res.headersSent) {
            res.status(504).json({ 
                success: false, 
                message: 'Request timeout - servidor ocupado',
                tip: 'Intenta nuevamente en unos segundos'
            });
        }
    });
    
    // Configurar timeout de 25 segundos para la respuesta
    res.setTimeout(25000, () => {
        console.log(`⏱️  Response timeout: ${req.method} ${req.url}`);
        if (!res.headersSent) {
            res.status(504).json({ 
                success: false, 
                message: 'Tiempo de respuesta excedido',
                tip: 'La base de datos está ocupada, inténtalo de nuevo'
            });
        }
    });
    
    next();
});

// ✅ Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ==================================================
// ✅ IMPORTAR FUNCIONES DE database.js
// ==================================================
const { initDatabase, dbRun, dbGet, dbAll } = require('./database');

// ==================================================
// ✅ CONFIGURAR CONEXIÓN SQLITE EN server.js
// ==================================================
const dbPath = path.join(__dirname, 'pesca-comunidad.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        process.exit(1); // Detener servidor si no puede conectar
    } else {
        console.log('✅ Conectado a la base de datos SQLite (desde server.js)');
        
        // 🔧 INICIALIZAR database.js con la conexión de server.js
        initDatabase(db);
        
        // 🔄 CREAR TABLAS CON ESTRUCTURA ACTUALIZADA
        db.serialize(() => {
            // Tabla de usuarios con estructura segura
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    whatsapp TEXT,
                    experience TEXT,
                    favorite_species TEXT,
                    city TEXT,
                    province TEXT,
                    country TEXT DEFAULT 'Argentina',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME,
                    is_active BOOLEAN DEFAULT 1,
                    user_type TEXT DEFAULT 'fisherman'
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creando tabla users:', err.message);
                } else {
                    console.log('✅ Tabla users lista');
                }
            });

            // Tabla de fishing_spots
            db.run(`
                CREATE TABLE IF NOT EXISTS fishing_spots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    water_type TEXT NOT NULL,
                    type TEXT,
                    description TEXT,
                    species TEXT,
                    best_time TEXT DEFAULT 'mañana',
                    visibility TEXT DEFAULT 'public',
                    accessibility TEXT DEFAULT 'moderado',
                    facilities TEXT,
                    spot_type TEXT DEFAULT 'user',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creando tabla fishing_spots:', err.message);
                } else {
                    console.log('✅ Tabla fishing_spots lista');
                }
            });

            // ✅ TABLAS PARA GUÍAS
            // Tabla de guías
            db.run(`
                CREATE TABLE IF NOT EXISTS guides (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL UNIQUE,
                    license_number TEXT,
                    years_experience INTEGER DEFAULT 0,
                    description TEXT,
                    services TEXT,
                    zones TEXT,
                    price_per_day REAL DEFAULT 0,
                    contact_phone TEXT,
                    contact_email TEXT,
                    is_verified BOOLEAN DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creando tabla guides:', err.message);
                } else {
                    console.log('✅ Tabla guides lista');
                    // Índices para guías
                    db.run('CREATE INDEX IF NOT EXISTS idx_guides_user_id ON guides(user_id)');
                    db.run('CREATE INDEX IF NOT EXISTS idx_guides_is_active ON guides(is_active)');
                }
            });

            // Tabla de servicios de guías
            db.run(`
                CREATE TABLE IF NOT EXISTS guide_services (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guide_id INTEGER NOT NULL,
                    service_name TEXT NOT NULL,
                    description TEXT,
                    price REAL DEFAULT 0,
                    duration_hours INTEGER,
                    includes_gear BOOLEAN DEFAULT 0,
                    includes_transport BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creando tabla guide_services:', err.message);
                } else {
                    console.log('✅ Tabla guide_services lista');
                }
            });

            // Tabla de reviews de guías
            db.run(`
                CREATE TABLE IF NOT EXISTS guide_reviews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guide_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                    comment TEXT,
                    trip_date DATE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(guide_id, user_id)
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creando tabla guide_reviews:', err.message);
                } else {
                    console.log('✅ Tabla guide_reviews lista');
                }
            });

            // Tabla de reservas de guías (para futuro)
            db.run(`
                CREATE TABLE IF NOT EXISTS guide_booking_requests (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guide_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    service_id INTEGER,
                    booking_date DATE NOT NULL,
                    duration_days INTEGER DEFAULT 1,
                    participants INTEGER DEFAULT 1,
                    total_price REAL,
                    status TEXT DEFAULT 'pending',
                    special_requests TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (service_id) REFERENCES guide_services(id) ON DELETE SET NULL
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creando tabla guide_booking_requests:', err.message);
                } else {
                    console.log('✅ Tabla guide_booking_requests lista (para futuras reservas)');
                }
            });

            // ✅ NUEVO: Tabla de amigos
            db.run(`CREATE TABLE IF NOT EXISTS friends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, friend_id)
            )`, (err) => {
                if (err) {
                    console.error('❌ Error creando tabla friends:', err.message);
                } else {
                    console.log('✅ Tabla friends lista');
                }
            });

            // ✅ NUEVO: Tabla de solicitudes de amistad
            db.run(`CREATE TABLE IF NOT EXISTS friend_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_user_id INTEGER NOT NULL,
                to_user_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
                message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (from_user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (to_user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(from_user_id, to_user_id)
            )`, (err) => {
                if (err) {
                    console.error('❌ Error creando tabla friend_requests:', err.message);
                } else {
                    console.log('✅ Tabla friend_requests lista');
                }
            });

            // Crear índices para mejor performance
            db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
            db.run('CREATE INDEX IF NOT EXISTS idx_spots_location ON fishing_spots(latitude, longitude)');
            db.run('CREATE INDEX IF NOT EXISTS idx_spots_user_id ON fishing_spots(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_spots_visibility ON fishing_spots(visibility)');
            db.run('CREATE INDEX IF NOT EXISTS idx_spots_accessibility ON fishing_spots(accessibility)');
            // ✅ NUEVOS ÍNDICES PARA AMIGOS
            db.run('CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status)');
            db.run('CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_user_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_user_id)');
        });
    }
});

// ==================================================
// ✅ IMPORTAR RUTAS ACTUALIZADAS
// ==================================================
const spotsRoutes = require('./routes/spots');
const authRoutes = require('./routers/auth');

// ✅ NUEVAS RUTAS DE AMIGOS
const friendsRoutes = require('./routes/friends');
const friendSpotsRoutes = require('./routes/friend-spots');

// ✅ NUEVAS RUTAS DE GUÍAS
const guidesRoutes = require('./routes/guides');
const guideSpotsRoutes = require('./routes/guide-spots');

// 🔐 MIDDLEWARE DE AUTENTICACIÓN
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Verificando token...');
    console.log('📨 Header Authorization:', authHeader);
    console.log('🔑 Token recibido:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

    if (!token) {
        console.log('❌ No se recibió token');
        return res.status(401).json({ 
            success: false,
            message: 'Token de acceso requerido' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('❌ Error verificando token:', err.message);
            console.log('🔍 Token completo:', token);
            return res.status(403).json({ 
                success: false,
                message: `Token inválido: ${err.message}` 
            });
        }

        // ✅ CORREGIDO: Usar la estructura correcta
        req.user = {
            userId: decoded.userId || decoded.id, // Compatibilidad con ambas estructuras
            email: decoded.email,
            name: decoded.name
        };

        console.log(`✅ Token válido para usuario: ${req.user.email} (ID: ${req.user.userId})`);
        next();
    });
};

// ==================================================
// ✅ USAR RUTAS ACTUALIZADAS
// ==================================================
app.use('/api/spots', spotsRoutes);
app.use('/api/auth', authRoutes);

// ✅ NUEVAS RUTAS DE AMIGOS
app.use('/api/friends', friendsRoutes);
app.use('/api/friend-spots', friendSpotsRoutes);

// ✅ NUEVAS RUTAS DE GUÍAS
app.use('/api/guides', guidesRoutes);
app.use('/api/guide-spots', guideSpotsRoutes);

// 🎣 RUTAS DE FISHING SPOTS (MANTENIDAS PARA COMPATIBILIDAD)

// Obtener todos los spots públicos (compatibilidad)
app.get('/api/spots-legacy', async (req, res) => {
    try {
        const spots = await dbAll(
            `SELECT fs.*, u.name as user_name 
             FROM fishing_spots fs 
             LEFT JOIN users u ON fs.user_id = u.id 
             WHERE fs.visibility = 'public' 
             ORDER BY fs.created_at DESC`
        );

        res.json({
            success: true,
            spots
        });

    } catch (error) {
        console.error('Error obteniendo spots:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// Obtener spots del usuario actual (compatibilidad)
app.get('/api/my-spots', authenticateToken, async (req, res) => {
    try {
        const spots = await dbAll(
            `SELECT * FROM fishing_spots 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [req.user.userId]
        );

        res.json({
            success: true,
            spots
        });

    } catch (error) {
        console.error('Error obteniendo spots del usuario:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// 📊 RUTAS ADICIONALES

// Obtener estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        const userCount = await dbGet('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
        const spotCount = await dbGet('SELECT COUNT(*) as count FROM fishing_spots WHERE visibility = "public"');
        const guideCount = await dbGet('SELECT COUNT(*) as count FROM guides WHERE is_active = 1');
        
        res.json({
            success: true,
            stats: {
                users: userCount.count,
                spots: spotCount.count,
                guides: guideCount.count
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor' 
        });
    }
});

// ✅ RUTA DE PRUEBA Y HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        message: '¡API de PescaComunidad con SQLite funcionando!',
        version: '2.2.0',
        database: 'SQLite con estructura actualizada',
        status: 'Online 🚀',
        features: [
            'Autenticación JWT segura',
            'Contraseñas hasheadas con bcrypt',
            'Gestión de spots de pesca mejorada',
            'Nuevos campos: accessibility, facilities',
            'Sistema de amigos completo',
            'Sistema de guías profesional',
            'API RESTful actualizada'
        ],
        timestamp: new Date().toISOString()
    });
});

// ✅ RUTA DE PRUEBA API
app.get('/api', (req, res) => {
    res.json({ 
        success: true,
        message: '¡API de PescaComunidad con SQLite funcionando!',
        version: '2.2.0',
        database: 'SQLite con estructura actualizada',
        status: 'Online 🚀'
    });
});

// ==================================================
// ✅ RUTAS SPA - FIX PARA F5 (ACTUALIZADO)
// ==================================================

// 1. Manejo de rutas no encontradas para API (debe ir ANTES del catch-all)
app.all('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint de API no encontrado'
    });
});

// 2. ✅ CATCH-ALL ÚNICO Y SIMPLIFICADO para SPA
// Esto manejará TODAS las rutas del frontend
app.get('*', (req, res, next) => {
    // Si es una ruta de API, dejar que pase al manejador anterior
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    // Si es un archivo estático (js, css, imágenes), servirlo normalmente
    const staticFileExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.json', '.txt', '.html', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
    const isStaticFile = staticFileExtensions.some(ext => req.path.endsWith(ext));
    
    if (isStaticFile) {
        return next(); // Express.static lo manejará
    }
    
    // Para cualquier otra ruta, servir index.html (SPA)
    console.log(`🔄 SPA Route: ${req.path} -> sirviendo index.html`);
    res.sendFile(path.join(__dirname, '../frontend/index.html'), (err) => {
        if (err) {
            console.error('❌ Error sirviendo index.html:', err.message);
            res.status(500).send('Error cargando la aplicación');
        }
    });
});

// 🚀 INICIAR SERVIDOR
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Frontend modular servido desde: ${path.join(__dirname, '../frontend')}`);
    console.log(`🔐 JWT Secret: configurado correctamente ✅`);
    console.log(`💾 Base de datos: ${dbPath}`);
    console.log('\n🎣 Endpoints disponibles:');
    console.log(`  POST /api/auth/register    - Registrar nuevo usuario`);
    console.log(`  POST /api/auth/login       - Iniciar sesión`);
    console.log(`  GET  /api/auth/me          - Obtener usuario actual`);
    console.log(`  PUT  /api/auth/profile     - Actualizar perfil`);
    console.log(`  GET  /api/spots            - Obtener spots públicos (NUEVO)`);
    console.log(`  GET  /api/spots/public     - Obtener spots públicos (alias)`);
    console.log(`  POST /api/spots            - Crear nuevo spot (NUEVO)`);
    console.log(`  DELETE /api/spots/:id      - Eliminar spot (NUEVO)`);
    console.log(`  GET  /api/my-spots         - Obtener spots del usuario`);
    // ✅ NUEVOS ENDPOINTS DE AMIGOS
    console.log(`  POST /api/friends/send-request - Enviar solicitud de amistad`);
    console.log(`  GET  /api/friends/pending-requests - Obtener solicitudes pendientes`);
    console.log(`  GET  /api/friends/sent-requests - Obtener solicitudes enviadas`);
    console.log(`  POST /api/friends/accept-request - Aceptar solicitud`);
    console.log(`  POST /api/friends/reject-request - Rechazar solicitud`);
    console.log(`  GET  /api/friends/list      - Lista de amigos`);
    console.log(`  DELETE /api/friends/remove  - Eliminar amigo`);
    console.log(`  GET  /api/friends/search    - Buscar usuarios`);
    console.log(`  GET  /api/friends/stats     - Estadísticas de amigos`);
    console.log(`  GET  /api/friend-spots      - Spots de amigos`);
    console.log(`  GET  /api/friend-spots/all  - Todos los spots (públicos + amigos + propios)`);
    // ✅ NUEVOS ENDPOINTS DE GUÍAS
    console.log(`  GET  /api/guides            - Listar guías activos`);
    console.log(`  GET  /api/guides/:id        - Obtener guía por ID`);
    console.log(`  GET  /api/guides/user/:userId - Obtener guía por user ID`);
    console.log(`  POST /api/guides/register   - Registrarse como guía`);
    console.log(`  PUT  /api/guides/:id        - Actualizar perfil de guía`);
    console.log(`  POST /api/guides/:id/reviews - Agregar review a guía`);
    console.log(`  GET  /api/guides/:id/reviews - Obtener reviews de guía`);
    console.log(`  GET  /api/guides/map/nearby - Obtener guías cercanos (para mapa)`);
    console.log(`  POST /api/guide-spots       - Crear spot como guía`);
    console.log(`  GET  /api/guide-spots/guide/:guideId - Obtener spots de un guía`);
    console.log(`  GET  /api/guide-spots/map/all - Obtener spots de guías para el mapa`);
    console.log(`  GET  /api/guide-spots/my-spots - Obtener mis spots como guía`);
    console.log(`  PUT  /api/guide-spots/:spotId - Actualizar spot de guía`);
    console.log(`  DELETE /api/guide-spots/:spotId - Eliminar spot de guía`);
    console.log(`  GET  /api/stats            - Estadísticas`);
    console.log(`  GET  /api/health           - Health check`);
    console.log('\n📍 Rutas SPA (F5 compatible):');
    console.log(`  ✅ Todas las rutas del frontend funcionarán con F5`);
    console.log(`  Ejemplos: /, /inicio, /mapa, /clima, /pesca, /amigos, /guias, /perfil, etc.`);
});