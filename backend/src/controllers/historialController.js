const HistorialTurno = require('../models/HistorialTurno');

exports.getHistorial = async (req, res) => {
    try {
        const historial = await HistorialTurno.find().populate('turno usuario_accion');
        res.status(200).json(historial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createHistorial = async (req, res) => {
    try {
        const nuevoHistorial = new HistorialTurno(req.body);
        const historialGuardado = await nuevoHistorial.save();
        res.status(201).json(historialGuardado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
