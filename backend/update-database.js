const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurar la ruta a la base de datos
const dbPath = path.join(__dirname, 'pesca-comunidad.db');
console.log('Conectando a la base de datos:', dbPath);

// Crear conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
        process.exit(1);
    }
    console.log('✅ Conectado a la base de datos SQLite');
});

// Función para listar todas las tablas
function listTables() {
    return new Promise((resolve, reject) => {
        const sql = `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`;
        db.all(sql, (err, tables) => {
            if (err) {
                reject(err);
            } else {
                console.log('\n📋 Tablas existentes en la base de datos:');
                tables.forEach(table => console.log(`   - ${table.name}`));
                resolve(tables);
            }
        });
    });
}

// Función para verificar si existe una columna en una tabla
function columnExists(tableName, columnName) {
    return new Promise((resolve, reject) => {
        const sql = `PRAGMA table_info(${tableName})`;
        db.all(sql, (err, columns) => {
            if (err) {
                console.log(`   ℹ️ No se pudo verificar la tabla ${tableName}, puede que no exista`);
                resolve(false);
            } else {
                const exists = columns.some(col => col.name === columnName);
                resolve(exists);
            }
        });
    });
}

// Función para ejecutar una consulta y manejar errores
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('❌ Error ejecutando consulta:', err.message);
                console.error('Consulta:', sql);
                reject(err);
            } else {
                console.log('✅ Consulta ejecutada correctamente');
                resolve(this);
            }
        });
    });
}

