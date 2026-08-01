// ============================================
// CRONÓMETRO FÚTBOL - CON GOOGLE SHEETS
// ============================================

// ⚠️ CAMBIA ESTA URL POR LA QUE TE DÉ GOOGLE APPS SCRIPT
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/TU_URL_AQUI/exec';

class CronometroFutbol {
    constructor() {
        // Elementos HTML
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tiempoDisplay = document.getElementById('tiempo');
        this.estadoDisplay = document.getElementById('estado');
        this.jugadorActualDisplay = document.getElementById('jugadorActual');
        this.velocidadDisplay = document.getElementById('velocidadDisplay');
        this.historialJugador = document.getElementById('historialJugador');
        this.estadoConexion = document.getElementById('estadoConexion');
        
        // Selectores
        this.categoriaSelect = document.getElementById('categoriaSelect');
        this.jugadorSelect = document.getElementById('jugadorSelect');
        this.distanciaCancha = document.getElementById('distanciaCancha');
        
        // Estado del cronómetro
        this.estado = 'ESPERANDO';
        this.tiempoInicio = null;
        this.tiempoActual = 0;
        
        // Configuración detección
        this.sensibilidad = 8;
        this.lineaY = 0.5;
        this.modoConfiguracion = false;
        
        // Variables de detección
        this.fondo = null;
        this.ultimoEstado = false;
        this.frameId = null;
        
        // Datos
        this.jugadores = [];
        this.jugadorSeleccionado = null;
        this.tiemposGuardados = [];
        
        // Inicializar
        this.cargarJugadores();
        this.inicializarCamara();
        this.configurarEventos();
        this.verificarConexionGoogleSheets();
    }
    
    // ============ GOOGLE SHEETS ============
    
    async verificarConexionGoogleSheets() {
        try {
            const response = await fetch(GOOGLE_SHEETS_URL);
            if (response.ok) {
                this.estadoConexion.textContent = '✅ Conectado a Google Sheets';
                this.estadoConexion.style.background = 'rgba(0,255,0,0.1)';
                this.estadoConexion.style.color = '#00ff88';
            } else {
                throw new Error('Error de conexión');
            }
        } catch (error) {
            this.estadoConexion.textContent = '⚠️ Sin conexión (guardado local)';
            this.estadoConexion.style.background = 'rgba(255,255,0,0.1)';
            this.estadoConexion.style.color = '#ffaa00';
        }
    }
    
    async guardarEnGoogleSheets(datos) {
        try {
            const distancia = parseFloat(this.distanciaCancha.value) || 50;
            const tiempoSegundos = datos.tiempoMs / 1000;
            const velocidadMs = tiempoSegundos > 0 ? distancia / tiempoSegundos : 0;
            const velocidadKmh = velocidadMs * 3.6;
            
            const payload = {
                fecha: datos.fecha || new Date().toLocaleString(),
                categoria: datos.categoria || this.categoriaSelect.value || 'Sin categoría',
                jugador: datos.jugador || this.jugadorSeleccionado?.nombre || 'Sin nombre',
                tiempo: datos.tiempo || '00:00.0',
                velocidad_ms: Math.round(velocidadMs * 100) / 100,
                velocidad_kmh: Math.round(velocidadKmh * 100) / 100
            };
            
            // Mostrar velocidad
            this.velocidadDisplay.textContent = `🏃 ${payload.velocidad_kmh} km/h (${payload.velocidad_ms} m/s)`;
            
            // Intentar guardar en Google Sheets
            try {
                await fetch(GOOGLE_SHEETS_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });
                
                this.estadoConexion.textContent = '✅ Guardado en Google Sheets';
                this.estadoConexion.style.background = 'rgba(0,255,0,0.1)';
                this.estadoConexion.style.color = '#00ff88';
                
            } catch (error) {
                console.warn('Guardando localmente:', error);
                this.guardarLocalmente(payload);
                this.estadoConexion.textContent = '⚠️ Guardado localmente';
                this.estadoConexion.style.background = 'rgba(255,255,0,0.1)';
                this.estadoConexion.style.color = '#ffaa00';
            }
            
            // Guardar en historial local
            this.tiemposGuardados.push(payload);
            this.mostrarHistorialLocal();
            
            return payload;
            
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }
    
    guardarLocalmente(payload) {
        const tiemposLocales = JSON.parse(localStorage.getItem('tiempos_locales') || '[]');
        tiemposLocales.push(payload);
        localStorage.setItem('tiempos_locales', JSON.stringify(tiemposLocales));
    }
    
