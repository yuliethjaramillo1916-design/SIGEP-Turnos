const mongoose = require('mongoose');

/**
 * Modelo: Entidad
 * ──────────────────────────────────────────────────────────────────────────
 * Representa una entidad pública (Alcaldía, Gobernación, Secretaría, etc.)
 * que usa SIGEP-Turnos de forma completamente independiente.
 *
 * Es la RAÍZ del sistema Multi-Tenant:
 *   - Su _id actúa como "entidadId" en todas las demás colecciones.
 *   - TODAS las colecciones operacionales (Usuario, Tramite, Ventanilla,
 *     Turno, HistorialTurno, Reporte, Configuracion) referenciarán este _id.
 *
 * Gestión:
 *   - Solo un usuario con rol SUPER_ADMIN puede crear/modificar entidades.
 *   - Los ADMINISTRADORES solo pueden ver/editar su propia entidad.
 * ──────────────────────────────────────────────────────────────────────────
 */

const entidadSchema = new mongoose.Schema(
    {
        // ── Información institucional ─────────────────────────────────────
        nombre: {
            type: String,
            required: [true, 'El nombre de la entidad es obligatorio'],
            trim: true,
            maxlength: [150, 'El nombre no puede superar 150 caracteres']
        },

        NIT: {
            type: String,
            required: [true, 'El NIT es obligatorio'],
            unique: true,
            trim: true
            // Formato sugerido: "123456789-0"
            // La validación de formato se hace en el controlador para
            // mayor flexibilidad ante distintos formatos institucionales.
        },

        direccion: {
            type: String,
            required: [true, 'La dirección es obligatoria'],
            trim: true,
            maxlength: [200, 'La dirección no puede superar 200 caracteres']
        },

        telefono: {
            type: String,
            required: [true, 'El teléfono de contacto es obligatorio'],
            trim: true,
            maxlength: [20, 'El teléfono no puede superar 20 caracteres']
        },

        correo: {
            type: String,
            required: [true, 'El correo institucional es obligatorio'],
            lowercase: true,
            trim: true,
            match: [
                /^\S+@\S+\.\S+$/,
                'El formato del correo institucional no es válido'
            ]
        },

        logo: {
            type: String,   // URL o ruta relativa al archivo de logo
            default: ''
        },

        // ── Estado operacional ────────────────────────────────────────────
        estado: {
            type: String,
            enum: {
                values: ['activa', 'inactiva', 'suspendida'],
                message: 'El estado debe ser: activa, inactiva o suspendida'
            },
            default: 'activa'
        },

        // ── Configuración operacional ─────────────────────────────────────
        // Centraliza los datos que antes vivían en el modelo Configuracion
        // (que era global). Ahora cada entidad tiene su propia configuración.
        horarioAtencion: {
            type: String,
            default: '08:00 - 17:00',
            trim: true,
            maxlength: [50, 'El horario no puede superar 50 caracteres']
        },

        limiteTurnosDia: {
            type: Number,
            default: 200,
            min: [1, 'El límite mínimo es 1 turno por día'],
            max: [9999, 'El límite máximo es 9999 turnos por día']
        },

        prefijoCodigo: {
            // Prefijo para los códigos de turno generados en esta entidad.
            // Ejemplo: "VLL" → VLL-001, VLL-002 ...
            // Esto permite identificar a qué entidad pertenece un código a simple vista.
            type: String,
            default: 'T',
            trim: true,
            uppercase: true,
            maxlength: [5, 'El prefijo no puede superar 5 caracteres'],
            match: [
                /^[A-Z]{1,5}$/,
                'El prefijo solo puede contener letras mayúsculas (máx. 5)'
            ]
        },

        // ── Auditoría ─────────────────────────────────────────────────────
        creadoPor: {
            // ID del SUPER_ADMIN que registró esta entidad en el sistema.
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            default: null
        }
    },
    {
        // Agrega automáticamente: createdAt (fechaCreación) y updatedAt (fechaActualización)
        timestamps: true,
        // Nombre explícito de la colección en MongoDB
        collection: 'entidades'
    }
);

// ── Índices ────────────────────────────────────────────────────────────────
// NIT ya tiene índice único por { unique: true } en el campo.
// Índice por estado para consultas de SUPER_ADMIN (listar entidades activas/inactivas).
entidadSchema.index({ estado: 1 });
// Índice de texto para búsqueda por nombre (útil en el panel de SUPER_ADMIN).
entidadSchema.index({ nombre: 'text' });

// ── Métodos de instancia ──────────────────────────────────────────────────

/**
 * Devuelve true si la entidad puede recibir operaciones (estado: 'activa').
 */
entidadSchema.methods.estaActiva = function () {
    return this.estado === 'activa';
};

/**
 * Devuelve un objeto plano con solo los datos públicos de la entidad
 * (sin exponer campos de auditoría).
 */
entidadSchema.methods.toPublic = function () {
    return {
        _id: this._id,
        nombre: this.nombre,
        NIT: this.NIT,
        direccion: this.direccion,
        telefono: this.telefono,
        correo: this.correo,
        logo: this.logo,
        estado: this.estado,
        horarioAtencion: this.horarioAtencion,
        limiteTurnosDia: this.limiteTurnosDia,
        prefijoCodigo: this.prefijoCodigo,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

module.exports = mongoose.model('Entidad', entidadSchema);
