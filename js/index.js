const SUPABASE_URL = "https://ffiuayjfnhlvxgktxbal.supabase.co";
const SUPABASE_KEY = "sb_publishable_F8h3Zay5r9pVATEnvAIa-Q_bnaXgj1U";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const fileInput = document.getElementById('excelFile');
const sheetStatus = document.getElementById('sheetStatus');
const sheetList = document.getElementById('sheetList');
const btnSubir = document.getElementById('btnSubir');
const mensaje = document.getElementById('mensaje');

let hojasProcesadas = {};
let tipoDetectado = null;
const TAMANO_LOTE = 1000;

fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        hojasProcesadas = {};
        tipoDetectado = null;
        sheetList.innerHTML = '';

        let hojaEncontrada = null;
        for (const nombreHoja of workbook.SheetNames) {
            const worksheet = workbook.Sheets[nombreHoja];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
            const tipo = detectarTipo(rows);
            if (tipo) { hojaEncontrada = { nombreHoja, rows, tipo }; break; }
        }

        if (!hojaEncontrada) { mostrarMensaje('No se pudo detectar el tipo de Excel.', 'error'); return; }
        tipoDetectado = hojaEncontrada.tipo;
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-check-circle"></i> ${hojaEncontrada.nombreHoja} → ${tipoDetectado}`;
        sheetList.appendChild(li);

        const filas = procesarHoja(hojaEncontrada.rows, tipoDetectado);
        hojasProcesadas[tipoDetectado] = filas;
        sheetStatus.style.display = 'block';
        mostrarMensaje(`Excel detectado (${filas.length} filas).`, 'ok');
    };
    reader.readAsArrayBuffer(file);
});

function detectarTipo(rows) {
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const fila = rows[i].map(c => (c || '').toString().trim().toLowerCase());
        const tieneVenta = fila.some(c => c.includes('id_venta') || c.includes('id venta'));
        const tieneRegion = fila.some(c => c === 'region');
        const tieneGanancia = fila.some(c => c === 'ganancia');
        if (tieneVenta && tieneRegion && tieneGanancia) return 'VENTAS';
    }
    return null;
}

function procesarHoja(rows, tipo) {
    if (!rows || rows.length === 0) return [];
    let headerIndex = 0;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const fila = rows[i].map(c => (c || '').toString().trim().toLowerCase());
        if (tipo === 'VENTAS' && fila.includes('id_venta')) { headerIndex = i; break; }
    }
    const headers = (rows[headerIndex] || []).map((h, i) => {
        let limpio = (h || '').toString().trim().replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ');
        return limpio === '' ? `Columna_${i + 1}` : limpio;
    });
    const headersUnicos = [], contador = {};
    headers.forEach(h => {
        if (contador[h]) { contador[h]++; headersUnicos.push(`${h}_${contador[h]}`); }
        else { contador[h] = 1; headersUnicos.push(h); }
    });
    return rows.slice(headerIndex + 1).map(row => {
        const obj = {};
        headersUnicos.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
    }).filter(f => Object.values(f).some(v => v !== undefined && v !== null && v !== ''));
}

btnSubir.addEventListener('click', async function () {
    if (!hojasProcesadas || Object.keys(hojasProcesadas).length === 0 || !tipoDetectado) {
        mostrarMensaje('Primero selecciona un archivo Excel válido.', 'error');
        return;
    }
    btnSubir.disabled = true;
    btnSubir.textContent = 'Subiendo...';
    try {
        mostrarMensaje(`Borrando datos anteriores...`, 'loading');
        await supabaseClient.from('dashboard_data').delete().eq('sheet_name', tipoDetectado);
        for (const [nombre, data] of Object.entries(hojasProcesadas)) {
            if (data.length === 0) continue;
            const totalLotes = Math.ceil(data.length / TAMANO_LOTE);
            for (let lote = 0; lote < totalLotes; lote++) {
                const inicio = lote * TAMANO_LOTE;
                const bloque = data.slice(inicio, inicio + TAMANO_LOTE);
                const registros = bloque.map((fila, idx) => ({ sheet_name: nombre, row_index: inicio + idx, data: fila }));
                mostrarMensaje(`📤 Lote ${lote + 1}/${totalLotes}`, 'loading');
                const { error } = await supabaseClient.from('dashboard_data').insert(registros);
                if (error) throw error;
            }
        }
        mostrarMensaje('✅ Proceso terminado.', 'ok');
    } catch (err) {
        console.error(err);
        mostrarMensaje('❌ Error: ' + err.message, 'error');
    } finally {
        btnSubir.disabled = false;
        btnSubir.textContent = 'Subir a Supabase';
    }
});

function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.className = 'mensaje ' + tipo;
}