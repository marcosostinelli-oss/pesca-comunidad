// ==================================================
// ROUTER - VERSIÓN CORREGIDA - PROBLEMA DE INICIO RESUELTO
// ==================================================

export class Router {
    constructor(app) {
        this.app = app;
        this.routes = {
            '/': 'showHomePage',
            '/home': 'showHomePage',
            '/auth': 'showAuth',
            '/perfil': 'showProfile',
            '/mapa': 'showMapPage',
            '/clima': 'showWeatherPage',
            '/pesca': 'showFishingPage',
            '/amigos': 'showFriendsPage',
            '/guias': 'showGuidesPage'
        };

        // ✅ Rutas públicas: accesibles sin login. Todo lo demás redirige a Home.
        this.publicRoutes = ['/', '/home', '/auth'];
        
        // 🔧 SOPORTE PARA HASH: Detectar si estamos usando hash
        const hash = window.location.hash.substring(1);
        const path = window.location.pathname;
        
        this.currentPath = hash || path || '/';
        this._navigating = false;
        this._lastNavigationTime = 0;
        this._navigationDebounceDelay = 300; // 300ms debounce
        
        // Si hay hash en la URL, usamos modo hash
        this.useHash = window.location.hash !== '';
        
        // 🆕 NUEVO: Para detectar recargas (F5)
        this._isPageReload = true;
        
        // 🆕 BIND de métodos para mantener el contexto
        this.navigate = this.navigate.bind(this);
        this.debouncedNavigate = this.debouncedNavigate.bind(this);
        this.handleLinkClick = this.handleLinkClick.bind(this);
        this.normalizePath = this.normalizePath.bind(this);
        this.showErrorPage = this.showErrorPage.bind(this);
        
        this.init();
    }

