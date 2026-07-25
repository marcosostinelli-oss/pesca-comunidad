// /backend/database.js - VERSIÓN CORREGIDA
// NO crea conexión, solo exporta funciones que usarán la conexión de server.js

let db = null; // Esta variable será asignada desde server.js

// Función para inicializar la conexión (llamada desde server.js)
function initDatabase(connection) {
    db = connection;
    console.log('✅ Database.js inicializado con la conexión compartida de server.js');
    
    // 🔧 CONFIGURACIONES PARA MEJOR RENDIMIENTO (ahora usando la conexión compartida)
    db.serialize(() => {
        // Habilitar WAL mode para mejor concurrencia
        db.run('PRAGMA journal_mode = WAL;');
        // Mejorar rendimiento de escritura
        db.run('PRAGMA synchronous = NORMAL;');
        // Habilitar foreign keys
        db.run('PRAGMA foreign_keys = ON;');
        // Timeout de 10 segundos para operaciones bloqueadas
        db.run('PRAGMA busy_timeout = 10000;');
        // Cache de 2000 páginas (~16MB)
        db.run('PRAGMA cache_size = 2000;');
    });
}

// 🔧 PROMISIFY CON TIMEOUTS INTEGRADOS
function dbRun(sql, params = [], timeout = 10000) {
    if (!db) {
        throw new Error('Database no inicializada. Asegúrate que server.js llame a initDatabase()');
    }
    return new Promise((resolve, reject) => {
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            reject(new Error(`Timeout dbRun (${timeout}ms): ${sql.substring(0, 50)}...`));
        }, timeout);

        db.run(sql, params, function (err) {
            clearTimeout(timeoutId);
            if (!timedOut) {
                if (err) {
                    console.error(`❌ Error en dbRun: ${sql.substring(0, 50)}...`, err.message);
                    reject(err);
                } else {
                    resolve(this);
                }
            }
        });
    });
}

function dbGet(sql, params = [], timeout = 5000) {
    if (!db) {
        throw new Error('Database no inicializada. Asegúrate que server.js llame a initDatabase()');
    }
    return new Promise((resolve, reject) => {
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            reject(new Error(`Timeout dbGet (${timeout}ms): ${sql.substring(0, 50)}...`));
        }, timeout);

        db.get(sql, params, (err, row) => {
            clearTimeout(timeoutId);
            if (!timedOut) {
                if (err) {
                    console.error(`❌ Error en dbGet: ${sql.substring(0, 50)}...`, err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            }
        });
    });
}

function dbAll(sql, params = [], timeout = 15000) {
    if (!db) {
        throw new Error('Database no inicializada. Asegúrate que server.js llame a initDatabase()');
    }
    return new Promise((resolve, reject) => {
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            reject(new Error(`Timeout dbAll (${timeout}ms): ${sql.substring(0, 50)}...`));
        }, timeout);

        db.all(sql, params, (err, rows) => {
            clearTimeout(timeoutId);
            if (!timedOut) {
                if (err) {
                    console.error(`❌ Error en dbAll: ${sql.substring(0, 50)}...`, err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            }
        });
    });
}

// 🔧 FUNCIÓN PARA MANEJAR TRANSACCIONES
function executeTransaction(callback) {
    if (!db) {
        throw new Error('Database no inicializada. Asegúrate que server.js llame a initDatabase()');
    }
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            callback(db)
                .then((result) => {
                    db.run('COMMIT', (err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    });
                })
                .catch((error) => {
                    db.run('ROLLBACK');
                    reject(error);
                });
        });
    });
}

module.exports = {
    initDatabase,
    dbRun,
    dbGet,
    dbAll,
    executeTransaction
};