const mongoose = require('mongoose');

const turnoSchema = new mongoose.Schema({
    codigoTurno: { 
        type: String, 
        required: true 
    },
    tramite: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Tramite', 
        required: true 
    },
    estado: { 
        type: String, 
        enum: ['ESPERA', 'ATENDIENDO', 'FINALIZADO', 'CANCELADO', 'PAUSADO'], 
        default: 'ESPERA' 
    },
    prioridad: { 
        type: String, 
        enum: ['NORMAL', 'PRIORITARIO'], 
        default: 'NORMAL' 
    },
    motivoPrioridad: { 
        type: String, 
        enum: ['Adulto Mayor', 'Embarazo', 'Discapacidad', 'Urgencias', null], 
        default: null 
    },
    ventanilla: { 
        type: String, // Guardamos el nombre o número de la ventanilla, ej: "Ventanilla 1"
        default: null
    },
    usuarioAtencion: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Usuario',
        default: null
    },
    fecha: { 
        type: String, // Formato YYYY-MM-DD
        required: true
    },
    hora: { 
        type: String, // Formato HH:MM:SS
        required: true
    },
    tiempoEspera: { 
        type: Number, // en segundos
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Turno', turnoSchema);