    init() {
        console.log('🚀 Inicializando Router SPA...');
        console.log('📍 Modo:', this.useHash ? 'Hash (#)' : 'Path (/)');
        
        // 🆕 NUEVO: Detectar si es una recarga (F5)
        const perfEntries = performance.getEntriesByType('navigation');
        if (perfEntries.length > 0) {
            const navEntry = perfEntries[0];
            this._isPageReload = navEntry.type === 'reload';
        }
        console.log('🔄 Tipo de carga:', this._isPageReload ? 'Recarga (F5)' : 'Navegación normal');
        
        // Manejar navegación con el botón atrás/adelante
        if (this.useHash) {
            // 🔧 SOPORTE PARA HASH: Escuchar cambios de hash
            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.substring(1) || '/';
                console.log('📍 Hash cambiado a:', hash);
                this.debouncedNavigate(hash, false, true);
            });
        } else {
            window.addEventListener('popstate', () => {
                this.debouncedNavigate(window.location.pathname, false);
            });
        }

        // Manejar clicks en enlaces internos con debounce
        document.addEventListener('click', (event) => {
            this.handleLinkClick(event);
        });

        // Cerrar el menú hamburguesa al navegar en móvil
        document.addEventListener('click', (event) => {
            const link = event.target.closest('.navbar-nav .nav-link, #auth-buttons .btn, .navbar-brand');
            const navbarCollapse = document.querySelector('.navbar-collapse.collapse.show');
            if (link && navbarCollapse) {
                const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse, { toggle: false });
                bsCollapse.hide();
            }
        });

        // Navegar a la ruta actual al cargar
        console.log('📍 Ruta inicial:', this.currentPath);
        
        // 🆕 NUEVO: Forzar navegación en recarga (F5)
        setTimeout(() => {
            if (this._isPageReload) {
                console.log('🔄 Recarga detectada, forzando navegación inicial');
                this.navigate(this.currentPath, false, this.useHash, true);
            } else {
                this.debouncedNavigate(this.currentPath, false, this.useHash);
            }
        }, 100);
    }

    handleLinkClick(event) {
        const link = event.target.closest('a');
        
        if (link && link.href) {
            const url = new URL(link.href);
            
            // Solo manejar enlaces internos del mismo origen
            if (url.origin === window.location.origin) {
                event.preventDefault();
                
                let path = url.pathname;
                const isHashLink = link.getAttribute('href').startsWith('#');
                
                if (isHashLink) {
                    path = link.getAttribute('href').substring(1);
                    console.log('🔗 Click en enlace hash:', path);
                    this.debouncedNavigate(path, true, true);
                } else {
                    console.log('🔗 Click en enlace normal:', path);
                    this.debouncedNavigate(path, true, false);
                }
            }
        }
    }

    // Método debounced para evitar múltiples navegaciones rápidas
    debouncedNavigate(path, addToHistory = true, isHash = false) {
        const now = Date.now();
        const timeSinceLastNav = now - this._lastNavigationTime;
        
        if (timeSinceLastNav < this._navigationDebounceDelay) {
            console.log('⏳ Navegación debounced, ignorando...');
            return;
        }
        
        this._lastNavigationTime = now;
        this.navigate(path, addToHistory, isHash);
    }

    // 🆕 NUEVO: Parámetro forceReload agregado
    navigate(path, addToHistory = true, isHash = false, forceReload = false) {
        if (this._navigating && !forceReload) {
            console.log('⏳ Ya navegando, ignorando...');
            return;
        }
        
        this._navigating = true;
        
        try {
            // Normalizar ruta
            path = this.normalizePath(path);
            
            console.log('🧭 Navegando a:', path, isHash ? '(hash)' : '(path)', forceReload ? '[FORZADO]' : '');

            // ✅ Control de acceso: todo excepto las rutas públicas requiere login
            const segments = path.split('/').filter(Boolean);
            const basePath = segments.length > 0 ? '/' + segments[0] : '/';
            const isPublic = this.publicRoutes.includes(path) || this.publicRoutes.includes(basePath);

            if (!isPublic && !this.isLoggedIn()) {
                console.log('🔒 Ruta protegida sin sesión, redirigiendo a Home:', path);
                this._navigating = false;
                if (this.app.showNotification) {
                    this.app.showNotification('🔒 Necesitás iniciar sesión para acceder a esa sección', 'warning');
                }
                this.debouncedNavigate('/home', true, isHash);
                return;
            }
            
            const normalizedCurrent = this.normalizePath(this.currentPath);
            const normalizedNew = this.normalizePath(path);
            
            if (normalizedCurrent === normalizedNew && !forceReload) {
                console.log('⚠️ Ya estamos en esta ruta, ignorando navegación');
                this._navigating = false;
                return;
            }
            
            const isReload = forceReload || (normalizedCurrent === normalizedNew);
            
            // 🆕 CORRECCIÓN: Primero manejar rutas con parámetros
            const profileMatch = path.match(/^\/perfil\/(\d+)$/);
            if (profileMatch) {
                const userId = profileMatch[1];
                console.log(`👤 Navegando a perfil ID: ${userId}`);
                
                if (addToHistory) {
                    if (isHash) {
                        window.location.hash = path;
                    } else {
                        window.history.pushState({}, '', path);
                    }
                }
                
                this.updateActiveNavLink(path, isHash);
                
                if (typeof this.app.showProfile === 'function') {
                    this.app.showProfile(userId, isReload);
                } else {
                    console.error('❌ showProfile no disponible');
                    this.showErrorPage('No se puede cargar el perfil');
                }
                
                this.currentPath = path;
                this._navigating = false;
                return;
            }

            // 🆕 CORRECCIÓN PRINCIPAL: Verificar si la ruta existe
            const routeHandler = this.routes[path];
            
            if (routeHandler && typeof this.app[routeHandler] === 'function') {
                // 🆕 IMPORTANTE: Ocultar contenido home antes de cargar cualquier página
                this.hideHomeContent();
                
                this.currentPath = path;
                
                if (addToHistory) {
                    if (isHash) {
                        window.location.hash = path;
                    } else {
                        window.history.pushState({}, '', path);
                    }
                }
                
                this.updateActiveNavLink(path, isHash);
                
                try {
                    // 🆕 CORRECCIÓN: Para la página de inicio, mostrar contenido home
                    if (path === '/' || path === '/home') {
                        this.showHomeContent();
                    }
                    
                    const result = this.app[routeHandler](isReload);
                    
                    if (result && typeof result.then === 'function') {
                        result.catch(error => {
                            console.error(`❌ Error en handler ${routeHandler}:`, error);
                            this.showErrorPage(`Error al cargar la página: ${error.message}`);
                        });
                    }
                    
                    console.log(`✅ Navegación exitosa: ${path}`, isReload ? '[RECARGADO]' : '');
                } catch (error) {
                    console.error(`❌ Error ejecutando ${routeHandler}:`, error);
                    this.showErrorPage(`Error al cargar: ${error.message}`);
                }
                
                this.scrollToTop();
                
            } else {
                console.error(`❌ Ruta no encontrada: ${path}`);
                
                // 🆕 CORRECCIÓN: Siempre redirigir a home si la ruta no existe
                console.log('🏠 Ruta no encontrada, redirigiendo a inicio');
                setTimeout(() => {
                    this.debouncedNavigate('/home', true, isHash);
                }, 0);
            }
        } catch (error) {
            console.error('❌ Error crítico en navigate:', error);
            this.showErrorPage(`Error de navegación: ${error.message}`);
        } finally {
            setTimeout(() => {
                this._navigating = false;
            }, 100);
        }
    }

    isLoggedIn() {
        return !!localStorage.getItem('pesca_token');
    }

    normalizePath(path) {
        if (!path) return '/';
        
        if (path.startsWith('#')) {
            path = path.substring(1);
        }
        
        if (path.startsWith('#/')) {
            path = path.substring(2);
        }
        
        path = path.replace(/\/$/, '');
        if (path === '') return '/';
        
        return path;
    }

    updateActiveNavLink(path, isHash = false) {
        try {
            document.querySelectorAll('.navbar-nav .nav-link, .navbar-brand').forEach(link => {
                link.classList.remove('active');
                link.setAttribute('aria-current', 'false');
            });

            let activeLink = null;
            
            if (path === '/' || path === '/home') {
                if (isHash) {
                    activeLink = document.querySelector('a[href="#/"], a[href="#/home"], .navbar-brand');
                } else {
                    activeLink = document.querySelector('a[href="/"], a[href="/home"], .navbar-brand');
                }
            } else if (path.startsWith('/perfil')) {
                activeLink = document.querySelector(`a[href="${isHash ? '#' : ''}/perfil"]`);
            } else {
                activeLink = document.querySelector(`a[href="${isHash ? '#' : ''}${path}"]`);
            }

            if (activeLink) {
                activeLink.classList.add('active');
                activeLink.setAttribute('aria-current', 'page');
                console.log('🎯 Enlace activo:', activeLink.getAttribute('href'));
            }
        } catch (error) {
            console.error('❌ Error actualizando nav:', error);
        }
    }

    // 🆕 NUEVO MÉTODO: Mostrar contenido de inicio
    showHomeContent() {
        const homeContent = document.getElementById('home-content');
        const appContainer = document.getElementById('app');
        
        if (homeContent) {
            homeContent.style.display = 'block';
        }
        
        if (appContainer) {
            appContainer.innerHTML = ''; // Limpiar contenido dinámico
        }
        
        // Asegurarse de que el contenedor de amigos esté oculto
        const friendsContainer = document.getElementById('friends-page-container');
        if (friendsContainer) {
            friendsContainer.style.display = 'none';
        }
        
        console.log('🏠 Contenido de inicio mostrado');
    }

    // 🆕 NUEVO MÉTODO: Ocultar contenido de inicio
    hideHomeContent() {
        const homeContent = document.getElementById('home-content');
        if (homeContent) {
            homeContent.style.display = 'none';
        }
        
        console.log('🏠 Contenido de inicio ocultado');
    }

    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    goTo(route) {
        this.debouncedNavigate(route);
    }

    getCurrentRoute() {
        return this.currentPath;
    }

    routeExists(route) {
        const normalized = this.normalizePath(route);
        return !!this.routes[normalized];
    }

    addRoute(path, handler) {
        const normalizedPath = this.normalizePath(path);
        this.routes[normalizedPath] = handler;
        console.log('➕ Ruta agregada:', normalizedPath);
    }

    showErrorPage(message) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="container mt-5">
                    <div class="row justify-content-center">
                        <div class="col-md-6">
                            <div class="card border-danger">
                                <div class="card-body text-center">
                                    <h3 class="text-danger">😕 Error</h3>
                                    <p>${message}</p>
                                    <div class="d-flex justify-content-center gap-3">
                                        <button class="btn btn-primary" onclick="window.router.goTo('/home')">
                                            <i class="fas fa-home me-1"></i> Volver al inicio
                                        </button>
                                        <button class="btn btn-outline-secondary" onclick="location.reload()">
                                            <i class="fas fa-redo me-1"></i> Recargar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// ==================================================
// ✅ INICIALIZACIÓN CON MEJOR MANEJO DE ERRORES
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 DOM cargado, verificando si hay app...');
    
    if (window.app && !window.router) {
        console.log('✅ Inicializando Router con app existente');
        try {
            window.router = new Router(window.app);
        } catch (error) {
            console.error('❌ Error inicializando router:', error);
            
            const appElement = document.getElementById('app');
            if (appElement) {
                appElement.innerHTML = `
                    <div class="container mt-5">
                        <div class="alert alert-warning">
                            <h4>⚠️ Error de inicialización</h4>
                            <p>El portal se está cargando. Por favor, intenta recargar la página.</p>
                            <button onclick="location.reload()" class="btn btn-sm btn-outline-warning">
                                Recargar página
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    }
});

export default Router;