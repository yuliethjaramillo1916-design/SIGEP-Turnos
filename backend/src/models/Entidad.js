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
            type: String,   // URL o base64 o ruta
            default: ''
        },

        // ── Estado operacional ────────────────────────────────────────────
        estado: {
            type: String,
            enum: {
                values: ['activa', 'inactiva', 'suspendida', 'archivada'],
                message: 'El estado debe ser: activa, inactiva, suspendida o archivada'
            },
            default: 'activa'
        },

        // ── Plan y Límites SaaS ───────────────────────────────────────────
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Plan',
            default: null
        },

        fechaVencimiento: {
            type: Date,
            default: null
        },

        cantidadMaximaUsuarios: {
            type: Number,
            default: 10,
            min: [1, 'Mínimo 1 usuario']
        },

        cantidadMaximaVentanillas: {
            type: Number,
            default: 5,
            min: [1, 'Mínimo 1 ventanilla']
        },

        cantidadMaximaTramites: {
            type: Number,
            default: 15,
            min: [1, 'Mínimo 1 trámite']
        },

        // ── Configuración operacional ─────────────────────────────────────
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
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            default: null
        }
    },
    {
        timestamps: true,
        collection: 'entidades'
    }
);

// ── Índices ────────────────────────────────────────────────────────────────
entidadSchema.index({ estado: 1 });
entidadSchema.index({ nombre: 'text' });
entidadSchema.index({ planId: 1 });

// ── Métodos de instancia ──────────────────────────────────────────────────

/**
 * Devuelve true si la entidad puede recibir operaciones (estado: 'activa').
 */
entidadSchema.methods.estaActiva = function () {
    return this.estado === 'activa';
};

/**
 * Devuelve un objeto plano con solo los datos públicos de la entidad
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
        planId: this.planId,
        fechaVencimiento: this.fechaVencimiento,
        cantidadMaximaUsuarios: this.cantidadMaximaUsuarios,
        cantidadMaximaVentanillas: this.cantidadMaximaVentanillas,
        cantidadMaximaTramites: this.cantidadMaximaTramites,
        horarioAtencion: this.horarioAtencion,
        limiteTurnosDia: this.limiteTurnosDia,
        prefijoCodigo: this.prefijoCodigo,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

module.exports = mongoose.model('Entidad', entidadSchema);