    mostrarHistorialLocal() {
        if (this.tiemposGuardados.length === 0) {
            this.historialJugador.innerHTML = '<p class="sin-datos">No hay tiempos registrados</p>';
            return;
        }
        
        let html = '';
        this.tiemposGuardados.slice().reverse().slice(0, 10).forEach(t => {
            html += `
                <div class="tiempo-item">
                    <span class="fecha">${t.fecha}</span>
                    <span class="jugador-nombre">${t.jugador}</span>
                    <span class="tiempo">${t.tiempo}</span>
                    <span class="velocidad-tag">${t.velocidad_kmh} km/h</span>
                </div>
            `;
        });
        
        this.historialJugador.innerHTML = html;
    }
    
    // ============ JUGADORES ============
    
    cargarJugadores() {
        try {
            const data = localStorage.getItem('jugadores');
            if (data) {
                this.jugadores = JSON.parse(data);
            } else {
                this.jugadores = [
                    { id: 1, nombre: 'Juan Pérez', categoria: 'Lunes_Miercoles_6_8' },
                    { id: 2, nombre: 'Carlos Gómez', categoria: 'Lunes_Miercoles_6_8' },
                    { id: 3, nombre: 'Luis Martínez', categoria: 'Martes_Jueves_11_13' },
                    { id: 4, nombre: 'Miguel Sánchez', categoria: 'Martes_Jueves_11_13' }
                ];
                this.guardarJugadores();
            }
        } catch (e) {
            console.error('Error:', e);
        }
        this.actualizarSelectores();
    }
    
    guardarJugadores() {
        localStorage.setItem('jugadores', JSON.stringify(this.jugadores));
    }
    
    actualizarSelectores() {
        const categoria = this.categoriaSelect.value;
        this.jugadorSelect.innerHTML = '<option value="">Seleccionar...</option>';
        
        const filtrados = this.jugadores.filter(j => j.categoria === categoria);
        filtrados.forEach(j => {
            const option = document.createElement('option');
            option.value = j.id;
            option.textContent = j.nombre;
            this.jugadorSelect.appendChild(option);
        });
        
        if (filtrados.length > 0) {
            this.jugadorSelect.value = filtrados[0].id;
            this.seleccionarJugador(filtrados[0].id);
        }
    }
    
    seleccionarJugador(id) {
        this.jugadorSeleccionado = this.jugadores.find(j => j.id === parseInt(id));
        if (this.jugadorSeleccionado) {
            this.jugadorActualDisplay.textContent = `👤 ${this.jugadorSeleccionado.nombre}`;
        }
    }
    
    // ============ CÁMARA ============
    
