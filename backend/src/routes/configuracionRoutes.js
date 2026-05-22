const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracionController');
const { protect, authorize } = require('../middleware/authMiddleware');

// El público en general puede ver la configuración básica (ej. pantalla pública)
router.get('/', configuracionController.getConfiguracion);

// Solo el rol ADMINISTRADOR puede modificar la configuración del sistema
router.post('/', protect, authorize('ADMINISTRADOR'), configuracionController.updateConfiguracion);

module.exports = router;
