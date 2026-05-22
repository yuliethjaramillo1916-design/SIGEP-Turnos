const Ventanilla = require('../models/Ventanilla');

exports.getVentanillas = async (req, res) => {
    try {
        const ventanillas = await Ventanilla.find().populate('operador');
        res.status(200).json(ventanillas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getVentanillaById = async (req, res) => {
    try {
        const ventanilla = await Ventanilla.findById(req.params.id).populate('operador');
        if (!ventanilla) return res.status(404).json({ message: 'Ventanilla no encontrada' });
        res.status(200).json(ventanilla);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createVentanilla = async (req, res) => {
    try {
        const nuevaVentanilla = new Ventanilla(req.body);
        const ventanillaGuardada = await nuevaVentanilla.save();
        res.status(201).json(ventanillaGuardada);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateVentanilla = async (req, res) => {
    try {
        const oldVentanilla = await Ventanilla.findById(req.params.id);
        const ventanillaActualizada = await Ventanilla.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('operador');
        if (!ventanillaActualizada) return res.status(404).json({ message: 'Ventanilla no encontrada' });
        
        // Sincronizar relación con Usuario si cambió el operador
        if (req.body.operador !== undefined) {
            const Usuario = require('../models/Usuario');
            const newOperatorId = req.body.operador || null;
            const oldOperatorId = oldVentanilla ? oldVentanilla.operador : null;

            if (String(oldOperatorId) !== String(newOperatorId)) {
                // Desvincular operador antiguo de su campo ventanilla
                if (oldOperatorId) {
                    await Usuario.findByIdAndUpdate(oldOperatorId, { ventanilla: null });
                }
                // Vincular nuevo operador a esta ventanilla
                if (newOperatorId) {
                    // Desvincular el nuevo operador de cualquier otra ventanilla que tuviera
                    await Ventanilla.updateMany(
                        { operador: newOperatorId, _id: { $ne: ventanillaActualizada._id } },
                        { $unset: { operador: 1 } }
                    );
                    await Usuario.findByIdAndUpdate(newOperatorId, { ventanilla: ventanillaActualizada._id });
                }
            }
        }

        res.status(200).json(ventanillaActualizada);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteVentanilla = async (req, res) => {
    try {
        const ventanillaEliminada = await Ventanilla.findByIdAndDelete(req.params.id);
        if (!ventanillaEliminada) return res.status(404).json({ message: 'Ventanilla no encontrada' });
        
        // Desvincular la ventanilla eliminada de cualquier usuario que la tuviera asignada
        const Usuario = require('../models/Usuario');
        await Usuario.updateMany({ ventanilla: req.params.id }, { ventanilla: null });

        res.status(200).json({ message: 'Ventanilla eliminada' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
