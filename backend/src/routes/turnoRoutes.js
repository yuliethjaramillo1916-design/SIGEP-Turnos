const express = require('express');
const router = express.Router();
const turnoController = require('../controllers/turnoController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Endpoint público para la pantalla de turnos (No requiere login)
router.get('/publico', turnoController.getTurnosPublico);

// Todas las demás rutas requieren autenticación
router.use(protect);

router.get('/', turnoController.getTurnos);
router.get('/:id', turnoController.getTurnoById);
router.post('/', authorize('VIGILANTE', 'ADMINISTRADOR'), turnoController.createTurno); // Generar turno (Vigilante/Admin/etc)

// Flujos de operadores y atención de ventanilla
router.post('/llamar-siguiente', authorize('OPERADOR', 'ADMINISTRADOR'), turnoController.llamarSiguiente);
router.put('/:id/finalizar', authorize('OPERADOR', 'ADMINISTRADOR'), turnoController.finalizarTurno);
router.put('/:id/pausar', authorize('OPERADOR', 'ADMINISTRADOR'), turnoController.pausarTurno);
router.put('/:id/reanudar', authorize('OPERADOR', 'ADMINISTRADOR'), turnoController.reanudarTurno);
router.put('/:id/transferir', authorize('OPERADOR', 'ADMINISTRADOR'), turnoController.transferirTurno);
router.put('/:id/cancelar', authorize('ADMINISTRADOR'), turnoController.cancelarTurno); // Cancelar turno (Solo Admin)

// Rutas administrativas genéricas
router.put('/:id', authorize('ADMINISTRADOR'), turnoController.updateTurno);
router.delete('/:id', authorize('ADMINISTRADOR'), turnoController.deleteTurno);

module.exports = router;
