// ==================================================
// MÓDULO DE GESTIÓN DE SPOTS - CONEXIÓN A BASE DE DATOS
// ==================================================

export class SpotsManager {
    constructor(app) {
        this.app = app;
        this.userSpots = [];
        this.apiBaseUrl = '/api/spots';
        this.loadUserSpots();
    }

    // ==================================================
    // MÉTODOS DE BASE DE DATOS - ACTUALIZADOS CON NUEVOS CAMPOS
    // ==================================================

    // ✅ GUARDAR SPOT EN LA BASE DE DATOS - CON NUEVOS CAMPOS
    async saveSpotToDatabase(spotData) {
        try {
            const user = this.app.getCurrentUser();
            const token = this.app.getAuthToken();
            
            console.log('🔐 DEBUG FRONTEND - Estado de autenticación:', { 
                user: user ? `✅ ${user.name} (${user.email})` : '❌ No user',
                token: token ? `✅ Presente (${token.length} chars)` : '❌ No token',
                tokenPreview: token ? token.substring(0, 30) + '...' : 'No token'
            });

            if (!user || !token) {
                throw new Error('Usuario no autenticado. Por favor inicia sesión.');
            }

            let latitude, longitude;
            
            if (spotData.coordinates && spotData.coordinates.lat && spotData.coordinates.lng) {
                latitude = spotData.coordinates.lat;
                longitude = spotData.coordinates.lng;
            } else if (spotData.latitude && spotData.longitude) {
                latitude = spotData.latitude;
                longitude = spotData.longitude;
            } else {
                throw new Error('Estructura de coordenadas no válida');
            }

            // ✅ ACTUALIZADO: Incluir nuevos campos en la petición
            const requestBody = {
                name: spotData.name,
                latitude: latitude,
                longitude: longitude,
                water_type: spotData.type,
                description: spotData.description,
                species: spotData.species,
                best_time: spotData.bestTime,
                visibility: spotData.visibility,
                accessibility: spotData.accessibility || 'moderado', // ✅ NUEVO
                facilities: spotData.facilities || []                // ✅ NUEVO
            };

            console.log('🔄 Enviando petición a /api/spots...', requestBody);

            const response = await fetch('/api/spots', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📨 Respuesta del servidor:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers)
            });

            if (!response.ok) {
                let errorDetails = 'Error desconocido';
                try {
                    const errorData = await response.json();
                    errorDetails = errorData.error || errorData.message || JSON.stringify(errorData);
                    console.error('❌ Error detallado del servidor:', errorData);
                } catch (parseError) {
                    errorDetails = `No se pudo parsear la respuesta: ${parseError.message}`;
                }

                if (response.status === 401) {
                    console.log('🔄 Cerrando sesión por token expirado...');
                    this.app.auth.logout();
                    throw new Error('Sesión expirada. Por favor vuelve a iniciar sesión.');
                } else if (response.status === 403) {
                    throw new Error(`Acceso denegado (403): ${errorDetails}`);
                } else {
                    throw new Error(`Error ${response.status}: ${errorDetails}`);
                }
            }

            const savedSpot = await response.json();
            console.log('✅ Spot guardado en base de datos:', savedSpot);
            
            this.userSpots.push(savedSpot);
            this.saveUserSpots();
            
