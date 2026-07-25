const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ✅ CORREGIDO: Misma clave secreta que el middleware
const JWT_SECRET = process.env.JWT_SECRET || 'pesca-comunidad-secret-key-2024-segura';
const dbPath = path.join(__dirname, 'pesca-comunidad.db');

// Conexión a la base de datos
const db = new sqlite3.Database(dbPath);

class AuthBackend {
    // 🔐 REGISTRO SEGURO
    async register(userData) {
        return new Promise(async (resolve, reject) => {
            try {
                const { name, email, password, whatsapp } = userData;

                // Validaciones
                if (!name || !email || !password) {
                    return reject({ 
                        success: false, 
                        message: 'Todos los campos obligatorios deben ser completados' 
                    });
                }

                if (password.length < 6) {
                    return reject({ 
                        success: false, 
                        message: 'La contraseña debe tener al menos 6 caracteres' 
                    });
                }

                // Verificar si el usuario ya existe
                db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
                    if (err) {
                        console.error('❌ Error verificando usuario existente:', err);
                        return reject({ 
                            success: false, 
                            message: 'Error del servidor' 
                        });
                    }

                    if (row) {
                        return reject({ 
                            success: false, 
                            message: 'Este email ya está registrado' 
                        });
                    }

                    // 🔐 HASH SEGURO de la contraseña
                    const saltRounds = 12;
                    const passwordHash = await bcrypt.hash(password, saltRounds);

                    // Insertar usuario en la base de datos
                    db.run(
                        `INSERT INTO users (name, email, password_hash, whatsapp, country, created_at) 
                         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                        [name, email, passwordHash, whatsapp || null, 'Argentina'],
                        function(err) {
                            if (err) {
                                console.error('❌ Error insertando usuario:', err);
                                return reject({ 
                                    success: false, 
                                    message: 'Error creando usuario' 
                                });
                            }

                            const userId = this.lastID;
                            console.log(`✅ Usuario creado: ${name} (ID: ${userId})`);

                            // Obtener usuario creado (sin password)
                            db.get(
                                `SELECT id, name, email, whatsapp, experience, favorite_species, city, province, country, created_at 
                                 FROM users WHERE id = ?`,
                                [userId],
                                (err, user) => {
                                    if (err) {
                                        console.error('❌ Error obteniendo usuario:', err);
                                        return reject({ 
                                            success: false, 
                                            message: 'Error obteniendo usuario' 
                                        });
                                    }

                                    // 🎫 Generar token JWT seguro
                                    const token = jwt.sign(
                                        { 
                                            userId: user.id, 
                                            email: user.email 
                                        },
                                        JWT_SECRET,
                                        { expiresIn: '30d' }
                                    );

                                    console.log(`✅ Token generado para usuario ID: ${user.id}`);

                                    resolve({
                                        success: true,
                                        message: 'Usuario registrado exitosamente',
                                        token,
                                        user: {
                                            id: user.id,
                                            name: user.name,
                                            email: user.email,
                                            whatsapp: user.whatsapp,
                                            experience: user.experience,
                                            favorite_species: user.favorite_species,
                                            city: user.city,
                                            province: user.province,
                                            country: user.country,
                                            created_at: user.created_at
                                        }
                                    });
                                }
                            );
                        }
                    );
                });

            } catch (error) {
                console.error('❌ Error en registro:', error);
                reject({ 
                    success: false, 
                    message: 'Error interno del servidor' 
                });
            }
        });
    }

    // 🔐 LOGIN SEGURO
    async login(loginData) {
        return new Promise(async (resolve, reject) => {
            try {
                const { email, password } = loginData;

                if (!email || !password) {
                    return reject({ 
                        success: false, 
                        message: 'Email y contraseña son requeridos' 
                    });
                }

                console.log(`🔐 Intentando login para: ${email}`);

                // Buscar usuario
                db.get(
                    `SELECT id, name, email, password_hash, whatsapp, experience, favorite_species, city, province, country, created_at 
                     FROM users WHERE email = ? AND is_active = 1`,
                    [email],
                    async (err, user) => {
                        if (err) {
                            console.error('❌ Error buscando usuario:', err);
                            return reject({ 
                                success: false, 
                                message: 'Error del servidor' 
                            });
                        }

                        if (!user) {
                            console.log(`❌ Usuario no encontrado: ${email}`);
                            return reject({ 
                                success: false, 
                                message: 'Credenciales inválidas' 
                            });
                        }

                        console.log(`✅ Usuario encontrado: ${user.name} (ID: ${user.id})`);

                        // 🔐 VERIFICAR contraseña hasheada
                        const passwordValid = await bcrypt.compare(password, user.password_hash);
                        
                        if (!passwordValid) {
                            console.log(`❌ Contraseña inválida para: ${email}`);
                            return reject({ 
                                success: false, 
                                message: 'Credenciales inválidas' 
                            });
                        }

                        // 🎫 Generar token JWT
                        const token = jwt.sign(
                            { 
                                userId: user.id, 
                                email: user.email 
                            },
                            JWT_SECRET,
                            { expiresIn: '30d' }
                        );

                        console.log(`✅ Token generado para login de: ${user.name}`);

                        // Actualizar último login
                        db.run(
                            `UPDATE users SET last_login = datetime('now') WHERE id = ?`,
                            [user.id],
                            (err) => {
                                if (err) {
                                    console.error('❌ Error actualizando last_login:', err);
                                }
                            }
                        );

                        resolve({
                            success: true,
                            message: 'Login exitoso',
                            token,
                            user: {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                whatsapp: user.whatsapp,
                                experience: user.experience,
                                favorite_species: user.favorite_species,
                                city: user.city,
                                province: user.province,
                                country: user.country,
                                created_at: user.created_at
                            }
                        });
                    }
                );

            } catch (error) {
                console.error('❌ Error en login:', error);
                reject({ 
                    success: false, 
                    message: 'Error interno del servidor' 
                });
            }
        });
    }

    // 🔐 VERIFICAR TOKEN
    verifyToken(token) {
        return new Promise((resolve, reject) => {
            try {
                console.log('🔐 AuthBackend verificando token...');
                const decoded = jwt.verify(token, JWT_SECRET);
                console.log('✅ Token verificado por AuthBackend:', { userId: decoded.userId, email: decoded.email });
                resolve(decoded);
            } catch (error) {
                console.error('❌ Error verificando token en AuthBackend:', error.message);
                reject({ success: false, message: 'Token inválido' });
            }
        });
    }

    // 🔐 OBTENER USUARIO POR ID
    getUserById(userId) {
        return new Promise((resolve, reject) => {
            db.get(
                `SELECT id, name, email, whatsapp, experience, favorite_species, city, province, country, created_at, facebook_url, instagram_url, tiktok_url 
                 FROM users WHERE id = ? AND is_active = 1`,
                [userId],
                (err, user) => {
                    if (err) {
                        console.error('❌ Error obteniendo usuario por ID:', err);
                        reject({ success: false, message: 'Error del servidor' });
                    } else if (!user) {
                        console.error(`❌ Usuario no encontrado ID: ${userId}`);
                        reject({ success: false, message: 'Usuario no encontrado' });
                    } else {
                        console.log(`✅ Usuario obtenido: ${user.name} (ID: ${user.id})`);
                        resolve({ success: true, user });
                    }
                }
            );
        });
    }
}

module.exports = AuthBackend;