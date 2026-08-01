// ============================================
// CRONÓMETRO FÚTBOL - VERSIÓN FINAL (PDF FUNCIONAL)
// ============================================

const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/TU_URL_AQUI/exec';

class CronometroFutbol {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tiempoDisplay = document.getElementById('tiempo');
        this.estadoDisplay = document.getElementById('estado');
        this.jugadorActualDisplay = document.getElementById('jugadorActual');
        this.velocidadDisplay = document.getElementById('velocidadDisplay');
        this.historialJugador = document.getElementById('historialJugador');
        this.estadoConexion = document.getElementById('estadoConexion');
        
        this.jugadorSelect = document.getElementById('jugadorSelect');
        this.distanciaCancha = document.getElementById('distanciaCancha');
        this.edadJugador = document.getElementById('edadJugador');
        this.categoriaManual = document.getElementById('categoriaManual');
        
        this.estado = 'ESPERANDO';
        this.tiempoInicio = null;
        this.tiempoActual = 0;
        this.sensibilidad = 8;
        this.lineaY = 0.5;
        this.modoConfiguracion = false;
        this.fondo = null;
        this.ultimoEstado = false;
        this.frameId = null;
        this.camaraPausada = false;
        this.jugadores = [];
        this.jugadorSeleccionado = null;
        this.tiemposGuardados = [];
        
        this.cargarJugadores();
        this.limpiarCampos();
        this.inicializarCamara();
        this.configurarEventos();
        this.verificarConexionGoogleSheets();
    }
    
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
                edad: datos.edad || this.jugadorSeleccionado?.edad || 'N/A',
                categoria: datos.categoria || this.jugadorSeleccionado?.categoria || 'Sin categoría',
                jugador: datos.jugador || this.jugadorSeleccionado?.nombre || 'Sin nombre',
                tiempo: datos.tiempo || '00:00.0',
                distancia: distancia,
                velocidad_ms: Math.round(velocidadMs * 100) / 100,
                velocidad_kmh: Math.round(velocidadKmh * 100) / 100
            };
            
            this.velocidadDisplay.textContent = `🏃 ${payload.velocidad_kmh} km/h (${payload.velocidad_ms} m/s)`;
            
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
    
    evaluarRendimiento(tiempo, edad, distancia) {
        const partes = tiempo.split(':');
        const segundos = parseFloat(partes[0]) * 60 + parseFloat(partes[1]);
        const velocidad = segundos > 0 ? distancia / segundos : 0;
        const edadNum = parseInt(edad);
        
        if (isNaN(edadNum) || edadNum < 4) {
            if (velocidad >= 6.0) return { nivel: 'Excelente', clase: 'badge-excelente', emoji: '🏆', velocidad: Math.round(velocidad * 100) / 100 };
            if (velocidad >= 5.0) return { nivel: 'Bueno', clase: 'badge-bueno', emoji: '👍', velocidad: Math.round(velocidad * 100) / 100 };
            if (velocidad >= 4.0) return { nivel: 'Regular', clase: 'badge-regular', emoji: '📊', velocidad: Math.round(velocidad * 100) / 100 };
            return { nivel: 'Mejorar', clase: 'badge-mejorar', emoji: '💪', velocidad: Math.round(velocidad * 100) / 100 };
        }
        
        let excelente, bueno, regular;
        if (edadNum >= 6 && edadNum <= 8) { excelente = 4.0; bueno = 3.5; regular = 3.0; }
        else if (edadNum >= 9 && edadNum <= 11) { excelente = 5.0; bueno = 4.5; regular = 4.0; }
        else if (edadNum >= 12 && edadNum <= 14) { excelente = 6.0; bueno = 5.5; regular = 5.0; }
        else if (edadNum >= 15 && edadNum <= 17) { excelente = 7.0; bueno = 6.5; regular = 6.0; }
        else if (edadNum >= 18 && edadNum <= 25) { excelente = 7.5; bueno = 7.0; regular = 6.5; }
        else if (edadNum >= 26 && edadNum <= 35) { excelente = 7.0; bueno = 6.5; regular = 6.0; }
        else if (edadNum >= 36) { excelente = 6.0; bueno = 5.5; regular = 5.0; }
        else { return this.evaluarRendimiento(tiempo, 'N/A', distancia); }
        
        let nivel, clase, emoji;
        if (velocidad >= excelente) { nivel = 'Excelente'; clase = 'badge-excelente'; emoji = '🏆'; }
        else if (velocidad >= bueno) { nivel = 'Bueno'; clase = 'badge-bueno'; emoji = '👍'; }
        else if (velocidad >= regular) { nivel = 'Regular'; clase = 'badge-regular'; emoji = '📊'; }
        else { nivel = 'Mejorar'; clase = 'badge-mejorar'; emoji = '💪'; }
        
        return { nivel, clase, emoji, velocidad: Math.round(velocidad * 100) / 100 };
    }
    
    mostrarHistorialLocal() {
        if (this.tiemposGuardados.length === 0) {
            this.historialJugador.innerHTML = '<p class="sin-datos">No hay tiempos registrados</p>';
            return;
        }
        const distancia = parseFloat(this.distanciaCancha.value) || 50;
        let html = '';
        this.tiemposGuardados.slice().reverse().slice(0, 10).forEach(t => {
            const rendimiento = this.evaluarRendimiento(t.tiempo, t.edad, distancia);
            html += `
                <div class="tiempo-item">
                    <span class="fecha">${t.fecha}</span>
                    <span class="jugador-nombre">${t.jugador}</span>
                    <span class="edad-categoria">${t.edad} años · ${t.categoria}</span>
                    <span class="tiempo">${t.tiempo}</span>
                    <span class="velocidad-tag">${t.velocidad_kmh} km/h</span>
                    <span class="${rendimiento.clase}">${rendimiento.emoji} ${rendimiento.nivel}</span>
                </div>
            `;
        });
        this.historialJugador.innerHTML = html;
    }
    
    // ============ EXPORTAR PDF (CON VISTA PREVIA + PDF FUNCIONAL) ============

