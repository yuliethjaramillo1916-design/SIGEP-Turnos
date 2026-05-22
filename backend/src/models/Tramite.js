const mongoose = require('mongoose');

const tramiteSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: [true, 'El nombre del trámite es obligatorio'],
        trim: true 
    },
    descripcion: { 
        type: String,
        trim: true 
    },
    tiempoEstimado: { 
        type: Number, 
        default: 15 // en minutos
    },
    estado: { 
        type: Boolean, 
        default: true 
    }
}, { timestamps: true });

module.exports = mongoose.model('Tramite', tramiteSchema);