    async inicializarCamara() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });
            this.video.srcObject = stream;
            await this.video.play();
            
            this.canvas.width = this.video.videoWidth || 640;
            this.canvas.height = this.video.videoHeight || 480;
            
            this.iniciarDeteccion();
            
        } catch (error) {
            alert('❌ Permite el acceso a la cámara');
            console.error(error);
        }
    }
    
    // ============ DETECCIÓN ============
    
    iniciarDeteccion() {
        const procesar = () => {
            if (!this.video.videoWidth) {
                this.frameId = requestAnimationFrame(procesar);
                return;
            }
            
            this.detectarCruce();
            this.dibujarFrame();
            this.frameId = requestAnimationFrame(procesar);
        };
        
        procesar();
    }
    
    detectarCruce() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.video.videoWidth;
        tempCanvas.height = this.video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(this.video, 0, 0);
        
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        const gray = new Uint8Array(data.length / 4);
        for (let i = 0; i < data.length; i += 4) {
            gray[i/4] = (data[i] + data[i+1] + data[i+2]) / 3;
        }
        
        if (!this.fondo) {
            this.fondo = new Uint8Array(gray);
            return;
        }
        
        const y = Math.floor(this.lineaY * tempCanvas.height);
        const ancho = tempCanvas.width;
        let pixelesBlancos = 0;
        
        for (let x = 0; x < ancho; x++) {
            const idx = y * ancho + x;
            const diff = Math.abs(gray[idx] - this.fondo[idx]);
            if (diff > 25) {
                pixelesBlancos++;
            }
        }
        
        for (let i = 0; i < gray.length; i++) {
            this.fondo[i] = this.fondo[i] * 0.95 + gray[i] * 0.05;
        }
        
        const umbral = 50 + this.sensibilidad * 5;
        const hayPersona = pixelesBlancos > umbral;
        
        if (hayPersona && !this.ultimoEstado) {
            this.ultimoEstado = true;
            
            if (this.estado === 'ESPERANDO') {
                this.iniciarCronometro();
            } else if (this.estado === 'CRONOMETRANDO') {
                this.detenerCronometro();
            }
        }
        
        if (!hayPersona && this.ultimoEstado) {
            this.ultimoEstado = false;
        }
        
        if (this.estado === 'CRONOMETRANDO' && this.tiempoInicio) {
            this.tiempoActual = Date.now() - this.tiempoInicio;
            this.tiempoDisplay.textContent = this.formatearTiempo(this.tiempoActual);
        }
    }
    
    dibujarFrame() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const y = this.lineaY * this.canvas.height;
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.estado === 'CRONOMETRANDO' ? '#00ff00' : '#ff0000';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 5]);
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.canvas.width, y);
        this.ctx.stroke();
        
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('🏁 META', 10, y - 10);
        
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.fillRect(10, this.canvas.height - 40, 180, 30);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        const texto = this.estado === 'CRONOMETRANDO' ? '⏱️ CRONOMETRANDO' : '⏸️ ESPERANDO';
        this.ctx.fillText(texto, 15, this.canvas.height - 18);
    }
    
    // ============ CRONÓMETRO ============
    
    iniciarCronometro() {
        if (!this.jugadorSeleccionado) {
            alert('⚠️ Selecciona un jugador primero');
            return;
        }
        
        if (this.estado === 'ESPERANDO') {
            this.tiempoInicio = Date.now();
            this.estado = 'CRONOMETRANDO';
            this.estadoDisplay.textContent = '⏱️ CRONOMETRANDO';
            this.estadoDisplay.style.background = 'rgba(0,255,0,0.2)';
            console.log('⏱️ INICIADO');
        }
    }
    
    async detenerCronometro() {
        if (this.estado === 'CRONOMETRANDO') {
            this.tiempoActual = Date.now() - this.tiempoInicio;
            this.estado = 'ESPERANDO';
            
            const tiempoStr = this.formatearTiempo(this.tiempoActual);
            
            const datos = {
                fecha: new Date().toLocaleString(),
                categoria: this.categoriaSelect.value || 'Sin categoría',
                jugador: this.jugadorSeleccionado.nombre,
                tiempo: tiempoStr,
                tiempoMs: this.tiempoActual
            };
            
            this.estadoDisplay.textContent = `⏳ Guardando...`;
            this.estadoDisplay.style.background = 'rgba(255,255,0,0.2)';
            
            const resultado = await this.guardarEnGoogleSheets(datos);
            
            if (resultado) {
                this.estadoDisplay.textContent = `✅ ${tiempoStr} - ${resultado.velocidad_kmh} km/h`;
                this.estadoDisplay.style.background = 'rgba(0,255,0,0.2)';
                this.tiempoDisplay.textContent = tiempoStr;
                this.tiempoDisplay.style.color = '#00ff88';
                console.log(`🏁 GUARDADO: ${tiempoStr} - ${resultado.velocidad_kmh} km/h`);
            } else {
                this.estadoDisplay.textContent = `⚠️ Error al guardar`;
                this.estadoDisplay.style.background = 'rgba(255,0,0,0.2)';
            }
            
            setTimeout(() => {
                this.tiempoActual = 0;
                this.tiempoInicio = null;
                this.tiempoDisplay.textContent = '00:00.0';
                this.tiempoDisplay.style.color = '#00ff88';
                this.estadoDisplay.textContent = '⏸️ ESPERANDO';
                this.estadoDisplay.style.background = 'rgba(0,0,0,0.3)';
                this.velocidadDisplay.textContent = '';
            }, 3000);
        }
    }
    
    formatearTiempo(ms) {
        const seg = ms / 1000;
        const min = Math.floor(seg / 60);
        const sec = (seg % 60).toFixed(1);
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(4, '0')}`;
    }
    
    // ============ EVENTOS ============
    
    configurarEventos() {
        this.categoriaSelect.addEventListener('change', () => {
            this.actualizarSelectores();
        });
        
        this.jugadorSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.seleccionarJugador(e.target.value);
            }
        });
        
        document.getElementById('btnIniciar').addEventListener('click', () => {
            if (this.estado === 'ESPERANDO') {
                this.iniciarCronometro();
            } else if (this.estado === 'CRONOMETRANDO') {
                this.detenerCronometro();
            }
        });
        
        document.getElementById('btnReiniciar').addEventListener('click', () => {
            this.estado = 'ESPERANDO';
            this.tiempoActual = 0;
            this.tiempoInicio = null;
            this.fondo = null;
            this.ultimoEstado = false;
            this.tiempoDisplay.textContent = '00:00.0';
            this.estadoDisplay.textContent = '⏸️ ESPERANDO';
            this.estadoDisplay.style.background = 'rgba(0,0,0,0.3)';
            this.velocidadDisplay.textContent = '';
            console.log('🔄 REINICIADO');
        });
        
        document.getElementById('btnGuardar').addEventListener('click', async () => {
            if (this.tiempoActual > 0 && this.jugadorSeleccionado) {
                const tiempoStr = this.formatearTiempo(this.tiempoActual);
                const datos = {
                    fecha: new Date().toLocaleString(),
                    categoria: this.categoriaSelect.value || 'Sin categoría',
                    jugador: this.jugadorSeleccionado.nombre,
                    tiempo: tiempoStr,
                    tiempoMs: this.tiempoActual
                };
                
                const resultado = await this.guardarEnGoogleSheets(datos);
                if (resultado) {
                    alert(`✅ Guardado: ${tiempoStr} - ${resultado.velocidad_kmh} km/h`);
                }
            } else {
                alert('⚠️ No hay tiempo para guardar');
            }
        });
        
        document.getElementById('btnActualizar').addEventListener('click', () => {
            this.mostrarHistorialLocal();
        });
        
        document.getElementById('sensibilidad').addEventListener('input', (e) => {
            this.sensibilidad = parseInt(e.target.value);
            document.getElementById('valorSensibilidad').textContent = this.sensibilidad;
        });
        
        document.getElementById('btnPosicionarLinea').addEventListener('click', () => {
            this.modoConfiguracion = !this.modoConfiguracion;
            if (this.modoConfiguracion) {
                document.getElementById('btnPosicionarLinea').textContent = '📍 Toca para posicionar';
                alert('📏 Toca en la pantalla para posicionar la línea de meta');
            } else {
                document.getElementById('btnPosicionarLinea').textContent = '📏 Posicionar línea';
            }
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (this.modoConfiguracion) {
                const rect = this.canvas.getBoundingClientRect();
                const y = (e.clientY - rect.top) / rect.height;
                this.lineaY = Math.max(0.05, Math.min(0.95, y));
                document.getElementById('infoLinea').textContent = `Línea en ${Math.round(this.lineaY * 100)}%`;
                this.modoConfiguracion = false;
                document.getElementById('btnPosicionarLinea').textContent = '📏 Posicionar línea';
                console.log(`📍 Línea: ${this.lineaY * 100}%`);
            }
        });
        
        // Modal nuevo jugador
        document.getElementById('btnNuevoJugador').addEventListener('click', () => {
            document.getElementById('modalNuevoJugador').style.display = 'block';
        });
        
        document.querySelector('.cerrar-modal').addEventListener('click', () => {
            document.getElementById('modalNuevoJugador').style.display = 'none';
        });
        
        document.getElementById('btnGuardarJugador').addEventListener('click', () => {
            const nombre = document.getElementById('nombreNuevoJugador').value.trim();
            const categoria = this.categoriaSelect.value;
            
            if (!nombre) {
                alert('Ingresa un nombre');
                return;
            }
            if (!categoria) {
                alert('Selecciona una categoría');
                return;
            }
            
            const nuevoJugador = {
                id: this.jugadores.length > 0 ? Math.max(...this.jugadores.map(j => j.id)) + 1 : 1,
                nombre: nombre,
                categoria: categoria
            };
            
            this.jugadores.push(nuevoJugador);
            this.guardarJugadores();
            this.actualizarSelectores();
            
            this.jugadorSelect.value = nuevoJugador.id;
            this.seleccionarJugador(nuevoJugador.id);
            
            document.getElementById('modalNuevoJugador').style.display = 'none';
            document.getElementById('nombreNuevoJugador').value = '';
            
            alert(`✅ Jugador ${nombre} agregado`);
        });
        
        document.getElementById('modalNuevoJugador').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalNuevoJugador')) {
                document.getElementById('modalNuevoJugador').style.display = 'none';
            }
        });
    }
}

// ============ INICIAR ============

document.addEventListener('DOMContentLoaded', () => {
    const app = new CronometroFutbol();
    window.app = app;
});