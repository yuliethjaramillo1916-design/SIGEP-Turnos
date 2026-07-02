/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SCRIPT DE MIGRACIÓN — SIGEP-Turnos Multi-Entidad
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Propósito:
 *   Asignar una entidad por defecto a todos los documentos existentes que
 *   todavía tienen entidadId = null. Es el puente seguro entre el sistema
 *   mono-entidad actual y el nuevo sistema Multi-Tenant.
 *
 * Comportamiento:
 *   ✅ Idempotente: puede ejecutarse N veces sin duplicar datos ni errores.
 *   ✅ No destructivo: NUNCA elimina ni sobreescribe documentos ya migrados.
 *   ✅ Solo actualiza documentos donde entidadId === null.
 *
 * Uso:
 *   node backend/src/scripts/migrar-multi-entidad.js
 *
 * Desde la carpeta backend/:
 *   node src/scripts/migrar-multi-entidad.js
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

// ── Importar modelos ─────────────────────────────────────────────────────────
const Entidad       = require('../models/Entidad');
const Usuario       = require('../models/Usuario');
const Tramite       = require('../models/Tramite');
const Ventanilla    = require('../models/Ventanilla');
const Turno         = require('../models/Turno');
const HistorialTurno = require('../models/HistorialTurno');
const Reporte       = require('../models/Reporte');
const Configuracion = require('../models/Configuracion');

// ── Datos de la entidad por defecto ──────────────────────────────────────────
// Modifica estos valores con la información real de tu primera entidad.
const ENTIDAD_DEFAULT = {
    nombre:           'Entidad Principal SIGEP',
    NIT:              '000000000-0',
    direccion:        'Dirección por configurar',
    telefono:         '0000000000',
    correo:           'admin@sigep.gov.co',
    logo:             '',
    estado:           'activa',
    horarioAtencion:  '08:00 - 17:00',
    limiteTurnosDia:  200,
    prefijoCodigo:    'T'
};

// ── Colecciones a migrar ──────────────────────────────────────────────────────
// Orden: de menor a mayor dependencia.
const COLECCIONES = [
    { modelo: Usuario,        nombre: 'usuarios'         },
    { modelo: Tramite,        nombre: 'tramites'         },
    { modelo: Ventanilla,     nombre: 'ventanillas'      },
    { modelo: Turno,          nombre: 'turnos'           },
    { modelo: HistorialTurno, nombre: 'historialTurnos'  },
    { modelo: Reporte,        nombre: 'reportes'         },
    { modelo: Configuracion,  nombre: 'configuraciones'  }
];

// ── Helpers visuales ──────────────────────────────────────────────────────────
const LINEA  = '─'.repeat(60);
const LINEA2 = '═'.repeat(60);

function log(msg)        { console.log(msg); }
function ok(msg)         { console.log(`  ✅ ${msg}`); }
function info(msg)       { console.log(`  ℹ️  ${msg}`); }
function warn(msg)       { console.log(`  ⚠️  ${msg}`); }
function error(msg)      { console.error(`  ❌ ${msg}`); }