            return savedSpot;

        } catch (error) {
            console.error('❌ Error guardando spot en base de datos:', error);
            throw error;
        }
    }

    // ✅ MÉTODO: saveSpot (alias para compatibilidad)
    async saveSpot(spotData) {
        console.log('💾 SpotsManager.saveSpot llamado con:', spotData);
        return await this.addSpot(spotData);
    }

    // ✅ NUEVO MÉTODO: Obtener todos los spots del usuario + spots públicos + spots de amigos
    async getAllUserSpots() {
        try {
            console.log('🔄 Cargando todos los spots (públicos, amigos, propios)...');
            
            if (!this.app.isAuthenticated()) {
                console.log('👤 Usuario no autenticado, cargando solo spots públicos');
                return await this.getPublicSpots();
            }

            const token = this.app.getAuthToken();
            if (!token) {
                throw new Error('Usuario no autenticado');
            }

            // 🔄 CAMBIO: Usar el endpoint que incluye spots de amigos
            const response = await fetch('/api/friend-spots/all', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status} al cargar spots`);
            }

            const spots = await response.json();
            console.log(`✅ ${spots.length} spots cargados (públicos, amigos, propios)`);
            
            // ✅ CORREGIDO: Contar ambas variantes en español e inglés
            const publicSpots = spots.filter(spot => 
                spot.visibility === 'public' || spot.visibility === 'público'
            );
            const friendsSpots = spots.filter(spot => 
                spot.visibility === 'friends-only' || spot.visibility === 'solo-amigos'
            );
            const privateSpots = spots.filter(spot => 
                spot.visibility === 'private' || spot.visibility === 'privado'
            );
            
            console.log(`📊 Distribución: ${publicSpots.length} públicos, ${friendsSpots.length} solo-amigos, ${privateSpots.length} privados`);

            return spots;

        } catch (error) {
            console.error('❌ Error cargando todos los spots:', error);
            
            // Fallback a spots públicos
            console.warn('🔄 Fallback a spots públicos');
            return await this.getPublicSpots();
        }
    }

    // ✅ CARGAR SPOTS DESDE LA BASE DE DATOS
    async loadSpotsFromDatabase() {
        try {
            console.log('🔄 Cargando spots desde base de datos...');
            const response = await fetch('/api/spots');
            
            if (!response.ok) {
                throw new Error(`Error ${response.status} al cargar spots`);
            }

            const spots = await response.json();
            console.log(`✅ ${spots.length} spots cargados desde base de datos`);
            return spots;

        } catch (error) {
            console.error('❌ Error cargando spots desde base de datos:', error);
            
            console.warn('🔄 Fallback a spots locales');
            return this.getUserSpots();
        }
    }

    // ✅ ELIMINAR SPOT DE LA BASE DE DATOS
    async deleteSpotFromDatabase(spotId) {
        try {
            const token = this.app.getAuthToken();
            
            if (!token) {
                throw new Error('Usuario no autenticado');
            }

            console.log(`🗑️ Eliminando spot ${spotId} de base de datos...`);
            const response = await fetch(`/api/spots/${spotId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Sesión expirada');
                } else if (response.status === 403) {
                    throw new Error('No tienes permisos para eliminar este spot');
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Error ${response.status} al eliminar el spot`);
                }
            }

            console.log('✅ Spot eliminado de base de datos:', spotId);
            return true;

        } catch (error) {
            console.error('❌ Error eliminando spot de base de datos:', error);
            throw error;
        }
    }

    // ✅ ACTUALIZAR SPOT EN LA BASE DE DATOS - CON NUEVOS CAMPOS
    async updateSpotInDatabase(spotId, updatedData) {
        try {
            const token = this.app.getAuthToken();
            
            if (!token) {
                throw new Error('Usuario no autenticado');
            }

            console.log(`✏️ Actualizando spot ${spotId} en base de datos...`);
            
            // ✅ ACTUALIZADO: Incluir nuevos campos en la actualización
            const updateBody = {
                name: updatedData.name,
                latitude: updatedData.latitude,
                longitude: updatedData.longitude,
                water_type: updatedData.type,
                description: updatedData.description,
                species: updatedData.species,
                best_time: updatedData.bestTime,
                visibility: updatedData.visibility,
                accessibility: updatedData.accessibility || 'moderado', // ✅ NUEVO
                facilities: updatedData.facilities || []                // ✅ NUEVO
            };

            const response = await fetch(`/api/spots/${spotId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateBody)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Sesión expirada');
                } else if (response.status === 403) {
                    throw new Error('No tienes permisos para actualizar este spot');
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Error ${response.status} al actualizar el spot`);
                }
            }

            const updatedSpot = await response.json();
            console.log('✅ Spot actualizado en base de datos:', updatedSpot);
            return updatedSpot;

        } catch (error) {
            console.error('❌ Error actualizando spot en base de datos:', error);
            throw error;
        }
    }

    // ==================================================
    // MÉTODOS LOCALES (como fallback) - ACTUALIZADOS
    // ==================================================

    // Cargar spots del usuario desde localStorage
    loadUserSpots() {
        try {
            const savedSpots = localStorage.getItem('userFishingSpots');
            if (savedSpots) {
                this.userSpots = JSON.parse(savedSpots);
                console.log(`✅ Cargados ${this.userSpots.length} spots del localStorage`);
            } else {
                console.log('ℹ️ No hay spots guardados en localStorage');
                this.userSpots = [];
            }
        } catch (error) {
            console.error('❌ Error cargando spots del localStorage:', error);
            this.userSpots = [];
        }
    }

    // Guardar spots del usuario en localStorage
    saveUserSpots() {
        try {
            localStorage.setItem('userFishingSpots', JSON.stringify(this.userSpots));
            console.log('💾 Spots del usuario guardados en localStorage');
        } catch (error) {
            console.error('❌ Error guardando spots en localStorage:', error);
        }
    }

    // Agregar nuevo spot (local + base de datos) - ACTUALIZADO CON NUEVOS CAMPOS
    async addSpot(spotData) {
        try {
            if (!this.app.isAuthenticated()) {
                console.warn('⚠️ Usuario no autenticado, guardando solo localmente');
                throw new Error('Usuario no autenticado');
            }

            console.log('🔄 Intentando guardar spot en base de datos...');
            const savedSpot = await this.saveSpotToDatabase(spotData);
            
            this.app.showNotification('✅ Spot guardado exitosamente en la nube', 'success');
            return savedSpot;
            
        } catch (dbError) {
            console.warn('⚠️ Fallback a localStorage:', dbError.message);
            
            // ✅ ACTUALIZADO: Incluir nuevos campos en el fallback local
            const newSpot = {
                id: this.generateSpotId(),
                ...spotData,
                accessibility: spotData.accessibility || 'moderado', // ✅ NUEVO
                facilities: spotData.facilities || [],              // ✅ NUEVO
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isLocal: true,
                syncError: dbError.message
            };

            this.userSpots.push(newSpot);
            this.saveUserSpots();
            
            console.log('✅ Nuevo spot guardado localmente:', newSpot);
            
            this.app.showNotification(
                '📍 Spot guardado localmente. Se sincronizará cuando se resuelva el problema de conexión.', 
                'info'
            );
            
            return newSpot;
        }
    }

    // Generar ID único para el spot
    generateSpotId() {
        return 'spot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Obtener todos los spots del usuario
    async getUserSpots() {
        try {
            if (this.app.isAuthenticated()) {
                console.log('🔄 Cargando spots del usuario (autenticado)...');
                
                const token = this.app.getAuthToken();
                if (!token) {
                    throw new Error('Usuario no autenticado');
                }

                // Usar el endpoint que devuelve los spots del usuario
                const response = await fetch('/api/spots/my-spots', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error ${response.status} al cargar spots del usuario`);
                }

                const spots = await response.json();
                console.log(`✅ ${spots.length} spots del usuario cargados`);
                return spots;

            } else {
                console.log('🔄 Cargando spots locales (usuario no autenticado)...');
                return this.userSpots;
            }
        } catch (error) {
            console.warn('⚠️ Fallback a spots locales:', error.message);
            return this.userSpots;
        }
    }

    // ✅ MÉTODO: getPublicSpots mejorado
    async getPublicSpots() {
        try {
            console.log('🔄 Cargando spots públicos...');
            
            try {
                const response = await fetch('/api/spots/public');
                
                if (response.ok) {
                    const spots = await response.json();
                    console.log(`✅ ${spots.length} spots públicos cargados desde API`);
                    return spots;
                } else {
                    console.warn(`⚠️ API de spots públicos respondió con status: ${response.status}`);
                }
            } catch (apiError) {
                console.warn('⚠️ Error llamando a API de spots públicos:', apiError);
            }
            
            console.warn('⚠️ Fallback a spots públicos locales');
            const userSpots = await this.getUserSpots();
            const publicSpots = userSpots.filter(spot => 
                spot.visibility === 'public' || 
                spot.visibility === 'público' ||
                !spot.visibility
            );
            
            console.log(`✅ ${publicSpots.length} spots públicos cargados desde localStorage`);
            return publicSpots;
            
        } catch (error) {
            console.error('❌ Error cargando spots públicos:', error);
            
            const userSpots = await this.getUserSpots();
            const publicSpots = userSpots.filter(spot => 
                spot.visibility === 'public' || 
                spot.visibility === 'público' ||
                !spot.visibility
            );
            
            console.log(`✅ ${publicSpots.length} spots públicos cargados como fallback`);
            return publicSpots;
        }
    }

    // Obtener spots por visibilidad
    async getSpotsByVisibility(visibility) {
        const spots = await this.getUserSpots();
        return spots.filter(spot => spot.visibility === visibility);
    }

    // Eliminar spot
    async deleteSpot(spotId) {
        try {
            if (this.app.isAuthenticated()) {
                console.log(`🔄 Intentando eliminar spot ${spotId} de base de datos...`);
                await this.deleteSpotFromDatabase(spotId);
            } else {
                console.log(`🔄 Eliminando spot ${spotId} solo localmente (usuario no autenticado)...`);
            }
            
            const initialLength = this.userSpots.length;
            this.userSpots = this.userSpots.filter(spot => spot.id !== spotId);
            
            if (this.userSpots.length < initialLength) {
                this.saveUserSpots();
                console.log('✅ Spot eliminado localmente:', spotId);
            }
            
            return true;
            
        } catch (dbError) {
            console.warn('⚠️ Eliminando solo localmente:', dbError.message);
            
            const initialLength = this.userSpots.length;
            this.userSpots = this.userSpots.filter(spot => spot.id !== spotId);
            
            if (this.userSpots.length < initialLength) {
                this.saveUserSpots();
                console.log('✅ Spot eliminado localmente:', spotId);
                return true;
            }
            
            return false;
        }
    }

    // Actualizar spot - ACTUALIZADO CON NUEVOS CAMPOS
    async updateSpot(spotId, updatedData) {
        try {
            let updatedSpot = null;
            
            if (this.app.isAuthenticated()) {
                console.log(`🔄 Intentando actualizar spot ${spotId} en base de datos...`);
                updatedSpot = await this.updateSpotInDatabase(spotId, updatedData);
            } else {
                console.log(`🔄 Actualizando spot ${spotId} solo localmente (usuario no autenticado)...`);
            }
            
            const spotIndex = this.userSpots.findIndex(spot => spot.id === spotId);
            if (spotIndex !== -1) {
                this.userSpots[spotIndex] = {
                    ...this.userSpots[spotIndex],
                    ...updatedData,
                    accessibility: updatedData.accessibility || this.userSpots[spotIndex].accessibility || 'moderado', // ✅ NUEVO
                    facilities: updatedData.facilities || this.userSpots[spotIndex].facilities || [], // ✅ NUEVO
                    updatedAt: new Date().toISOString()
                };
                
                if (!updatedSpot) {
                    updatedSpot = this.userSpots[spotIndex];
                }
                
                this.saveUserSpots();
                console.log('✅ Spot actualizado localmente:', spotId);
            }
            
            return updatedSpot;
            
        } catch (dbError) {
            console.warn('⚠️ Actualizando solo localmente:', dbError.message);
            
            const spotIndex = this.userSpots.findIndex(spot => spot.id === spotId);
            if (spotIndex !== -1) {
                this.userSpots[spotIndex] = {
                    ...this.userSpots[spotIndex],
                    ...updatedData,
                    accessibility: updatedData.accessibility || this.userSpots[spotIndex].accessibility || 'moderado', // ✅ NUEVO
                    facilities: updatedData.facilities || this.userSpots[spotIndex].facilities || [], // ✅ NUEVO
                    updatedAt: new Date().toISOString()
                };
                this.saveUserSpots();
                console.log('✅ Spot actualizado localmente:', spotId);
                return this.userSpots[spotIndex];
            }
            
            return null;
        }
    }

    // Buscar spots por nombre o descripción
    async searchSpots(query) {
        const spots = await this.getUserSpots();
        const searchTerm = query.toLowerCase();
        
        return spots.filter(spot => 
            spot.name.toLowerCase().includes(searchTerm) ||
            (spot.description && spot.description.toLowerCase().includes(searchTerm)) ||
            (spot.species && spot.species.toLowerCase().includes(searchTerm)) ||
            (spot.water_type && spot.water_type.toLowerCase().includes(searchTerm)) ||
            (spot.accessibility && spot.accessibility.toLowerCase().includes(searchTerm)) // ✅ NUEVO: Buscar por accesibilidad
        );
    }

    // Obtener spots por tipo de agua
    async getSpotsByWaterType(waterType) {
        const spots = await this.getUserSpots();
        return spots.filter(spot => spot.water_type === waterType || spot.type === waterType);
    }

    // ✅ NUEVO: Obtener spots por nivel de accesibilidad
    async getSpotsByAccessibility(accessibilityLevel) {
        const spots = await this.getUserSpots();
        return spots.filter(spot => spot.accessibility === accessibilityLevel);
    }

    // ✅ NUEVO: Obtener spots que tengan ciertas facilidades
    async getSpotsByFacilities(facility) {
        const spots = await this.getUserSpots();
        return spots.filter(spot => 
            spot.facilities && 
            Array.isArray(spot.facilities) && 
            spot.facilities.includes(facility)
        );
    }

    // Obtener estadísticas de spots - ACTUALIZADO CON NUEVOS CAMPOS
    async getSpotStats() {
        const spots = await this.getUserSpots();
        
        const stats = {
            total: spots.length,
            byVisibility: {
                público: spots.filter(spot => spot.visibility === 'public' || spot.visibility === 'público').length,
                'solo-amigos': spots.filter(spot => spot.visibility === 'friends-only' || spot.visibility === 'solo-amigos').length,
                privado: spots.filter(spot => spot.visibility === 'private' || spot.visibility === 'privado').length
            },
            byWaterType: {
                río: spots.filter(spot => spot.water_type === 'río' || spot.type === 'río').length,
                lago: spots.filter(spot => spot.water_type === 'lago' || spot.type === 'lago').length,
                mar: spots.filter(spot => spot.water_type === 'mar' || spot.type === 'mar').length,
                embalse: spots.filter(spot => spot.water_type === 'embalse' || spot.type === 'embalse').length,
                arroyo: spots.filter(spot => spot.water_type === 'arroyo' || spot.type === 'arroyo').length
            },
            // ✅ NUEVO: Estadísticas de accesibilidad
            byAccessibility: {
                fácil: spots.filter(spot => spot.accessibility === 'fácil').length,
                moderado: spots.filter(spot => spot.accessibility === 'moderado').length,
                difícil: spots.filter(spot => spot.accessibility === 'difícil').length,
                'solo con vehículo': spots.filter(spot => spot.accessibility === 'solo con vehículo').length,
                'club privado': spots.filter(spot => spot.accessibility === 'club privado').length // ✅ NUEVO VALOR
            },
            // ✅ NUEVO: Estadísticas de facilidades
            byFacilities: {
                estacionamiento: spots.filter(spot => spot.facilities && spot.facilities.includes('estacionamiento')).length,
                baños: spots.filter(spot => spot.facilities && spot.facilities.includes('baños')).length,
                restaurante: spots.filter(spot => spot.facilities && spot.facilities.includes('restaurante')).length,
                camping: spots.filter(spot => spot.facilities && spot.facilities.includes('camping')).length,
                'área de descanso': spots.filter(spot => spot.facilities && spot.facilities.includes('área de descanso')).length
            }
        };

        return stats;
    }

    // Sincronizar spots locales con la base de datos
    async syncLocalSpots() {
        const localSpots = this.userSpots.filter(spot => spot.isLocal);
        
        if (localSpots.length === 0) {
            console.log('ℹ️ No hay spots locales para sincronizar');
            return;
        }

        if (!this.app.isAuthenticated()) {
            console.warn('⚠️ No se pueden sincronizar spots: usuario no autenticado');
            this.app.showNotification('⚠️ Inicia sesión para sincronizar tus spots locales', 'warning');
            return;
        }

        console.log(`🔄 Sincronizando ${localSpots.length} spots locales...`);
        
        let successCount = 0;
        let errorCount = 0;

        for (const spot of localSpots) {
            try {
                await this.saveSpotToDatabase(spot);
                this.userSpots = this.userSpots.filter(s => s.id !== spot.id);
                successCount++;
            } catch (error) {
                console.error(`❌ Error sincronizando spot ${spot.id}:`, error);
                errorCount++;
            }
        }
        
        this.saveUserSpots();
        
        console.log(`✅ Sincronización completada: ${successCount} éxitos, ${errorCount} errores`);
        
        if (successCount > 0) {
            this.app.showNotification(`✅ ${successCount} spots sincronizados con la nube`, 'success');
        }
        if (errorCount > 0) {
            this.app.showNotification(`⚠️ ${errorCount} spots no se pudieron sincronizar`, 'warning');
        }
    }

    // ✅ ACTUALIZADO: Obtener opciones de accesibilidad para formularios - CON NUEVO VALOR
    getAccessibilityOptions() {
        return [
            { value: 'fácil', label: 'Fácil - Acceso sencillo para todos' },
            { value: 'moderado', label: 'Moderado - Requiere algo de esfuerzo' },
            { value: 'difícil', label: 'Difícil - Solo para personas con buena condición física' },
            { value: 'solo con vehículo', label: 'Solo con vehículo - Acceso vehicular necesario' },
            { value: 'club privado', label: 'Club Privado - Solo para socios' }  // ✅ NUEVO VALOR
        ];
    }

    // ✅ NUEVO: Obtener opciones de facilidades para formularios
    getFacilitiesOptions() {
        return [
            { value: 'estacionamiento', label: 'Estacionamiento' },
            { value: 'baños', label: 'Baños' },
            { value: 'restaurante', label: 'Restaurante/Cafetería' },
            { value: 'camping', label: 'Zona de camping' },
            { value: 'área de descanso', label: 'Área de descanso' },
            { value: 'muelle', label: 'Muelle' },
            { value: 'rampa', label: 'Rampa para botes' },
            { value: 'alquiler equipo', label: 'Alquiler de equipo' },
            { value: 'tienda', label: 'Tienda de pesca' },
            { value: 'zona infantil', label: 'Zona infantil' }
        ];
    }
}