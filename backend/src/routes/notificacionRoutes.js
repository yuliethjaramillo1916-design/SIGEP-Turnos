const express = require('express');
const router = express.Router();
const notificacionController = require('../controllers/notificacionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Solo Administradores (y Super Admin) pueden consultar o marcar notificaciones
router.get('/', protect, authorize('ADMINISTRADOR'), notificacionController.getNotificaciones);
router.put('/marcar-leidas', protect, authorize('ADMINISTRADOR'), notificacionController.marcarLeidas);

module.exports = router;
