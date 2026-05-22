const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Dashboard requiere estar logueado y ser OPERADOR o ADMINISTRADOR
router.get('/dashboard', protect, authorize('OPERADOR', 'ADMINISTRADOR'), reporteController.getDashboardStats);

// Reporte histórico avanzado está estrictamente reservado para ADMINISTRADORES
router.get('/historico', protect, authorize('ADMINISTRADOR'), reporteController.getHistoricoReport);

module.exports = router;
