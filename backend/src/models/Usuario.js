const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
        unique: true,
        lowercase: true,
        trim: true
    },
    password: { 
        type: String, 
        required: [true, 'La contraseña es obligatoria'] 
    },
    rol: { 
        type: String, 
        enum: ['ADMINISTRADOR', 'OPERADOR', 'VIGILANTE'], 
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
    }
}, { timestamps: true });

// Encriptar contraseña antes de guardar
usuarioSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar contraseñas
usuarioSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
