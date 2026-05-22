const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historialController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('ADMINISTRADOR'), historialController.getHistorial);
router.post('/', protect, authorize('ADMINISTRADOR'), historialController.createHistorial);

module.exports = router;
