const Configuracion = require('../models/Configuracion');

exports.getConfiguracion = async (req, res) => {
    try {
        const config = await Configuracion.findOne();
        res.status(200).json(config);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateConfiguracion = async (req, res) => {
    try {
        let config = await Configuracion.findOne();
        if (config) {
            config = await Configuracion.findByIdAndUpdate(config._id, req.body, { new: true });
        } else {
            config = new Configuracion(req.body);
            await config.save();
        }
        res.status(200).json(config);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
