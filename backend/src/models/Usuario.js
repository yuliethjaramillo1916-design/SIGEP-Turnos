const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────────────────────────────────────────
// ETAPA 2 — Multi-Entidad
// Se agrega el campo `entidadId` para asociar cada usuario a su entidad.
// Se agrega el rol `SUPER_ADMIN` para la gestión global del sistema.
//
// NOTA DE MIGRACIÓN:
//   - `entidadId` es null por defecto. Sin required: true.
//   - Los documentos existentes recibirán su entidadId mediante el script:
//     backend/src/scripts/migrar-multi-entidad.js
//   - En la ETAPA 4 (middleware JWT) este campo se volverá obligatorio.
// ─────────────────────────────────────────────────────────────────────────────

const usuarioSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: [true, 'El nombre es obligatorio'] 
    },
    apellido: { 
        type: String, 
        required: [true, 'El apellido es obligatorio'] 
    },
    email: { 
        type: String, 
        required: [true, 'El correo es obligatorio'], 
        unique: true,       // Se mantiene único global durante la migración.
        lowercase: true,
        trim: true
        // En la ETAPA 4 se eliminará este unique global y se activará
        // el índice compuesto { entidadId, email } con unique: true.
    },
    password: { 
        type: String, 
        required: [true, 'La contraseña es obligatoria'] 
    },
    rol: { 
        type: String, 
        // SUPER_ADMIN: gestiona entidades, sin entidadId propio.
        // ADMINISTRADOR: gestiona su entidad.
        // OPERADOR: atiende turnos en su entidad.
        // VIGILANTE: asigna turnos en su entidad.
        enum: ['SUPER_ADMIN', 'ADMINISTRADOR', 'OPERADOR', 'VIGILANTE'], 
        default: 'OPERADOR' 
    },
    estado: { 
        type: Boolean, 
        default: true 
    },
    ventanilla: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ventanilla',
        default: null
    },

    // ── MULTI-ENTIDAD ───────────────────────────────────────────────────────
    entidadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Entidad',
        default: null
        // Sin required: true — migración segura.
        // SUPER_ADMIN tendrá entidadId: null de forma permanente.
    }
    // ────────────────────────────────────────────────────────────────────────

}, { timestamps: true });

// ── Índices ──────────────────────────────────────────────────────────────────
// Índice compuesto para búsquedas eficientes por entidad.
// En ETAPA 4 se activará unique: true en este índice y se eliminará
// el unique global del campo email.
usuarioSchema.index({ entidadId: 1, email: 1 });
// Índice por rol para consultas de SUPER_ADMIN (listar administradores, etc.)
usuarioSchema.index({ entidadId: 1, rol: 1 });

// ── Hooks ────────────────────────────────────────────────────────────────────

// Encriptar contraseña antes de guardar
usuarioSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// ── Métodos de instancia ─────────────────────────────────────────────────────

// Método para comparar contraseñas
usuarioSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
