const os = require('os');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Entidad = require('../models/Entidad');
const Usuario = require('../models/Usuario');
const Ventanilla = require('../models/Ventanilla');
const Tramite = require('../models/Tramite');
const Turno = require('../models/Turno');
const Configuracion = require('../models/Configuracion');
const Plan = require('../models/Plan');
const Licencia = require('../models/Licencia');
const AuditoriaGlobal = require('../models/AuditoriaGlobal');
const ConfiguracionGlobal = require('../models/ConfiguracionGlobal');

const { registrarAuditoria } = require('../services/auditoriaService');
const { getConsumoEntidad } = require('../services/limitesService');

// ─────────────────────────────────────────────────────────────────────────────
// 1. DASHBOARD & MÉTRICAS GLOBALES (AGREGADAS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Obtener métricas agregadas para el dashboard del SuperAdmin
 * @route   GET /api/super-admin/dashboard
 * @access  Privado (SUPER_ADMIN)
 */
exports.getDashboardMetrics = async (req, res) => {
    try {
        const [
            totalEntidades,
            entidadesActivas,
            entidadesSuspendidas,
            entidadesArchivadas,
            totalUsuarios,
            totalAdmins,
            totalOperadores,
            totalVigilantes,
            totalVentanillas,
            totalTramites,
            totalTurnos,
            licenciasActivas,
            licenciasPorVencer,
            ultimosEventos
        ] = await Promise.all([
            Entidad.countDocuments(),
            Entidad.countDocuments({ estado: 'activa' }),
            Entidad.countDocuments({ estado: 'suspendida' }),
            Entidad.countDocuments({ estado: 'archivada' }),
            Usuario.countDocuments({ rol: { $ne: 'SUPER_ADMIN' } }),
            Usuario.countDocuments({ rol: 'ADMINISTRADOR' }),
            Usuario.countDocuments({ rol: 'OPERADOR' }),
            Usuario.countDocuments({ rol: 'VIGILANTE' }),
            Ventanilla.countDocuments(),
            Tramite.countDocuments(),
            Turno.countDocuments(),
            Licencia.countDocuments({ estado: 'activa' }),
            Licencia.countDocuments({
                estado: 'activa',
                fechaVencimiento: {
                    $gte: new Date(),
                    $lte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
                }
            }),
            AuditoriaGlobal.find()
                .sort({ createdAt: -1 })
                .limit(8)
                .populate('autor', 'nombre apellido email')
                .populate('entidadAfectada', 'nombre logo')
                .lean()
        ]);

        // Métricas de Rendimiento y Servidor
        const memoryUsage = process.memoryUsage();
        const serverStatus = {
            uptimeSeconds: Math.floor(process.uptime()),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cpuCores: os.cpus().length,
            memory: {
                heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
                freeSystemMB: Math.round(os.freemem() / 1024 / 1024),
                totalSystemMB: Math.round(os.totalmem() / 1024 / 1024)
            },
            dbConnection: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'
        };

        // Resumen agregado por entidad para el panel general (top 6 entidades activas)
        const entidadesRecientes = await Entidad.find({ estado: { $ne: 'archivada' } })
            .sort({ createdAt: -1 })
            .limit(6)
            .populate('planId', 'nombre precio')
            .lean();

        const resumenEntidades = await Promise.all(
            entidadesRecientes.map(async (ent) => {
                const [usersCount, ventCount, turnosCount, lic] = await Promise.all([
                    Usuario.countDocuments({ entidadId: ent._id }),
                    Ventanilla.countDocuments({ entidadId: ent._id }),
                    Turno.countDocuments({ entidadId: ent._id }),
                    Licencia.findOne({ entidadId: ent._id, estado: 'activa' }).lean()
                ]);

                return {
                    _id: ent._id,
                    nombre: ent.nombre,
                    NIT: ent.NIT,
                    logo: ent.logo,
                    estado: ent.estado,
                    plan: ent.planId?.nombre || 'Personalizado',
                    fechaVencimiento: lic?.fechaVencimiento || ent.fechaVencimiento,
                    usuarios: usersCount,
                    maxUsuarios: lic?.limiteUsuarios || ent.cantidadMaximaUsuarios || 10,
                    ventanillas: ventCount,
                    maxVentanillas: lic?.limiteVentanillas || ent.cantidadMaximaVentanillas || 5,
                    turnosTotal: turnosCount,
                    createdAt: ent.createdAt
                };
            })
        );

        res.status(200).json({
            totales: {
                entidades: totalEntidades,
                entidadesActivas,
                entidadesSuspendidas,
                entidadesArchivadas,
                usuarios: totalUsuarios,
                administradores: totalAdmins,
                operadores: totalOperadores,
                vigilantes: totalVigilantes,
                ventanillas: totalVentanillas,
                tramites: totalTramites,
                turnosGlobales: totalTurnos,
                licenciasActivas,
                licenciasPorVencer
            },
            servidor: serverStatus,
            ultimosEventos,
            resumenEntidades
        });
    } catch (error) {
        console.error('Error al obtener métricas del dashboard SuperAdmin:', error);
        res.status(500).json({ message: 'Error al obtener métricas del dashboard' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GESTIÓN DE ENTIDADES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Listar todas las entidades con métricas agregadas
 * @route   GET /api/super-admin/entidades
 * @access  Privado (SUPER_ADMIN)
 */
exports.getEntidades = async (req, res) => {
    try {
        const { estado, buscar } = req.query;
        const filtro = {};

        if (estado && estado !== 'todas') {
            filtro.estado = estado;
        }

        if (buscar) {
            filtro.$or = [
                { nombre: { $regex: buscar, $options: 'i' } },
                { NIT: { $regex: buscar, $options: 'i' } },
                { correo: { $regex: buscar, $options: 'i' } }
            ];
        }

        const entidades = await Entidad.find(filtro)
            .sort({ createdAt: -1 })
            .populate('planId', 'nombre precio')
            .lean();

        // Enriquecer cada entidad con sus conteos agregados
        const entidadesEnriquecidas = await Promise.all(
            entidades.map(async (ent) => {
                const [totalUsuarios, totalVentanillas, totalTramites, totalTurnos, licencia] = await Promise.all([
                    Usuario.countDocuments({ entidadId: ent._id }),
                    Ventanilla.countDocuments({ entidadId: ent._id }),
                    Tramite.countDocuments({ entidadId: ent._id }),
                    Turno.countDocuments({ entidadId: ent._id }),
                    Licencia.findOne({ entidadId: ent._id, estado: 'activa' }).populate('planId', 'nombre').lean()
                ]);

                return {
                    ...ent,
                    metricas: {
                        usuarios: totalUsuarios,
                        maxUsuarios: licencia?.limiteUsuarios || ent.cantidadMaximaUsuarios || 10,
                        ventanillas: totalVentanillas,
                        maxVentanillas: licencia?.limiteVentanillas || ent.cantidadMaximaVentanillas || 5,
                        tramites: totalTramites,
                        maxTramites: licencia?.limiteTramites || ent.cantidadMaximaTramites || 15,
                        turnosEmitidos: totalTurnos
                    },
                    licenciaActiva: licencia ? {
                        _id: licencia._id,
                        claveLicencia: licencia.claveLicencia,
                        plan: licencia.planId?.nombre || 'Estándar',
                        fechaVencimiento: licencia.fechaVencimiento,
                        estado: licencia.estado
                    } : null
                };
            })
        );

        res.status(200).json(entidadesEnriquecidas);
    } catch (error) {
        console.error('Error al listar entidades:', error);
        res.status(500).json({ message: 'Error al obtener la lista de entidades' });
    }
};

/**
 * @desc    Obtener detalle agregado de una entidad
 * @route   GET /api/super-admin/entidades/:id
 * @access  Privado (SUPER_ADMIN)
 */
exports.getEntidadById = async (req, res) => {
    try {
        const entidad = await Entidad.findById(req.params.id)
            .populate('planId')
            .populate('creadoPor', 'nombre apellido email')
            .lean();

        if (!entidad) {
            return res.status(404).json({ message: 'Entidad no encontrada' });
        }

        const consumo = await getConsumoEntidad(entidad._id);
        const [totalTurnos, administradores, licencias, auditorias] = await Promise.all([
            Turno.countDocuments({ entidadId: entidad._id }),
            Usuario.find({ entidadId: entidad._id, rol: 'ADMINISTRADOR' }).select('nombre apellido email estado createdAt').lean(),
            Licencia.find({ entidadId: entidad._id }).sort({ createdAt: -1 }).populate('planId', 'nombre').lean(),
            AuditoriaGlobal.find({ entidadAfectada: entidad._id }).sort({ createdAt: -1 }).limit(10).populate('autor', 'nombre apellido email').lean()
        ]);

        res.status(200).json({
            entidad,
            consumo,
            totalTurnos,
            administradores,
            licencias,
            auditorias
        });
    } catch (error) {
        console.error('Error al obtener entidad por ID:', error);
        res.status(500).json({ message: 'Error al obtener detalles de la entidad' });
    }
};

/**
 * @desc    Crear nueva Entidad + Usuario Administrador Inicial + Configuración + Licencia (Flujo completo SaaS)
 * @route   POST /api/super-admin/entidades
 * @access  Privado (SUPER_ADMIN)
 */
exports.crearEntidadConAdmin = async (req, res) => {
    const {
        // Datos institucionales de la entidad
        nombre,
        NIT,
        direccion,
        telefono,
        correo,
        logo,
        prefijoCodigo,
        horarioAtencion,
        limiteTurnosDia,
        planId,
        mesesVigencia,

        // Datos del Administrador inicial
        adminNombre,
        adminApellido,
        adminEmail,
        adminPassword
    } = req.body;

    // Validación básica de campos requeridos
    if (!nombre || !NIT || !direccion || !telefono || !correo) {
        return res.status(400).json({ message: 'Por favor complete todos los datos obligatorios de la entidad' });
    }

    if (!adminNombre || !adminApellido || !adminEmail || !adminPassword) {
        return res.status(400).json({ message: 'Por favor complete todos los datos del usuario Administrador inicial' });
    }

    try {
        // 1. Validar que el NIT no exista
        const nitExistente = await Entidad.findOne({ NIT: NIT.trim() });
        if (nitExistente) {
            return res.status(400).json({ message: 'Ya existe una entidad registrada con este NIT' });
        }

        // 2. Validar que el email del administrador no esté en uso
        const emailExistente = await Usuario.findOne({ email: adminEmail.toLowerCase().trim() });
        if (emailExistente) {
            return res.status(400).json({ message: 'El correo electrónico del administrador ya está registrado en el sistema' });
        }

        // 3. Obtener plan seleccionado o plan por defecto
        let planSeleccionado = null;
        if (planId) {
            planSeleccionado = await Plan.findById(planId);
        }
        if (!planSeleccionado) {
            planSeleccionado = await Plan.findOne({ estado: 'activo' }).sort({ precio: 1 });
        }

        const maxUsers = planSeleccionado?.cantidadMaximaUsuarios || 10;
        const maxVents = planSeleccionado?.cantidadMaximaVentanillas || 5;
        const maxTrams = planSeleccionado?.cantidadMaximaTramites || 15;

        const duracionMeses = Number(mesesVigencia) || 12;
        const fechaVenc = new Date();
        fechaVenc.setMonth(fechaVenc.getMonth() + duracionMeses);

        // 4. Crear la Entidad
        const nuevaEntidad = new Entidad({
            nombre: nombre.trim(),
            NIT: NIT.trim(),
            direccion: direccion.trim(),
            telefono: telefono.trim(),
            correo: correo.toLowerCase().trim(),
            logo: logo || '',
            prefijoCodigo: (prefijoCodigo || 'T').toUpperCase().trim(),
            horarioAtencion: horarioAtencion || '08:00 - 17:00',
            limiteTurnosDia: Number(limiteTurnosDia) || 200,
            planId: planSeleccionado?._id || null,
            fechaVencimiento: fechaVenc,
            cantidadMaximaUsuarios: maxUsers,
            cantidadMaximaVentanillas: maxVents,
            cantidadMaximaTramites: maxTrams,
            creadoPor: req.user._id,
            estado: 'activa'
        });

        const entidadGuardada = await nuevaEntidad.save();

        // 5. Crear el Usuario Administrador asignado a la nueva entidad
        const nuevoAdmin = new Usuario({
            nombre: adminNombre.trim(),
            apellido: adminApellido.trim(),
            email: adminEmail.toLowerCase().trim(),
            password: adminPassword, // pre('save') encripta automáticamente
            rol: 'ADMINISTRADOR',
            estado: true,
            entidadId: entidadGuardada._id
        });

        const adminGuardado = await nuevoAdmin.save();

        // 6. Crear la Configuración inicial para la entidad
        await Configuracion.create({
            nombre_empresa: entidadGuardada.nombre,
            logo: entidadGuardada.logo || '',
            horario_atencion: entidadGuardada.horarioAtencion,
            limite_turnos_dia: entidadGuardada.limiteTurnosDia,
            activo: true,
            entidadId: entidadGuardada._id
        });

        // 7. Generar Licencia inicial
        const codigoLicencia = `SIGEP-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;
        
        let licenciaCreada = null;
        if (planSeleccionado) {
            licenciaCreada = await Licencia.create({
                claveLicencia: codigoLicencia,
                entidadId: entidadGuardada._id,
                planId: planSeleccionado._id,
                fechaInicio: new Date(),
                fechaVencimiento: fechaVenc,
                estado: 'activa',
                limiteUsuarios: maxUsers,
                limiteVentanillas: maxVents,
                limiteTramites: maxTrams,
                notas: `Licencia inicial generada por SUPER_ADMIN (${req.user.email})`
            });
        }

        // 8. Registrar Auditoría Global
        await registrarAuditoria({
            accion: 'CREAR_ENTIDAD',
            entidadAfectada: entidadGuardada._id,
            autor: req.user._id,
            detalles: `Entidad "${entidadGuardada.nombre}" creada con NIT: ${entidadGuardada.NIT}. Plan: ${planSeleccionado?.nombre || 'Básico'}. Administrador: ${adminGuardado.email}`,
            req
        });

        await registrarAuditoria({
            accion: 'CREAR_ADMIN_ENTIDAD',
            entidadAfectada: entidadGuardada._id,
            autor: req.user._id,
            detalles: `Usuario Administrador "${adminGuardado.nombre} ${adminGuardado.apellido}" (${adminGuardado.email}) creado para entidad ${entidadGuardada.nombre}`,
            req
        });

        res.status(201).json({
            message: 'Entidad y Administrador creados exitosamente',
            entidad: entidadGuardada,
            admin: {
                _id: adminGuardado._id,
                nombre: adminGuardado.nombre,
                apellido: adminGuardado.apellido,
                email: adminGuardado.email,
                rol: adminGuardado.rol
            },
            licencia: licenciaCreada
        });
    } catch (error) {
        console.error('Error al crear entidad con administrador:', error);
        res.status(400).json({ message: error.message || 'Error al procesar la creación de la entidad' });
    }
};

/**
 * @desc    Actualizar datos y límites de una entidad
 * @route   PUT /api/super-admin/entidades/:id
 * @access  Privado (SUPER_ADMIN)
 */
exports.updateEntidad = async (req, res) => {
    try {
        const {
            nombre,
            NIT,
            direccion,
            telefono,
            correo,
            logo,
            prefijoCodigo,
            horarioAtencion,
            limiteTurnosDia,
            planId,
            fechaVencimiento,
            cantidadMaximaUsuarios,
            cantidadMaximaVentanillas,
            cantidadMaximaTramites
        } = req.body;

        const entidad = await Entidad.findById(req.params.id);
        if (!entidad) {
            return res.status(404).json({ message: 'Entidad no encontrada' });
        }

        // Si se cambia el NIT, validar duplicados
        if (NIT && NIT.trim() !== entidad.NIT) {
            const nitExiste = await Entidad.findOne({ NIT: NIT.trim(), _id: { $ne: entidad._id } });
            if (nitExiste) {
                return res.status(400).json({ message: 'Ya existe otra entidad con este NIT' });
            }
            entidad.NIT = NIT.trim();
        }

        if (nombre) entidad.nombre = nombre.trim();
        if (direccion) entidad.direccion = direccion.trim();
        if (telefono) entidad.telefono = telefono.trim();
        if (correo) entidad.correo = correo.toLowerCase().trim();
        if (logo !== undefined) entidad.logo = logo;
        if (prefijoCodigo) entidad.prefijoCodigo = prefijoCodigo.toUpperCase().trim();
        if (horarioAtencion) entidad.horarioAtencion = horarioAtencion.trim();
        if (limiteTurnosDia) entidad.limiteTurnosDia = Number(limiteTurnosDia);
        if (planId) entidad.planId = planId;
        if (fechaVencimiento) entidad.fechaVencimiento = new Date(fechaVencimiento);
        if (cantidadMaximaUsuarios !== undefined) entidad.cantidadMaximaUsuarios = Number(cantidadMaximaUsuarios);
        if (cantidadMaximaVentanillas !== undefined) entidad.cantidadMaximaVentanillas = Number(cantidadMaximaVentanillas);
        if (cantidadMaximaTramites !== undefined) entidad.cantidadMaximaTramites = Number(cantidadMaximaTramites);

        const entidadActualizada = await entidad.save();

        // Sincronizar nombre/logo en Configuracion de la entidad
        await Configuracion.findOneAndUpdate(
            { entidadId: entidad._id },
            {
                nombre_empresa: entidad.nombre,
                logo: entidad.logo,
                horario_atencion: entidad.horarioAtencion,
                limite_turnos_dia: entidad.limiteTurnosDia
            }
        );

        await registrarAuditoria({
            accion: 'EDITAR_ENTIDAD',
            entidadAfectada: entidad._id,
            autor: req.user._id,
            detalles: `Entidad "${entidad.nombre}" actualizada por SUPER_ADMIN`,
            req
        });

        res.status(200).json(entidadActualizada);
    } catch (error) {
        console.error('Error al actualizar entidad:', error);
        res.status(400).json({ message: error.message || 'Error al actualizar la entidad' });
    }
};

/**
 * @desc    Cambiar estado de una entidad (activa, suspendida, archivada - ARCHIVADO LÓGICO)
 * @route   PATCH /api/super-admin/entidades/:id/estado
 * @access  Privado (SUPER_ADMIN)
 */
exports.cambiarEstadoEntidad = async (req, res) => {
    try {
        const { estado, motivo } = req.body;

        if (!['activa', 'inactiva', 'suspendida', 'archivada'].includes(estado)) {
            return res.status(400).json({ message: 'Estado inválido. Debe ser: activa, suspendida o archivada' });
        }

        const entidad = await Entidad.findById(req.params.id);
        if (!entidad) {
            return res.status(404).json({ message: 'Entidad no encontrada' });
        }

        const estadoAnterior = entidad.estado;
        entidad.estado = estado;
        await entidad.save();

        // Determinar acción para auditoría
        let accionAuditoria = 'CAMBIAR_ESTADO_ENTIDAD';
        if (estado === 'archivada') accionAuditoria = 'ARCHIVAR_ENTIDAD';
        if (estado === 'activa' && estadoAnterior !== 'activa') accionAuditoria = 'REACTIVAR_ENTIDAD';

        await registrarAuditoria({
            accion: accionAuditoria,
            entidadAfectada: entidad._id,
            autor: req.user._id,
            detalles: `Estado de "${entidad.nombre}" cambiado de '${estadoAnterior}' a '${estado}'. Motivo: ${motivo || 'No especificado'}`,
            req
        });

        res.status(200).json({
            message: `Entidad ${estado === 'archivada' ? 'archivada lógicamente' : estado} con éxito`,
            entidad
        });
    } catch (error) {
        console.error('Error al cambiar estado de entidad:', error);
        res.status(400).json({ message: error.message || 'Error al cambiar estado de la entidad' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GESTIÓN DE PLANES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Listar todos los planes SaaS
 * @route   GET /api/super-admin/planes
 * @access  Privado (SUPER_ADMIN)
 */
exports.getPlanes = async (req, res) => {
    try {
        const planes = await Plan.find().sort({ precio: 1 }).lean();

        // Enriquecer con número de entidades activas suscritas a cada plan
        const planesConConteo = await Promise.all(
            planes.map(async (p) => {
                const entidadesCount = await Entidad.countDocuments({ planId: p._id, estado: { $ne: 'archivada' } });
                return {
                    ...p,
                    entidadesSuscritas: entidadesCount
                };
            })
        );

        res.status(200).json(planesConConteo);
    } catch (error) {
        console.error('Error al listar planes:', error);
        res.status(500).json({ message: 'Error al obtener los planes' });
    }
};

/**
 * @desc    Crear nuevo plan SaaS
 * @route   POST /api/super-admin/planes
 * @access  Privado (SUPER_ADMIN)
 */
exports.createPlan = async (req, res) => {
    try {
        const nuevoPlan = new Plan(req.body);
        const planGuardado = await nuevoPlan.save();

        await registrarAuditoria({
            accion: 'CREAR_PLAN',
            autor: req.user._id,
            detalles: `Plan "${planGuardado.nombre}" creado con precio: $${planGuardado.precio}/mes`,
            req
        });

        res.status(201).json(planGuardado);
    } catch (error) {
        console.error('Error al crear plan:', error);
        res.status(400).json({ message: error.message || 'Error al crear el plan' });
    }
};

/**
 * @desc    Actualizar plan SaaS
 * @route   PUT /api/super-admin/planes/:id
 * @access  Privado (SUPER_ADMIN)
 */
exports.updatePlan = async (req, res) => {
    try {
        const planActualizado = await Plan.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!planActualizado) {
            return res.status(404).json({ message: 'Plan no encontrado' });
        }

        await registrarAuditoria({
            accion: 'EDITAR_PLAN',
            autor: req.user._id,
            detalles: `Plan "${planActualizado.nombre}" modificado`,
            req
        });

        res.status(200).json(planActualizado);
    } catch (error) {
        console.error('Error al actualizar plan:', error);
        res.status(400).json({ message: error.message || 'Error al actualizar el plan' });
    }
};

/**
 * @desc    Cambiar estado de un plan (activo/inactivo)
 * @route   PATCH /api/super-admin/planes/:id/estado
 * @access  Privado (SUPER_ADMIN)
 */
exports.cambiarEstadoPlan = async (req, res) => {
    try {
        const { estado } = req.body;
        const plan = await Plan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: 'Plan no encontrado' });
        }

        plan.estado = estado;
        await plan.save();

        await registrarAuditoria({
            accion: 'CAMBIAR_ESTADO_PLAN',
            autor: req.user._id,
            detalles: `Plan "${plan.nombre}" marcado como ${estado}`,
            req
        });

        res.status(200).json(plan);
    } catch (error) {
        console.error('Error al cambiar estado de plan:', error);
        res.status(400).json({ message: error.message || 'Error al cambiar estado del plan' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GESTIÓN DE LICENCIAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Listar licencias del sistema
 * @route   GET /api/super-admin/licencias
 * @access  Privado (SUPER_ADMIN)
 */
exports.getLicencias = async (req, res) => {
    try {
        const licencias = await Licencia.find()
            .sort({ createdAt: -1 })
            .populate('entidadId', 'nombre NIT logo estado')
            .populate('planId', 'nombre precio')
            .lean();

        // Enriquecer con el consumo de recursos de cada licencia
        const licenciasEnriquecidas = await Promise.all(
            licencias.map(async (lic) => {
                if (!lic.entidadId) return lic;
                const [usuarios, ventanillas, tramites] = await Promise.all([
                    Usuario.countDocuments({ entidadId: lic.entidadId._id }),
                    Ventanilla.countDocuments({ entidadId: lic.entidadId._id }),
                    Tramite.countDocuments({ entidadId: lic.entidadId._id })
                ]);
                return {
                    ...lic,
                    consumo: {
                        usuarios: { actual: usuarios, limite: lic.limiteUsuarios },
                        ventanillas: { actual: ventanillas, limite: lic.limiteVentanillas },
                        tramites: { actual: tramites, limite: lic.limiteTramites }
                    }
                };
            })
        );

        res.status(200).json(licenciasEnriquecidas);
    } catch (error) {
        console.error('Error al listar licencias:', error);
        res.status(500).json({ message: 'Error al obtener las licencias' });
    }
};

/**
 * @desc    Crear o emitir nueva licencia
 * @route   POST /api/super-admin/licencias
 * @access  Privado (SUPER_ADMIN)
 */
exports.createLicencia = async (req, res) => {
    try {
        const { entidadId, planId, mesesDuracion, limiteUsuarios, limiteVentanillas, limiteTramites, notas } = req.body;

        const entidad = await Entidad.findById(entidadId);
        if (!entidad) return res.status(404).json({ message: 'Entidad no encontrada' });

        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plan no encontrado' });

        const duracion = Number(mesesDuracion) || 12;
        const fechaVenc = new Date();
        fechaVenc.setMonth(fechaVenc.getMonth() + duracion);

        const claveLicencia = `SIGEP-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

        const nuevaLicencia = new Licencia({
            claveLicencia,
            entidadId,
            planId,
            fechaInicio: new Date(),
            fechaVencimiento: fechaVenc,
            limiteUsuarios: Number(limiteUsuarios) || plan.cantidadMaximaUsuarios,
            limiteVentanillas: Number(limiteVentanillas) || plan.cantidadMaximaVentanillas,
            limiteTramites: Number(limiteTramites) || plan.cantidadMaximaTramites,
            estado: 'activa',
            notas: notas || ''
        });

        const licenciaGuardada = await nuevaLicencia.save();

        // Actualizar datos de plan y fecha de vencimiento en la entidad
        entidad.planId = plan._id;
        entidad.fechaVencimiento = fechaVenc;
        entidad.cantidadMaximaUsuarios = nuevaLicencia.limiteUsuarios;
        entidad.cantidadMaximaVentanillas = nuevaLicencia.limiteVentanillas;
        entidad.cantidadMaximaTramites = nuevaLicencia.limiteTramites;
        await entidad.save();

        await registrarAuditoria({
            accion: 'CREAR_LICENCIA',
            entidadAfectada: entidad._id,
            autor: req.user._id,
            detalles: `Licencia "${claveLicencia}" emitida para ${entidad.nombre}. Vence: ${fechaVenc.toISOString().split('T')[0]}`,
            req
        });

        res.status(201).json(licenciaGuardada);
    } catch (error) {
        console.error('Error al emitir licencia:', error);
        res.status(400).json({ message: error.message || 'Error al emitir la licencia' });
    }
};

/**
 * @desc    Renovar licencia existente
 * @route   POST /api/super-admin/licencias/:id/renovar
 * @access  Privado (SUPER_ADMIN)
 */
exports.renovarLicencia = async (req, res) => {
    try {
        const { mesesAdicionales, nuevaFechaVencimiento } = req.body;
        const licencia = await Licencia.findById(req.params.id).populate('entidadId');

        if (!licencia) {
            return res.status(404).json({ message: 'Licencia no encontrada' });
        }

        let nuevaFecha;
        if (nuevaFechaVencimiento) {
            nuevaFecha = new Date(nuevaFechaVencimiento);
        } else {
            const meses = Number(mesesAdicionales) || 12;
            const fechaBase = (licencia.fechaVencimiento && new Date(licencia.fechaVencimiento) > new Date())
                ? new Date(licencia.fechaVencimiento)
                : new Date();
            nuevaFecha = new Date(fechaBase);
            nuevaFecha.setMonth(nuevaFecha.getMonth() + meses);
        }

        licencia.fechaVencimiento = nuevaFecha;
        licencia.estado = 'activa';
        await licencia.save();

        // Sincronizar en la entidad
        if (licencia.entidadId) {
            await Entidad.findByIdAndUpdate(licencia.entidadId._id, {
                fechaVencimiento: nuevaFecha,
                estado: 'activa'
            });
        }

        await registrarAuditoria({
            accion: 'RENOVAR_LICENCIA',
            entidadAfectada: licencia.entidadId?._id,
            autor: req.user._id,
            detalles: `Licencia ${licencia.claveLicencia} renovada hasta ${nuevaFecha.toISOString().split('T')[0]}`,
            req
        });

        res.status(200).json({
            message: 'Licencia renovada exitosamente',
            licencia
        });
    } catch (error) {
        console.error('Error al renovar licencia:', error);
        res.status(400).json({ message: error.message || 'Error al renovar la licencia' });
    }
};

/**
 * @desc    Cambiar estado de una licencia (activa, suspendida, cancelada)
 * @route   PATCH /api/super-admin/licencias/:id/estado
 * @access  Privado (SUPER_ADMIN)
 */
exports.cambiarEstadoLicencia = async (req, res) => {
    try {
        const { estado } = req.body;
        const licencia = await Licencia.findById(req.params.id);
        if (!licencia) {
            return res.status(404).json({ message: 'Licencia no encontrada' });
        }

        licencia.estado = estado;
        await licencia.save();

        // Sincronizar en la entidad
        if (licencia.entidadId) {
            let nuevoEstadoEntidad = 'activa';
            if (estado === 'suspendida') {
                nuevoEstadoEntidad = 'suspendida';
            } else if (estado === 'inactiva' || estado === 'cancelada') {
                nuevoEstadoEntidad = 'inactiva';
            }
            await Entidad.findByIdAndUpdate(licencia.entidadId, {
                estado: nuevoEstadoEntidad
            });
        }

        await registrarAuditoria({
            accion: 'SUSPENDER_LICENCIA',
            entidadAfectada: licencia.entidadId,
            autor: req.user._id,
            detalles: `Licencia ${licencia.claveLicencia} marcada como ${estado}`,
            req
        });

        res.status(200).json(licencia);
    } catch (error) {
        console.error('Error al cambiar estado de licencia:', error);
        res.status(400).json({ message: error.message || 'Error al cambiar estado de la licencia' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. CENTRO DE OPERACIONES & AUDITORÍA GLOBAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Obtener vista del centro de operaciones administrativas
 * @route   GET /api/super-admin/operaciones
 * @access  Privado (SUPER_ADMIN)
 */
exports.getCentroOperaciones = async (req, res) => {
    try {
        const [
            eventosRecientes,
            totalEventosHoy,
            alertasSeguridad,
            entidadesPorVencer
        ] = await Promise.all([
            AuditoriaGlobal.find()
                .sort({ createdAt: -1 })
                .limit(30)
                .populate('autor', 'nombre apellido email rol')
                .populate('entidadAfectada', 'nombre logo NIT')
                .lean(),
            AuditoriaGlobal.countDocuments({
                createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }),
            AuditoriaGlobal.find({
                accion: { $in: ['ALERTA_SISTEMA', 'ARCHIVAR_ENTIDAD', 'SUSPENDER_LICENCIA'] }
            })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('autor', 'nombre email')
                .lean(),
            Entidad.find({
                estado: 'activa',
                fechaVencimiento: {
                    $gte: new Date(),
                    $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            }).select('nombre NIT correo fechaVencimiento').lean()
        ]);

        res.status(200).json({
            eventosRecientes,
            estadisticas: {
                eventosHoy: totalEventosHoy,
                alertasCriticas: alertasSeguridad.length,
                entidadesPorVencerCount: entidadesPorVencer.length
            },
            alertasSeguridad,
            entidadesPorVencer
        });
    } catch (error) {
        console.error('Error en Centro de Operaciones:', error);
        res.status(500).json({ message: 'Error al cargar centro de operaciones' });
    }
};

/**
 * @desc    Consultar bitácora de auditoría global con filtros y paginación
 * @route   GET /api/super-admin/auditoria
 * @access  Privado (SUPER_ADMIN)
 */
exports.getAuditoriaGlobal = async (req, res) => {
    try {
        const { accion, entidadId, limit = 50, page = 1 } = req.query;
        const query = {};

        if (accion && accion !== 'todas') {
            query.accion = accion;
        }

        if (entidadId) {
            query.entidadAfectada = entidadId;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [eventos, total] = await Promise.all([
            AuditoriaGlobal.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate('autor', 'nombre apellido email rol')
                .populate('entidadAfectada', 'nombre NIT logo')
                .lean(),
            AuditoriaGlobal.countDocuments(query)
        ]);

        res.status(200).json({
            eventos,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        console.error('Error al obtener auditoría global:', error);
        res.status(500).json({ message: 'Error al consultar registros de auditoría' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. MONITOREO & SALUD DEL SISTEMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Obtener telemetría y salud del sistema en vivo
 * @route   GET /api/super-admin/monitoreo
 * @access  Privado (SUPER_ADMIN)
 */
exports.getMonitoreo = async (req, res) => {
    try {
        const mem = process.memoryUsage();
        const cpus = os.cpus();

        // Latencia de la BD
        const startDb = Date.now();
        await mongoose.connection.db.admin().ping();
        const dbLatencyMs = Date.now() - startDb;

        const [totalEntidades, totalUsuarios, totalTurnos] = await Promise.all([
            Entidad.countDocuments(),
            Usuario.countDocuments(),
            Turno.countDocuments()
        ]);

        res.status(200).json({
            timestamp: new Date(),
            estadoGeneral: 'OPERACIONAL',
            uptime: {
                segundos: Math.floor(process.uptime()),
                formatoLegible: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m ${Math.floor(process.uptime() % 60)}s`
            },
            memoria: {
                heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
                heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
                rssMB: (mem.rss / 1024 / 1024).toFixed(2),
                sistemaTotalGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
                sistemaLibreGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
                porcentajeUsoSistema: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
            },
            cpu: {
                modelo: cpus[0]?.model || 'N/A',
                nucleos: cpus.length,
                loadAverage: os.loadavg ? os.loadavg() : []
            },
            baseDeDatos: {
                estado: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
                nombreDB: mongoose.connection.name,
                host: mongoose.connection.host,
                latenciaMs: dbLatencyMs
            },
            metricasGlobales: {
                totalEntidades,
                totalUsuarios,
                totalTurnos
            }
        });
    } catch (error) {
        console.error('Error en Monitoreo del sistema:', error);
        res.status(500).json({ message: 'Error al consultar telemetría del sistema' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONFIGURACIÓN GLOBAL SAAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Obtener configuración global de la plataforma
 * @route   GET /api/super-admin/configuracion
 * @access  Privado (SUPER_ADMIN)
 */
exports.getConfiguracionGlobal = async (req, res) => {
    try {
        let config = await ConfiguracionGlobal.findOne().lean();
        if (!config) {
            config = await ConfiguracionGlobal.create({});
        }
        res.status(200).json(config);
    } catch (error) {
        console.error('Error al obtener configuración global:', error);
        res.status(500).json({ message: 'Error al obtener configuración global' });
    }
};

/**
 * @desc    Actualizar configuración global de la plataforma
 * @route   PUT /api/super-admin/configuracion
 * @access  Privado (SUPER_ADMIN)
 */
exports.updateConfiguracionGlobal = async (req, res) => {
    try {
        let config = await ConfiguracionGlobal.findOne();
        if (!config) {
            config = new ConfiguracionGlobal(req.body);
        } else {
            Object.assign(config, req.body);
        }

        const configGuardada = await config.save();

        await registrarAuditoria({
            accion: 'CONFIGURACION_GLOBAL_MODIFICADA',
            autor: req.user._id,
            detalles: 'Configuración global de la plataforma actualizada por SUPER_ADMIN',
            req
        });

        res.status(200).json(configGuardada);
    } catch (error) {
        console.error('Error al actualizar configuración global:', error);
        res.status(400).json({ message: error.message || 'Error al actualizar configuración' });
    }
};
