// ==================================================
// MÓDULO DE BÚSQUEDA DE UBICACIONES
// ==================================================

export class SearchManager {
    constructor(app) {
        this.app = app;
    }

    searchLocation() {
        const query = document.getElementById('search-input').value;
        if (!query) {
            this.app.notifications.show('❌ Ingresa una ubicación para buscar', 'error');
            return;
        }

        this.app.notifications.show('🔍 Buscando ubicación...', 'info');

        // Usar Nominatim para búsqueda de ubicaciones
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const result = data[0];
                    const coords = [parseFloat(result.lat), parseFloat(result.lon)];
                    
                    this.app.getMap().setView(coords, 13);
                    
                    // Agregar marcador del resultado de búsqueda
                    if (this.app.getCurrentMarker()) {
                        this.app.getMap().removeLayer(this.app.getCurrentMarker());
                    }
                    const marker = L.marker(coords)
                        .addTo(this.app.getMap())
                        .bindPopup(`📍 ${result.display_name}`)
                        .openPopup();
                    this.app.setCurrentMarker(marker);
                    
                    this.app.notifications.show(`📍 Ubicación encontrada: ${result.display_name}`, 'success');
                } else {
                    this.app.notifications.show('❌ No se encontró la ubicación', 'error');
                }
            })
            .catch(error => {
                console.error('Error en búsqueda:', error);
                this.app.notifications.show('❌ Error en la búsqueda', 'error');
            });
    }

    getUserLocation() {
        if (navigator.geolocation) {
            this.app.notifications.show('📍 Buscando tu ubicación...', 'info');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = [position.coords.latitude, position.coords.longitude];
                    this.app.getMap().setView(coords, 13);
                    
                    // Agregar marcador de ubicación actual
                    if (this.app.getCurrentMarker()) {
                        this.app.getMap().removeLayer(this.app.getCurrentMarker());
                    }
                    const marker = L.marker(coords)
                        .addTo(this.app.getMap())
                        .bindPopup('📍 Tu ubicación actual')
                        .openPopup();
                    this.app.setCurrentMarker(marker);
                    
                    this.app.notifications.show('📍 Ubicación encontrada', 'success');
                },
                (error) => {
                    console.error('Error obteniendo ubicación:', error);
                    this.app.notifications.show('❌ No se pudo obtener tu ubicación', 'error');
                }
            );
        } else {
            this.app.notifications.show('❌ Tu navegador no soporta geolocalización', 'error');
        }
    }
}
