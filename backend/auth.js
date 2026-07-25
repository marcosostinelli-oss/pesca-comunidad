const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// ✅ Usar la conexión compartida y optimizada (WAL, timeouts, cache) en vez de abrir una propia
const { dbGet, dbRun } = require('./database');

// La clave secreta se carga desde .env (definida en server.js con dotenv.config()
// antes de que este módulo se importe, por eso ya está disponible en process.env aquí)
const JWT_SECRET = process.env.JWT_SECRET;

class AuthBackend {
    // 🔐 REGISTRO SEGURO
    async register(userData) {
        try {
            const { name, email, password, whatsapp } = userData;

            // Validaciones
            if (!name || !email || !password) {
                throw { success: false, message: 'Todos los campos obligatorios deben ser completados' };
            }

            if (password.length < 6) {
                throw { success: false, message: 'La contraseña debe tener al menos 6 caracteres' };
            }

            // Verificar si el usuario ya existe
            const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);

            if (existing) {
                throw { success: false, message: 'Este email ya está registrado' };
            }

            // 🔐 HASH SEGURO de la contraseña
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Insertar usuario en la base de datos
            const result = await dbRun(
                `INSERT INTO users (name, email, password_hash, whatsapp, country, created_at) 
                 VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                [name, email, passwordHash, whatsapp || null, 'Argentina']
            );

            const userId = result.lastID;
            console.log(`✅ Usuario creado: ${name} (ID: ${userId})`);

            // Obtener usuario creado (sin password)
            const user = await dbGet(
                `SELECT id, name, email, whatsapp, experience, favorite_species, city, province, country, created_at 
                 FROM users WHERE id = ?`,
                [userId]
            );

            // 🎫 Generar token JWT seguro
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            console.log(`✅ Token generado para usuario ID: ${user.id}`);

            return {
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
            };

        } catch (error) {
            if (error && error.success === false) {
                throw error; // Errores de validación ya formateados
            }
            console.error('❌ Error en registro:', error);
            throw { success: false, message: 'Error interno del servidor' };
        }
    }

    // 🔐 LOGIN SEGURO
    async login(loginData) {
        try {
            const { email, password } = loginData;

            if (!email || !password) {
                throw { success: false, message: 'Email y contraseña son requeridos' };
            }

            console.log(`🔐 Intentando login para: ${email}`);

            // Buscar usuario
            const user = await dbGet(
                `SELECT id, name, email, password_hash, whatsapp, experience, favorite_species, city, province, country, created_at 
                 FROM users WHERE email = ? AND is_active = 1`,
                [email]
            );

            if (!user) {
                console.log(`❌ Usuario no encontrado: ${email}`);
                throw { success: false, message: 'Credenciales inválidas' };
            }

            console.log(`✅ Usuario encontrado: ${user.name} (ID: ${user.id})`);

            // 🔐 VERIFICAR contraseña hasheada
            const passwordValid = await bcrypt.compare(password, user.password_hash);

            if (!passwordValid) {
                console.log(`❌ Contraseña inválida para: ${email}`);
                throw { success: false, message: 'Credenciales inválidas' };
            }

            // 🎫 Generar token JWT
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            console.log(`✅ Token generado para login de: ${user.name}`);

            // Actualizar último login (no bloqueante: si falla, no interrumpe el login)
            dbRun(`UPDATE users SET last_login = datetime('now') WHERE id = ?`, [user.id])
                .catch(err => console.error('❌ Error actualizando last_login:', err.message));

            return {
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
            };

        } catch (error) {
            if (error && error.success === false) {
                throw error;
            }
            console.error('❌ Error en login:', error);
            throw { success: false, message: 'Error interno del servidor' };
        }
    }

    // 🔐 VERIFICAR TOKEN
    verifyToken(token) {
        return new Promise((resolve, reject) => {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                resolve(decoded);
            } catch (error) {
                console.error('❌ Error verificando token en AuthBackend:', error.message);
                reject({ success: false, message: 'Token inválido' });
            }
        });
    }

    // 🔐 OBTENER USUARIO POR ID
    async getUserById(userId) {
        try {
            const user = await dbGet(
                `SELECT id, name, email, whatsapp, experience, favorite_species, city, province, country, created_at, facebook_url, instagram_url, tiktok_url 
                 FROM users WHERE id = ? AND is_active = 1`,
                [userId]
            );

            if (!user) {
                throw { success: false, message: 'Usuario no encontrado' };
            }

            return { success: true, user };
        } catch (error) {
            if (error && error.success === false) {
                throw error;
            }
            console.error('❌ Error obteniendo usuario por ID:', error);
            throw { success: false, message: 'Error del servidor' };
        }
    }
}

module.exports = AuthBackend;