// ══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
async function migrar() {
    log('\n' + LINEA2);
    log('  SIGEP-Turnos — Script de Migración Multi-Entidad');
    log(LINEA2 + '\n');

    // ── 1. Conectar a MongoDB ────────────────────────────────────────────────
    log('📡 Conectando a MongoDB...');
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
        error('MONGODB_URI no está definida en el archivo .env');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoURI);
        log(`  ✅ Conectado a: ${mongoURI}\n`);
    } catch (err) {
        error(`No se pudo conectar a MongoDB: ${err.message}`);
        process.exit(1);
    }

    // ── 2. Crear o recuperar la entidad por defecto ──────────────────────────
    log(LINEA);
    log('🏛️  Paso 1: Verificar entidad por defecto');
    log(LINEA);

    let entidad;

    // Buscar por NIT (campo único) — garantiza idempotencia
    entidad = await Entidad.findOne({ NIT: ENTIDAD_DEFAULT.NIT });

    if (entidad) {
        info(`La entidad ya existe: "${entidad.nombre}" (ID: ${entidad._id})`);
        info('No se creará una nueva entidad — usando la existente.');
    } else {
        entidad = await Entidad.create(ENTIDAD_DEFAULT);
        ok(`Entidad creada: "${entidad.nombre}"`);
        ok(`ID asignado:   ${entidad._id}`);
        ok(`NIT:           ${entidad.NIT}`);
    }

    const entidadId = entidad._id;

    // ── 3. Migrar cada colección ─────────────────────────────────────────────
    log('\n' + LINEA);
    log('📦 Paso 2: Migrar colecciones');
    log(LINEA);

    const resumen = [];

    for (const { modelo, nombre } of COLECCIONES) {
        log(`\n  📂 Colección: ${nombre}`);

        // Contar total de documentos
        const total = await modelo.countDocuments();

        // Contar cuántos ya tienen entidadId (previamente migrados)
        const yaMigrados = await modelo.countDocuments({ entidadId: { $ne: null } });

        // Contar cuántos necesitan migración (entidadId = null)
        const pendientes = await modelo.countDocuments({ entidadId: null });

        info(`Total documentos:     ${total}`);
        info(`Ya migrados:          ${yaMigrados}`);
        info(`Pendientes de asignar: ${pendientes}`);

        let actualizados = 0;

        if (pendientes > 0) {
            // Solo toca documentos donde entidadId es null
            const resultado = await modelo.updateMany(
                { entidadId: null },
                { $set: { entidadId: entidadId } }
            );
            actualizados = resultado.modifiedCount;
            ok(`Actualizados: ${actualizados} documento(s)`);
        } else {
            info('Ningún documento pendiente — colección ya migrada.');
        }

        resumen.push({
            coleccion:   nombre,
            total,
            yaMigrados,
            pendientes,
            actualizados
        });
    }

    // ── 4. Resumen final ─────────────────────────────────────────────────────
    log('\n' + LINEA2);
    log('📊 RESUMEN DE MIGRACIÓN');
    log(LINEA2);
    log(`\n  Entidad asignada: "${entidad.nombre}"`);
    log(`  ID de entidad:    ${entidadId}\n`);

    // Cabecera de tabla
    const col1 = 'Colección'.padEnd(20);
    const col2 = 'Total'.padStart(7);
    const col3 = 'Ya migrados'.padStart(12);
    const col4 = 'Pendientes'.padStart(11);
    const col5 = 'Actualizados'.padStart(13);
    log(`  ${col1} ${col2} ${col3} ${col4} ${col5}`);
    log('  ' + '─'.repeat(66));

    for (const r of resumen) {
        const c1 = r.coleccion.padEnd(20);
        const c2 = String(r.total).padStart(7);
        const c3 = String(r.yaMigrados).padStart(12);
        const c4 = String(r.pendientes).padStart(11);
        const c5 = String(r.actualizados).padStart(13);
        log(`  ${c1} ${c2} ${c3} ${c4} ${c5}`);
    }

    log('\n' + LINEA2);
    log('✅ Migración completada con éxito.');
    log('');
    log('  Próximos pasos:');
    log('  → ETAPA 3: Modificar el Login para incluir entidadId en el JWT.');
    log('  → ETAPA 4: Modificar el middleware para filtrar por entidadId.');
    log(LINEA2 + '\n');

    // ── 5. Desconectar ───────────────────────────────────────────────────────
    await mongoose.disconnect();
    log('📡 Desconectado de MongoDB.\n');
    process.exit(0);
}

// ── Ejecutar ──────────────────────────────────────────────────────────────────
migrar().catch((err) => {
    console.error('\n❌ Error inesperado durante la migración:', err);
    mongoose.disconnect();
    process.exit(1);
});
