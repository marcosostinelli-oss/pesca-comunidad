const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pesca-comunidad.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 INICIANDO REPARACIÓN DE SPOTS...\n');

db.serialize(() => {
    // 1. Verificar estructura actual
    db.all("PRAGMA table_info(fishing_spots)", (err, columns) => {
        console.log('1. 📊 ESTRUCTURA ACTUAL DE LA TABLA:');
        console.log('=====================================');
        columns.forEach(col => {
            console.log(`   - ${col.name} (${col.type})`);
        });
        console.log('');

        // 2. Agregar columnas si no existen
        console.log('2. 🔧 AGREGANDO COLUMNAS FALTANTES...');
        
        db.run("ALTER TABLE fishing_spots ADD COLUMN accessibility TEXT DEFAULT 'moderado'", (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('   ❌ Error agregando accessibility:', err.message);
            } else {
                console.log('   ✅ Columna accessibility agregada/ya existe');
            }
        });

        db.run("ALTER TABLE fishing_spots ADD COLUMN facilities TEXT", (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('   ❌ Error agregando facilities:', err.message);
            } else {
                console.log('   ✅ Columna facilities agregada/ya existe');
            }
        });

        // 3. Actualizar spots existentes
        console.log('\n3. 🔄 ACTUALIZANDO SPOTS EXISTENTES...');
        db.run(`UPDATE fishing_spots SET 
                accessibility = 'moderado', 
                facilities = '["estacionamiento"]'
                WHERE accessibility IS NULL OR facilities IS NULL`, 
        function(err) {
            if (err) {
                console.error('   ❌ Error actualizando spots:', err.message);
            } else {
                console.log(`   ✅ ${this.changes} spots actualizados con nuevos campos`);
            }

            // 4. Verificar spots después de la actualización
            console.log('\n4. 📝 VERIFICANDO SPOTS ACTUALIZADOS...');
            db.all("SELECT id, name, visibility, accessibility, facilities FROM fishing_spots", (err, spots) => {
                if (err) {
                    console.error('   ❌ Error obteniendo spots:', err.message);
                } else {
                    console.log('   📋 LISTA COMPLETA DE SPOTS:');
                    console.log('   ===========================');
                    spots.forEach(spot => {
                        console.log(`   ID: ${spot.id}`);
                        console.log(`   Nombre: ${spot.name}`);
                        console.log(`   Visibilidad: ${spot.visibility}`);
                        console.log(`   Accesibilidad: ${spot.accessibility}`);
                        console.log(`   Facilidades: ${spot.facilities}`);
                        console.log('   ---');
                    });
                    console.log(`   📊 TOTAL: ${spots.length} spots en la base de datos\n`);
                }

                // 5. Verificar endpoint del backend
                console.log('5. 🌐 VERIFICANDO ENDPOINT DEL BACKEND...');
                db.all("SELECT COUNT(*) as count FROM fishing_spots WHERE visibility = 'public'", (err, row) => {
                    if (err) {
                        console.error('   ❌ Error contando spots públicos:', err.message);
                    } else {
                        console.log(`   🔍 El backend debería devolver: ${row[0].count} spots públicos`);
                        
                        if (row[0].count === 1) {
                            console.log('   ⚠️  Solo hay 1 spot público. Esto explica por qué solo ves 1.');
                            console.log('   💡 Crea más spots o cambia la visibilidad de los existentes a "public"');
                        }
                    }

                    db.close();
                    console.log('\n🎯 REPARACIÓN COMPLETADA!');
                    console.log('🔄 Reinicia el servidor y prueba nuevamente.');
                });
            });
        });
    });
});