// Función principal para actualizar la base de datos
async function updateDatabase() {
    console.log('\n🔄 Iniciando actualización de la base de datos para guías...\n');
    
    try {
        // 1. Listar tablas existentes para referencia
        await listTables();
        
        // 2. Buscar la tabla de spots (podría llamarse 'spots', 'fishing_spots', etc.)
        console.log('\n🔍 Buscando tabla de spots...');
        const spotTables = ['spots', 'fishing_spots', 'spot', 'fishing_spot'];
        let spotTableName = null;
        
        for (const tableName of spotTables) {
            const exists = await new Promise((resolve) => {
                const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
                db.get(sql, [tableName], (err, row) => {
                    resolve(!!row);
                });
            });
            
            if (exists) {
                spotTableName = tableName;
                console.log(`✅ Tabla de spots encontrada: ${spotTableName}`);
                break;
            }
        }
        
        if (!spotTableName) {
            console.log('⚠️  No se encontró tabla de spots. Verifica el nombre manualmente.');
            console.log('   Para continuar, necesitamos saber el nombre exacto de la tabla de spots.');
            console.log('   Por favor, revisa los nombres de tablas listados arriba.');
            process.exit(1);
        }
        
        // 3. Agregar campo 'user_type' a la tabla users si no existe
        console.log('\n3. Verificando campo user_type en tabla users...');
        const userTypeExists = await columnExists('users', 'user_type');
        
        if (!userTypeExists) {
            console.log('   Agregando campo user_type...');
            await runQuery(`ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'fisherman'`);
            console.log('   ✅ Campo user_type agregado');
        } else {
            console.log('   ✅ Campo user_type ya existe');
        }
        
        // 4. Agregar campo 'spot_type' a la tabla de spots si no existe
        console.log(`\n4. Verificando campo spot_type en tabla ${spotTableName}...`);
        const spotTypeExists = await columnExists(spotTableName, 'spot_type');
        
        if (!spotTypeExists) {
            console.log(`   Agregando campo spot_type a ${spotTableName}...`);
            await runQuery(`ALTER TABLE ${spotTableName} ADD COLUMN spot_type TEXT DEFAULT 'user'`);
            console.log(`   ✅ Campo spot_type agregado a ${spotTableName}`);
        } else {
            console.log(`   ✅ Campo spot_type ya existe en ${spotTableName}`);
        }
        
        // 5. Crear tabla 'guides' si no existe
        console.log('\n5. Creando tabla guides...');
        const guidesTableSql = `SELECT name FROM sqlite_master WHERE type='table' AND name='guides'`;
        const guidesTableExists = await new Promise((resolve) => {
            db.get(guidesTableSql, (err, row) => {
                resolve(!!row);
            });
        });
        
        if (!guidesTableExists) {
            const createGuidesTable = `
                CREATE TABLE guides (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
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
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )
            `;
            
            await runQuery(createGuidesTable);
            console.log('   ✅ Tabla guides creada');
            
            // Crear índices para optimizar búsquedas
            await runQuery('CREATE INDEX idx_guides_user_id ON guides(user_id)');
            await runQuery('CREATE INDEX idx_guides_is_active ON guides(is_active)');
            console.log('   ✅ Índices creados');
        } else {
            console.log('   ✅ Tabla guides ya existe');
            
            // Verificar y agregar columnas faltantes si es necesario
            const guideColumnsToCheck = ['is_verified', 'is_active', 'updated_at'];
            for (const column of guideColumnsToCheck) {
                const exists = await columnExists('guides', column);
                if (!exists) {
                    console.log(`   Agregando columna ${column}...`);
                    if (column === 'is_verified') {
                        await runQuery(`ALTER TABLE guides ADD COLUMN ${column} BOOLEAN DEFAULT 0`);
                    } else if (column === 'is_active') {
                        await runQuery(`ALTER TABLE guides ADD COLUMN ${column} BOOLEAN DEFAULT 1`);
                    } else if (column === 'updated_at') {
                        await runQuery(`ALTER TABLE guides ADD COLUMN ${column} DATETIME DEFAULT CURRENT_TIMESTAMP`);
                    }
                }
            }
        }
        
        // 6. Crear tabla 'guide_services' si no existe
        console.log('\n6. Creando tabla guide_services...');
        const servicesTableSql = `SELECT name FROM sqlite_master WHERE type='table' AND name='guide_services'`;
        const servicesTableExists = await new Promise((resolve) => {
            db.get(servicesTableSql, (err, row) => {
                resolve(!!row);
            });
        });
        
        if (!servicesTableExists) {
            const createGuideServicesTable = `
                CREATE TABLE guide_services (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guide_id INTEGER NOT NULL,
                    service_name TEXT NOT NULL,
                    description TEXT,
                    price REAL DEFAULT 0,
                    duration_hours INTEGER,
                    includes_gear BOOLEAN DEFAULT 0,
                    includes_transport BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (guide_id) REFERENCES guides (id) ON DELETE CASCADE
                )
            `;
            
            await runQuery(createGuideServicesTable);
            console.log('   ✅ Tabla guide_services creada');
        } else {
            console.log('   ✅ Tabla guide_services ya existe');
        }
        
        // 7. Crear tabla 'guide_reviews' si no existe
        console.log('\n7. Creando tabla guide_reviews...');
        const reviewsTableSql = `SELECT name FROM sqlite_master WHERE type='table' AND name='guide_reviews'`;
        const reviewsTableExists = await new Promise((resolve) => {
            db.get(reviewsTableSql, (err, row) => {
                resolve(!!row);
            });
        });
        
        if (!reviewsTableExists) {
            const createGuideReviewsTable = `
                CREATE TABLE guide_reviews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guide_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                    comment TEXT,
                    trip_date DATE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (guide_id) REFERENCES guides (id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    UNIQUE(guide_id, user_id)
                )
            `;
            
            await runQuery(createGuideReviewsTable);
            console.log('   ✅ Tabla guide_reviews creada');
        } else {
            console.log('   ✅ Tabla guide_reviews ya existe');
        }
        
        // 8. Crear tabla 'guide_booking_requests' para futuras reservas
        console.log('\n8. Creando tabla guide_booking_requests (para futuro)...');
        const bookingsTableSql = `SELECT name FROM sqlite_master WHERE type='table' AND name='guide_booking_requests'`;
        const bookingsTableExists = await new Promise((resolve) => {
            db.get(bookingsTableSql, (err, row) => {
                resolve(!!row);
            });
        });
        
        if (!bookingsTableExists) {
            const createBookingRequestsTable = `
                CREATE TABLE guide_booking_requests (
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
                    FOREIGN KEY (guide_id) REFERENCES guides (id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (service_id) REFERENCES guide_services (id) ON DELETE SET NULL
                )
            `;
            
            await runQuery(createBookingRequestsTable);
            console.log('   ✅ Tabla guide_booking_requests creada (para futuras reservas)');
        } else {
            console.log('   ✅ Tabla guide_booking_requests ya existe');
        }
        
        console.log('\n🎉 ¡Base de datos actualizada exitosamente!');
        console.log('\n📊 Resumen de cambios:');
        console.log(`   - Campo user_type agregado a tabla users`);
        console.log(`   - Campo spot_type agregado a tabla ${spotTableName}`);
        console.log(`   - Tabla guides creada (guías de pesca)`);
        console.log(`   - Tabla guide_services creada (servicios de guías)`);
        console.log(`   - Tabla guide_reviews creada (reseñas de guías)`);
        console.log(`   - Tabla guide_booking_requests creada (para futuras reservas)`);
        
    } catch (error) {
        console.error('\n❌ Error durante la actualización:', error.message);
    } finally {
        // Cerrar la conexión a la base de datos
        db.close((err) => {
            if (err) {
                console.error('Error al cerrar la base de datos:', err.message);
            } else {
                console.log('\n🔒 Conexión a la base de datos cerrada');
            }
        });
    }
}

// Ejecutar la actualización
updateDatabase();