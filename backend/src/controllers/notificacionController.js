const Notificacion = require('../models/Notificacion');

// @desc    Obtener notificaciones de la entidad (login / logout de operadores y vigilantes)
// @route   GET /api/notificaciones
// @access  Privado (ADMINISTRADOR)
exports.getNotificaciones = async (req, res) => {
    try {
        const entidadId = req.user.entidadId || req.query.entidadId;
        if (!entidadId) {
            return res.status(200).json({ notificaciones: [], unreadCount: 0 });
        }

        // Consultar las últimas 30 notificaciones de la entidad ordenadas cronológicamente
        const notificaciones = await Notificacion.find({ entidadId })
            .sort({ fecha: -1 })
            .limit(30)
            .lean();

        // Contar las no leídas
        const unreadCount = await Notificacion.countDocuments({ entidadId, leido: false });

        return res.status(200).json({
            notificaciones,
            unreadCount
        });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        return res.status(500).json({ message: 'Error al consultar notificaciones' });
    }
};

// @desc    Marcar notificaciones de la entidad como leídas
// @route   PUT /api/notificaciones/marcar-leidas
// @access  Privado (ADMINISTRADOR)
exports.marcarLeidas = async (req, res) => {
    try {
        const entidadId = req.user.entidadId || req.body.entidadId;
        if (entidadId) {
            await Notificacion.updateMany(
                { entidadId, leido: false },
                { $set: { leido: true } }
            );
        }

        return res.status(200).json({ message: 'Notificaciones marcadas como leídas' });
    } catch (error) {
        console.error('Error al marcar notificaciones leídas:', error);
        return res.status(500).json({ message: 'Error al actualizar notificaciones' });
    }
};