async exportarPDF() {
    if (this.tiemposGuardados.length === 0) {
        alert('⚠️ No hay tiempos para exportar');
        return;
    }

    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        alert('❌ Error: Las librerías para PDF no están cargadas.\nVerifica tu conexión a internet.');
        return;
    }

    const distancia = parseFloat(this.distanciaCancha.value) || 50;

    // ===== 1. GENERAR EL CONTENIDO HTML =====
    let htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; background: white; color: #333;">
        <h1 style="color: #00ff88; text-align: center; font-size: 28px;">⚽ DEPORTETECH</h1>
        <p style="text-align:center;color:#666;font-size:14px;">Reporte de Rendimiento</p>
        <p style="text-align:center;color:#666;font-size:12px;">Fecha: ${new Date().toLocaleString()}</p>
        <p style="text-align:center;color:#666;font-size:12px;">Distancia: ${distancia} metros</p>
        <p style="text-align:center;color:#666;font-size:12px;">Total de registros: ${this.tiemposGuardados.length}</p>
        
        <h2 style="color: #333; border-bottom: 2px solid #00ff88; padding-bottom: 10px; margin-top: 30px; font-size: 18px;">📊 TABLA DE TIEMPOS</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
            <thead>
                <tr>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">#</th>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">Fecha</th>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">Jugador</th>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">Edad</th>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">Categoría</th>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">Tiempo</th>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">Velocidad</th>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">Rendimiento</th>
                </tr>
            </thead>
            <tbody>
    `;

    this.tiemposGuardados.forEach((t, index) => {
        const rendimiento = this.evaluarRendimiento(t.tiempo, t.edad, distancia);
        const badgeColor = rendimiento.nivel === 'Excelente' ? '#00ff88' :
                          rendimiento.nivel === 'Bueno' ? '#00ccff' :
                          rendimiento.nivel === 'Regular' ? '#ffaa00' : '#ff3344';
        const textColor = rendimiento.nivel === 'Mejorar' ? 'white' : '#0a0a1a';
        htmlContent += `
            <tr>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center;">${index + 1}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd;">${t.fecha}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd;"><strong>${t.jugador}</strong></td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center;">${t.edad}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd;">${t.categoria}</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center;"><strong>${t.tiempo}</strong></td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center;">${t.velocidad_kmh} km/h</td>
                <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center;">
                    <span style="background: ${badgeColor}; color: ${textColor}; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                        ${rendimiento.emoji} ${rendimiento.nivel}
                    </span>
                </td>
            </tr>
        `;
    });

    htmlContent += `
            </tbody>
        </table>
        
        <h2 style="color: #333; border-bottom: 2px solid #00ff88; padding-bottom: 10px; margin-top: 30px; font-size: 18px;">📈 RESUMEN DE RENDIMIENTO</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
            <thead>
                <tr>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">Nivel</th>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">Cantidad</th>
                    <th style="background: #00ff88; color: #0a0a1a; padding: 8px; text-align: left; border: 1px solid #ddd;">Porcentaje</th>
                </tr>
            </thead>
            <tbody>
    `;

    const niveles = { 'Excelente': 0, 'Bueno': 0, 'Regular': 0, 'Mejorar': 0 };
    this.tiemposGuardados.forEach(t => {
        const rend = this.evaluarRendimiento(t.tiempo, t.edad, distancia);
        if (niveles[rend.nivel] !== undefined) niveles[rend.nivel]++;
    });

    const total = this.tiemposGuardados.length;
    Object.keys(niveles).forEach(nivel => {
        const cantidad = niveles[nivel];
        const porcentaje = total > 0 ? Math.round((cantidad / total) * 100) : 0;
        if (cantidad > 0) {
            htmlContent += `
                <tr>
                    <td style="padding: 6px 8px; border-bottom: 1px solid #ddd;"><strong>${nivel}</strong></td>
                    <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center;">${cantidad}</td>
                    <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: center;">${porcentaje}%</td>
                </tr>
            `;
        }
    });

    htmlContent += `
            </tbody>
        </table>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 11px; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>Reporte generado por DeporteTech - Cronómetro de Rendimiento</p>
            <p>${new Date().toLocaleString()}</p>
        </div>
    </div>
    `;

    // ===== 2. CREAR LA VENTANA FLOTANTE (VISTA PREVIA) =====
    const container = document.createElement('div');
    container.id = 'pdfContainer';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: flex-start;
        z-index: 9999;
        padding: 20px;
        overflow-y: auto;
    `;
    
    const contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = `
        background: white;
        border-radius: 10px;
        max-width: 900px;
        max-height: 90vh;
        overflow-y: auto;
        padding: 20px;
        width: 100%;
        position: relative;
        margin-top: 20px;
    `;
    
    // Botón cerrar
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Cerrar';
    closeBtn.style.cssText = `
        position: sticky;
        top: 0;
        float: right;
        background: #ff3344;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
        z-index: 10;
        margin-bottom: 10px;
    `;
    
    // Botón generar PDF (MODIFICADO: usa el método que funciona)
    const pdfBtn = document.createElement('button');
    pdfBtn.textContent = '📄 Generar PDF';
    pdfBtn.style.cssText = `
        position: sticky;
        top: 0;
        float: right;
        background: #00ff88;
        color: #0a0a1a;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
        margin-right: 10px;
        z-index: 10;
    `;
    
    // Contenido
    const contentDiv = document.createElement('div');
    contentDiv.id = 'pdfContent';
    contentDiv.innerHTML = htmlContent;
    
    contentWrapper.appendChild(closeBtn);
    contentWrapper.appendChild(pdfBtn);
    contentWrapper.appendChild(contentDiv);
    container.appendChild(contentWrapper);
    document.body.appendChild(container);
    
    // ===== 3. EVENTO CERRAR =====
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(container);
    });
    
    // ===== 4. EVENTO GENERAR PDF (CON EL MÉTODO QUE SÍ FUNCIONA) =====
    pdfBtn.addEventListener('click', async () => {
        try {
            pdfBtn.textContent = '⏳ Generando...';
            pdfBtn.disabled = true;
            pdfBtn.style.opacity = '0.6';
            
            // CLONAR EL CONTENIDO PARA EL PDF (sin los botones ni el modal)
            const pdfContent = document.createElement('div');
            pdfContent.innerHTML = htmlContent;
            pdfContent.style.cssText = `
                position: absolute;
                left: -9999px;
                top: 0;
                width: 800px;
                background: white;
                padding: 20px;
                z-index: -1;
            `;
            document.body.appendChild(pdfContent);
            
            // Generar PDF con html2canvas + jspdf
            const canvas = await html2canvas(pdfContent, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                width: pdfContent.scrollWidth,
                height: pdfContent.scrollHeight,
                windowWidth: pdfContent.scrollWidth,
                windowHeight: pdfContent.scrollHeight,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`DeporteTech_Reporte_${new Date().toISOString().slice(0,10)}.pdf`);

            // Limpiar
            document.body.removeChild(pdfContent);
            
            pdfBtn.textContent = '✅ PDF Generado';
            pdfBtn.style.background = '#00cc66';
            
            // Cerrar modal después de 2 segundos
            setTimeout(() => {
                if (document.body.contains(container)) {
                    document.body.removeChild(container);
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error al generar PDF:', error);
            pdfBtn.textContent = '❌ Error';
            pdfBtn.style.background = '#ff3344';
            pdfBtn.disabled = false;
            pdfBtn.style.opacity = '1';
            alert('Error al generar PDF: ' + error.message);
        }
    });
    
    // ===== 5. CERRAR CON ESC =====
    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') {
            if (document.body.contains(container)) {
                document.body.removeChild(container);
                document.removeEventListener('keydown', handler);
            }
        }
    });
}
    
    // ============ JUGADORES ============
    
    cargarJugadores() {
        try {
            const data = localStorage.getItem('jugadores');
            this.jugadores = data ? JSON.parse(data) : [];
        } catch (e) {
            this.jugadores = [];
        }
        this.actualizarSelectores();
    }
    
    guardarJugadores() {
        localStorage.setItem('jugadores', JSON.stringify(this.jugadores));
    }
    
    actualizarSelectores() {
        this.jugadorSelect.innerHTML = '<option value="">Seleccionar jugador...</option>';
        this.jugadores.forEach(j => {
            const option = document.createElement('option');
            option.value = j.id;
            const edadMostrar = j.edad && j.edad !== 'N/A' ? ` ${j.edad} años` : '';
            const catMostrar = j.categoria && j.categoria !== 'Sin categoría' ? ` · ${j.categoria}` : '';
            option.textContent = `${j.nombre}${edadMostrar}${catMostrar}`;
            this.jugadorSelect.appendChild(option);
        });
        if (this.jugadores.length === 0) {
            this.jugadorSeleccionado = null;
            this.jugadorActualDisplay.textContent = 'Sin jugador seleccionado';
            this.limpiarCampos();
        } else {
            this.jugadorSelect.value = this.jugadores[0].id;
            this.seleccionarJugador(this.jugadores[0].id);
        }
    }
    
    seleccionarJugador(id) {
        this.jugadorSeleccionado = this.jugadores.find(j => j.id === parseInt(id));
        if (this.jugadorSeleccionado) {
            this.jugadorActualDisplay.textContent = `👤 ${this.jugadorSeleccionado.nombre}`;
            this.edadJugador.value = this.jugadorSeleccionado.edad || '';
            this.categoriaManual.value = this.jugadorSeleccionado.categoria || '';
        }
    }
    
    limpiarCampos() {
        this.edadJugador.value = '';
        this.categoriaManual.value = '';
        this.jugadorActualDisplay.textContent = 'Sin jugador seleccionado';
    }
    
    // ============ CÁMARA ============
    
    async inicializarCamara() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
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
    
    pausarCamara() {
        this.camaraPausada = !this.camaraPausada;
        const btn = document.getElementById('btnPausarCamara');
        if (this.camaraPausada) {
            btn.textContent = '▶️ Reanudar Cámara';
            btn.classList.add('pausado');
            this.estadoDisplay.textContent = '⏸️ CÁMARA PAUSADA';
            this.estadoDisplay.style.background = 'rgba(255,165,0,0.3)';
        } else {
            btn.textContent = '📷 Pausar Cámara';
            btn.classList.remove('pausado');
            this.estadoDisplay.textContent = '⏸️ ESPERANDO';
            this.estadoDisplay.style.background = 'rgba(0,0,0,0.3)';
            this.fondo = null;
            this.ultimoEstado = false;
        }
    }
    
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
        if (this.camaraPausada) return;
        
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
            if (diff > 25) pixelesBlancos++;
        }
        
        for (let i = 0; i < gray.length; i++) {
            this.fondo[i] = this.fondo[i] * 0.95 + gray[i] * 0.05;
        }
        
        const umbral = 50 + this.sensibilidad * 5;
        const hayPersona = pixelesBlancos > umbral;
        
        if (hayPersona && !this.ultimoEstado) {
            this.ultimoEstado = true;
            if (this.estado === 'ESPERANDO') this.iniciarCronometro();
            else if (this.estado === 'CRONOMETRANDO') this.detenerCronometro();
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
        }
    }
    
    async detenerCronometro() {
        if (this.estado === 'CRONOMETRANDO') {
            this.tiempoActual = Date.now() - this.tiempoInicio;
            this.estado = 'ESPERANDO';
            const tiempoStr = this.formatearTiempo(this.tiempoActual);
            const datos = {
                fecha: new Date().toLocaleString(),
                edad: this.jugadorSeleccionado?.edad || 'N/A',
                categoria: this.jugadorSeleccionado?.categoria || 'Sin categoría',
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
            } else {
                this.estadoDisplay.textContent = `⚠️ Error al guardar`;
                this.estadoDisplay.style.background = 'rgba(255,0,0,0.2)';
            }
            setTimeout(() => {
                this.tiempoActual = 0;
                this.tiempoInicio = null;
                this.tiempoDisplay.textContent = '00:00.0';
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
        this.jugadorSelect.addEventListener('change', (e) => {
            if (e.target.value) this.seleccionarJugador(e.target.value);
            else { this.jugadorSeleccionado = null; this.jugadorActualDisplay.textContent = 'Sin jugador seleccionado'; this.limpiarCampos(); }
        });
        
        document.getElementById('btnIniciar').addEventListener('click', () => {
            if (this.estado === 'ESPERANDO') this.iniciarCronometro();
            else if (this.estado === 'CRONOMETRANDO') this.detenerCronometro();
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
        });
        
        document.getElementById('btnGuardar').addEventListener('click', async () => {
            if (this.tiempoActual > 0 && this.jugadorSeleccionado) {
                const tiempoStr = this.formatearTiempo(this.tiempoActual);
                const datos = {
                    fecha: new Date().toLocaleString(),
                    edad: this.jugadorSeleccionado?.edad || 'N/A',
                    categoria: this.jugadorSeleccionado?.categoria || 'Sin categoría',
                    jugador: this.jugadorSeleccionado.nombre,
                    tiempo: tiempoStr,
                    tiempoMs: this.tiempoActual
                };
                const resultado = await this.guardarEnGoogleSheets(datos);
                if (resultado) alert(`✅ Guardado: ${tiempoStr} - ${resultado.velocidad_kmh} km/h`);
            } else alert('⚠️ No hay tiempo para guardar');
        });
        
        document.getElementById('btnActualizar').addEventListener('click', () => this.mostrarHistorialLocal());
        
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
            }
        });
        
        document.getElementById('btnPausarCamara').addEventListener('click', () => this.pausarCamara());
        document.getElementById('btnExportarPDF').addEventListener('click', () => this.exportarPDF());
        
        // Modal
        document.getElementById('btnNuevoJugador').addEventListener('click', () => {
            document.getElementById('modalNuevoJugador').style.display = 'block';
        });
        
        document.querySelector('.cerrar-modal').addEventListener('click', () => {
            document.getElementById('modalNuevoJugador').style.display = 'none';
        });
        
        document.getElementById('btnGuardarJugador').addEventListener('click', () => {
            const nombre = document.getElementById('nombreNuevoJugador').value.trim();
            const edad = document.getElementById('edadNuevoJugador').value.trim() || 'N/A';
            const categoria = document.getElementById('categoriaNuevoJugador').value.trim() || 'Sin categoría';
            if (!nombre) { alert('⚠️ Ingresa un nombre'); return; }
            const nuevoJugador = {
                id: this.jugadores.length > 0 ? Math.max(...this.jugadores.map(j => j.id)) + 1 : 1,
                nombre, edad, categoria,
                fecha_registro: new Date().toLocaleString()
            };
            this.jugadores.push(nuevoJugador);
            this.guardarJugadores();
            this.actualizarSelectores();
            this.jugadorSelect.value = nuevoJugador.id;
            this.seleccionarJugador(nuevoJugador.id);
            document.getElementById('modalNuevoJugador').style.display = 'none';
            document.getElementById('nombreNuevoJugador').value = '';
            document.getElementById('edadNuevoJugador').value = '';
            document.getElementById('categoriaNuevoJugador').value = '';
            alert(`✅ Jugador ${nombre} agregado correctamente`);
        });
        
        document.getElementById('modalNuevoJugador').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalNuevoJugador')) {
                document.getElementById('modalNuevoJugador').style.display = 'none';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new CronometroFutbol();
});
