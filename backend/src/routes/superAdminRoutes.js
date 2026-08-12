const express = require('express');
const router = express.Router();

const superAdminController = require('../controllers/superAdminController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Todas las rutas de este router están estrictamente protegidas para SUPER_ADMIN
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// ── Dashboard & Métricas ─────────────────────────────────────────────────────
router.get('/dashboard', superAdminController.getDashboardMetrics);

// ── Gestión de Entidades ─────────────────────────────────────────────────────
router.get('/entidades', superAdminController.getEntidades);
router.post('/entidades', superAdminController.crearEntidadConAdmin);
router.get('/entidades/:id', superAdminController.getEntidadById);
router.put('/entidades/:id', superAdminController.updateEntidad);
router.patch('/entidades/:id/estado', superAdminController.cambiarEstadoEntidad);

// ── Gestión de Planes ────────────────────────────────────────────────────────
router.get('/planes', superAdminController.getPlanes);
router.post('/planes', superAdminController.createPlan);
router.put('/planes/:id', superAdminController.updatePlan);
router.patch('/planes/:id/estado', superAdminController.cambiarEstadoPlan);

// ── Gestión de Licencias ─────────────────────────────────────────────────────
router.get('/licencias', superAdminController.getLicencias);
router.post('/licencias', superAdminController.createLicencia);
router.post('/licencias/:id/renovar', superAdminController.renovarLicencia);
router.patch('/licencias/:id/estado', superAdminController.cambiarEstadoLicencia);

// ── Centro de Operaciones & Auditoría ────────────────────────────────────────
router.get('/operaciones', superAdminController.getCentroOperaciones);
router.get('/auditoria', superAdminController.getAuditoriaGlobal);

// ── Monitoreo & Salud del Sistema ────────────────────────────────────────────
router.get('/monitoreo', superAdminController.getMonitoreo);

// ── Configuración Global ─────────────────────────────────────────────────────
router.get('/configuracion', superAdminController.getConfiguracionGlobal);
router.put('/configuracion', superAdminController.updateConfiguracionGlobal);

module.exports = router;
