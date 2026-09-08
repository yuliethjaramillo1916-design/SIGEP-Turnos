const Turno = require('../models/Turno');
const Tramite = require('../models/Tramite');
const Configuracion = require('../models/Configuracion');
const socketService = require('../services/socketService');

// Helper para obtener fecha y hora actual en la zona local del usuario
const getLocalDateString = () => {
    const d = new Date();
    // Offset local en minutos corregido
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString();
    return {
        fecha: localISOTime.split('T')[0], // YYYY-MM-DD
        hora: localISOTime.split('T')[1].split('.')[0] // HH:MM:SS
    };
};

// @desc    Obtener todos los turnos (con filtros de búsqueda)
// @route   GET /api/turnos
// @access  Privado (ADMINISTRADOR, OPERADOR, VIGILANTE)
exports.getTurnos = async (req, res) => {
    try {
        const { estado, tramite, prioridad, buscar } = req.query;
        let query = { entidadId: req.user.entidadId };

        if (estado) query.estado = estado;
        if (tramite) query.tramite = tramite;
        if (prioridad) query.prioridad = prioridad;

        if (buscar) {
            query.codigoTurno = { $regex: buscar, $options: 'i' };
        }

        const turnos = await Turno.find(query)
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido email rol')
            .populate('operadorAsignado', 'nombre apellido email')
            .populate('ventanillaDestino', 'numero nombre')
            .populate('operadorReasigno', 'nombre apellido email')
            .sort({ createdAt: -1 });

        res.status(200).json(turnos);
    } catch (error) {
        console.error('Error al obtener turnos:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtener turnos activos y en espera para la PANTALLA PÚBLICA
// @route   GET /api/turnos/publico
// @access  Público
exports.getTurnosPublico = async (req, res) => {
    // SIN CAMBIOS por petición del usuario: "No continúes con Socket.io ni Pantalla Pública."
    try {
        const { fecha } = getLocalDateString();
        
        // Obtener turnos de hoy
        const turnos = await Turno.find({
            fecha: fecha,
            estado: { $in: ['ESPERA', 'ATENDIENDO', 'PAUSADO'] }
        })
        .populate('tramite')
        .populate({
            path: 'usuarioAtencion',
            select: 'nombre apellido ventanilla',
            populate: { path: 'ventanilla', select: 'numero nombre' }
        })
        .sort({ updatedAt: -1 });

        // Filtrar y estructurar para la pantalla pública
        const enAtencion = turnos.filter(t => t.estado === 'ATENDIENDO');
        const enEspera = turnos.filter(t => t.estado === 'ESPERA').slice(0, 10); // Mostrar máximo 10 en cola
        const pausados = turnos.filter(t => t.estado === 'PAUSADO');

        res.status(200).json({
            enAtencion,
            enEspera,
            pausados
        });
    } catch (error) {
        console.error('Error al obtener turnos públicos:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtener un turno por ID
// @route   GET /api/turnos/:id
// @access  Privado
exports.getTurnoById = async (req, res) => {
    try {
        const turno = await Turno.findOne({ _id: req.params.id, entidadId: req.user.entidadId })
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido');
            
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado o no tiene permisos' });
        }
        res.status(200).json(turno);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Crear/Generar un nuevo turno (Vigilante/Administrador)
// @route   POST /api/turnos
// @access  Privado
exports.createTurno = async (req, res) => {
    const { tramite: tramiteId, nombreTramitePersonalizado, prioridad, motivoPrioridad } = req.body;

    try {
        if (!tramiteId) {
            return res.status(400).json({ message: 'El trámite es obligatorio' });
        }

        // ── Verificar límite diario de turnos ──────────────────────────
        const config = await Configuracion.findOne({ entidadId: req.user.entidadId });

        if (config) {
            // Verificar si el sistema está activo
            if (config.activo === false) {
                return res.status(403).json({ message: 'El sistema de turnos está suspendido. Contacte al administrador.' });
            }

            // Verificar límite de turnos del día
            const { fecha: fechaHoy } = getLocalDateString();
            const totalHoy = await Turno.countDocuments({ fecha: fechaHoy, entidadId: req.user.entidadId });

            if (config.limite_turnos_dia && totalHoy >= config.limite_turnos_dia) {
                return res.status(429).json({
                    message: `Se alcanzó el límite diario de ${config.limite_turnos_dia} turnos. No se pueden emitir más tickets por hoy.`
                });
            }
        }
        // ──────────────────────────────────────────────────────────────

        let tramite;
        let finalTramiteId = tramiteId;

        if (tramiteId === 'OTRO') {
            if (!nombreTramitePersonalizado || !nombreTramitePersonalizado.trim()) {
                return res.status(400).json({ message: 'El nombre del trámite personalizado es obligatorio' });
            }
            const nombreNormalizado = nombreTramitePersonalizado.trim();
            // Buscar si ya existe un tramite con ese nombre exacto (insensible a mayúsculas/minúsculas)
            let tramiteExistente = await Tramite.findOne({
                nombre: { $regex: new RegExp(`^${nombreNormalizado.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') },
                entidadId: req.user.entidadId
            });

            if (!tramiteExistente) {
                // Crear el trámite personalizado inactivo (para que no ensucie el dispensador estándar)
                tramiteExistente = new Tramite({
                    nombre: nombreNormalizado,
                    descripcion: 'Trámite ad-hoc registrado por el Vigilante',
                    tiempoEstimado: 15,
                    estado: false,
                    entidadId: req.user.entidadId
                });
                await tramiteExistente.save();
            }
            tramite = tramiteExistente;
            finalTramiteId = tramite._id;
        } else {
            tramite = await Tramite.findOne({ _id: tramiteId, entidadId: req.user.entidadId });
            if (!tramite) {
                return res.status(404).json({ message: 'El trámite seleccionado no existe o no tiene permisos' });
            }
        }

        // Obtener prefijo del trámite (primera letra en mayúscula)
        const prefijo = tramite.nombre.trim().charAt(0).toUpperCase() || 'T';

        // Obtener fecha y hora local
        const { fecha, hora } = getLocalDateString();

        // Contar cuántos turnos se han creado hoy para este prefijo
        const countHoy = await Turno.countDocuments({
            fecha: fecha,
            codigoTurno: { $regex: `^${prefijo}-` },
            entidadId: req.user.entidadId
        });

        const consecutivo = String(countHoy + 1).padStart(3, '0');
        const codigoTurno = `${prefijo}-${consecutivo}`;

        const nuevoTurno = new Turno({
            codigoTurno,
            tramite: finalTramiteId,
            estado: 'ESPERA',
            prioridad: prioridad || 'NORMAL',
            motivoPrioridad: prioridad === 'PRIORITARIO' ? motivoPrioridad : null,
            fecha,
            hora,
            entidadId: req.user.entidadId
        });

        const turnoGuardado = await nuevoTurno.save();
        const turnoPopulado = await Turno.findById(turnoGuardado._id).populate('tramite');

        // Notificar por websockets
        socketService.emitTurnoCreado(turnoPopulado);

        res.status(201).json(turnoPopulado);
    } catch (error) {
        console.error('Error al crear turno:', error);
        res.status(400).json({ message: error.message });
    }
};

// @desc    Llamar al siguiente turno en la fila (Operador)
// @route   POST /api/turnos/llamar-siguiente
// @access  Privado (OPERADOR, ADMINISTRADOR)
exports.llamarSiguiente = async (req, res) => {
    const { ventanilla } = req.body;

    try {
        if (!ventanilla) {
            return res.status(400).json({ message: 'Debe especificar su ventanilla para llamar un turno' });
        }

        const { fecha } = getLocalDateString();

        // 1. Si el operador ya tiene un turno "ATENDIENDO", finalizarlo automáticamente
        const turnoActivoPrevio = await Turno.findOne({
            usuarioAtencion: req.user._id,
            estado: 'ATENDIENDO',
            entidadId: req.user.entidadId
        });

        if (turnoActivoPrevio) {
            turnoActivoPrevio.estado = 'FINALIZADO';
            await turnoActivoPrevio.save();
            socketService.emitTurnoActualizado(turnoActivoPrevio);
        }

        // 2. Buscar el siguiente turno en cola ('ESPERA') de hoy
        const Ventanilla = require('../models/Ventanilla');
        const miVentanillaObj = await Ventanilla.findOne({ operador: req.user._id, entidadId: req.user.entidadId });

        // PRIORIDAD 1 (MÁXIMA): Turnos reasignados específicamente a este operador o a su ventanilla (FIFO)
        const reasignadoQueries = [{ operadorAsignado: req.user._id }];
        if (miVentanillaObj) {
            reasignadoQueries.push({ ventanillaDestino: miVentanillaObj._id });
        }

        let siguienteTurno = await Turno.findOne({
            fecha: fecha,
            estado: 'ESPERA',
            entidadId: req.user.entidadId,
            $or: reasignadoQueries
        }).populate('tramite').sort({ createdAt: 1 });

        // Condiciones de exclusión para turnos generales:
        // No tomar turnos reservados a OTRO operador o a OTRA ventanilla
        const exclusionFiltro = [
            { operadorAsignado: null, ventanillaDestino: null },
            { operadorAsignado: { $exists: false }, ventanillaDestino: { $exists: false } },
            { operadorAsignado: req.user._id }
        ];
        if (miVentanillaObj) {
            exclusionFiltro.push({ ventanillaDestino: miVentanillaObj._id });
        }

        // PRIORIDAD 2: Turno PRIORITARIO general
        if (!siguienteTurno) {
            siguienteTurno = await Turno.findOne({
                fecha: fecha,
                estado: 'ESPERA',
                prioridad: 'PRIORITARIO',
                entidadId: req.user.entidadId,
                $or: exclusionFiltro
            }).populate('tramite').sort({ createdAt: 1 });
        }

        // PRIORIDAD 3: Turno NORMAL general
        if (!siguienteTurno) {
            siguienteTurno = await Turno.findOne({
                fecha: fecha,
                estado: 'ESPERA',
                prioridad: 'NORMAL',
                entidadId: req.user.entidadId,
                $or: exclusionFiltro
            }).populate('tramite').sort({ createdAt: 1 });
        }

        if (!siguienteTurno) {
            return res.status(404).json({ message: 'No hay más turnos en espera por el día de hoy' });
        }

        // 3. Calcular tiempo de espera en segundos
        const ahora = new Date();
        const creacion = new Date(siguienteTurno.createdAt);
        const diffSegundos = Math.max(0, Math.floor((ahora - creacion) / 1000));

        // 4. Resolver nombre descriptivo de la ventanilla si viene genérico o sin número
        let ventanillaFinal = ventanilla;
        const Ventanilla = require('../models/Ventanilla');
        if (!ventanillaFinal || ventanillaFinal.trim().toLowerCase() === 'ventanilla' || /^\d+$/.test(ventanillaFinal.trim())) {
            const vObj = await Ventanilla.findOne({ operador: req.user._id, entidadId: req.user.entidadId });
            if (vObj) {
                const nom = vObj.nombre ? vObj.nombre.trim() : '';
                const num = vObj.numero ? String(vObj.numero).trim() : '';
                if (!nom || /^(ventanilla|modulo|módulo)$/i.test(nom)) {
                    ventanillaFinal = num ? `Ventanilla ${num}` : 'Ventanilla 1';
                } else if (num && nom.includes(num)) {
                    ventanillaFinal = nom;
                } else {
                    ventanillaFinal = num ? `Ventanilla ${num} - ${nom}` : nom;
                }
            } else if (ventanillaFinal && /^\d+$/.test(ventanillaFinal.trim())) {
                ventanillaFinal = `Ventanilla ${ventanillaFinal.trim()}`;
            }
        }

        siguienteTurno.estado = 'ATENDIENDO';
        siguienteTurno.usuarioAtencion = req.user._id;
        siguienteTurno.ventanilla = ventanillaFinal || 'Ventanilla 1';
        siguienteTurno.tiempoEspera = diffSegundos;

        await siguienteTurno.save();

        const turnoActualizado = await Turno.findById(siguienteTurno._id)
            .populate('tramite')
            .populate({
                path: 'usuarioAtencion',
                select: 'nombre apellido ventanilla',
                populate: { path: 'ventanilla', select: 'numero nombre' }
            });

        // Notificar por websockets el llamado
        socketService.emitTurnoLlamado(turnoActualizado);

        res.status(200).json(turnoActualizado);
    } catch (error) {
        console.error('Error al llamar siguiente turno:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Finalizar turno activo (Operador)
// @route   PUT /api/turnos/:id/finalizar
// @access  Privado (OPERADOR, ADMINISTRADOR)
exports.finalizarTurno = async (req, res) => {
    try {
        const turno = await Turno.findOne({ _id: req.params.id, entidadId: req.user.entidadId });
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado o sin permisos' });
        }

        if (turno.estado !== 'ATENDIENDO' && turno.estado !== 'PAUSADO') {
            return res.status(400).json({ message: 'El turno no está siendo atendido o pausado actualmente' });
        }

        turno.estado = 'FINALIZADO';
        await turno.save();

        const turnoPopulado = await Turno.findById(turno._id)
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido');

        socketService.emitTurnoActualizado(turnoPopulado);
        res.status(200).json(turnoPopulado);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Poner turno en pausa (Operador)
// @route   PUT /api/turnos/:id/pausar
// @access  Privado (OPERADOR, ADMINISTRADOR)
exports.pausarTurno = async (req, res) => {
    try {
        const turno = await Turno.findOne({ _id: req.params.id, entidadId: req.user.entidadId });
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado o sin permisos' });
        }

        if (turno.estado !== 'ATENDIENDO') {
            return res.status(400).json({ message: 'El turno debe estar en atención para pausarlo' });
        }

        turno.estado = 'PAUSADO';
        await turno.save();

        const turnoPopulado = await Turno.findById(turno._id)
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido');

        socketService.emitTurnoActualizado(turnoPopulado);
        res.status(200).json(turnoPopulado);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reanudar turno pausado (Operador)
// @route   PUT /api/turnos/:id/reanudar
// @access  Privado (OPERADOR, ADMINISTRADOR)
exports.reanudarTurno = async (req, res) => {
    try {
        const turno = await Turno.findOne({ _id: req.params.id, entidadId: req.user.entidadId });
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado o sin permisos' });
        }

        if (turno.estado !== 'PAUSADO') {
            return res.status(400).json({ message: 'El turno no está pausado' });
        }

        // Finalizar cualquier otro turno que esté en atención de este operador
        const turnoActivoPrevio = await Turno.findOne({
            usuarioAtencion: req.user._id,
            estado: 'ATENDIENDO',
            entidadId: req.user.entidadId
        });

        if (turnoActivoPrevio) {
            turnoActivoPrevio.estado = 'FINALIZADO';
            await turnoActivoPrevio.save();
            socketService.emitTurnoActualizado(turnoActivoPrevio);
        }

        turno.estado = 'ATENDIENDO';
        await turno.save();

        const turnoPopulado = await Turno.findById(turno._id)
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido');

        socketService.emitTurnoLlamado(turnoPopulado);
        res.status(200).json(turnoPopulado);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancelar turno (Operador o Administrador o Vigilante)
// @route   PUT /api/turnos/:id/cancelar
// @access  Privado
exports.cancelarTurno = async (req, res) => {
    try {
        const turno = await Turno.findOne({ _id: req.params.id, entidadId: req.user.entidadId });
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado o sin permisos' });
        }

        turno.estado = 'CANCELADO';
        await turno.save();

        const turnoPopulado = await Turno.findById(turno._id)
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido');

        socketService.emitTurnoActualizado(turnoPopulado);
        res.status(200).json(turnoPopulado);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtener lista de operadores activos para reasignación
// @route   GET /api/turnos/operadores-disponibles
// @access  Privado (OPERADOR, ADMINISTRADOR)
exports.getOperadoresDisponibles = async (req, res) => {
    try {
        const Usuario = require('../models/Usuario');
        const operadores = await Usuario.find({
            entidadId: req.user.entidadId,
            rol: 'OPERADOR',
            estado: true
        })
        .select('nombre apellido email ventanilla')
        .populate('ventanilla', 'numero nombre')
        .sort({ nombre: 1 });

        res.status(200).json(operadores);
    } catch (error) {
        console.error('Error al obtener operadores disponibles:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Transferir/Reasignar turno a otro operador o ventanilla (Operador)
// @route   PUT /api/turnos/:id/transferir
// @access  Privado (OPERADOR, ADMINISTRADOR)
exports.transferirTurno = async (req, res) => {
    const { nuevoTramiteId, operadorDestinoId, ventanillaDestinoId, motivo } = req.body;

    try {
        const turno = await Turno.findOne({ _id: req.params.id, entidadId: req.user.entidadId });
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado o sin permisos' });
        }

        // Si se cambia de trámite
        if (nuevoTramiteId) {
            const nuevoTramite = await Tramite.findOne({ _id: nuevoTramiteId, entidadId: req.user.entidadId });
            if (!nuevoTramite) {
                return res.status(404).json({ message: 'El trámite de destino no existe o sin permisos' });
            }
            turno.tramite = nuevoTramiteId;
        }

        const Usuario = require('../models/Usuario');
        const Ventanilla = require('../models/Ventanilla');

        let opDestinoFinal = null;
        let vDestinoFinal = null;

        // Si se seleccionó una ventanilla de destino
        if (ventanillaDestinoId) {
            const vObj = await Ventanilla.findOne({ _id: ventanillaDestinoId, entidadId: req.user.entidadId }).populate('operador');
            if (vObj) {
                vDestinoFinal = vObj._id;
                if (vObj.operador) {
                    opDestinoFinal = vObj.operador._id || vObj.operador;
                }
            }
        }

        // Si se seleccionó directamente un operador
        if (operadorDestinoId && !opDestinoFinal) {
            const opObj = await Usuario.findOne({ _id: operadorDestinoId, entidadId: req.user.entidadId });
            if (opObj) {
                opDestinoFinal = opObj._id;
                if (opObj.ventanilla) {
                    vDestinoFinal = opObj.ventanilla;
                }
            }
        }

        if (opDestinoFinal || vDestinoFinal) {
            turno.operadorAsignado = opDestinoFinal;
            turno.ventanillaDestino = vDestinoFinal;
            turno.esReasignado = true;
            turno.operadorReasigno = req.user._id;
            turno.motivoReasignacion = motivo ? motivo.trim() : 'Reasignado por operador';
        } else {
            turno.operadorAsignado = null;
            turno.ventanillaDestino = null;
            turno.esReasignado = false;
            turno.motivoReasignacion = null;
            turno.operadorReasigno = req.user._id;
        }

        // Devolver el turno a fila de espera
        turno.estado = 'ESPERA';
        turno.usuarioAtencion = null;
        turno.ventanilla = null;

        await turno.save();

        const turnoPopulado = await Turno.findById(turno._id)
            .populate('tramite')
            .populate('operadorAsignado', 'nombre apellido')
            .populate('ventanillaDestino', 'numero nombre')
            .populate('operadorReasigno', 'nombre apellido');

        socketService.emitTurnoActualizado(turnoPopulado);
        res.status(200).json(turnoPopulado);
    } catch (error) {
        console.error('Error al transferir turno:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Actualizar un turno (genérico, p.ej. para editar campos por el Admin)
// @route   PUT /api/turnos/:id
// @access  Privado (ADMINISTRADOR)
exports.updateTurno = async (req, res) => {
    try {
        const turnoActualizado = await Turno.findOneAndUpdate(
            { _id: req.params.id, entidadId: req.user.entidadId },
            req.body,
            { new: true }
        ).populate('tramite').populate('usuarioAtencion', 'nombre apellido');

        if (!turnoActualizado) {
            return res.status(404).json({ message: 'Turno no encontrado o sin permisos' });
        }

        socketService.emitTurnoActualizado(turnoActualizado);
        res.status(200).json(turnoActualizado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Eliminar todos los turnos de una fecha específica (Admin)
// @route   DELETE /api/turnos/por-fecha/:fecha
// @access  Privado (ADMINISTRADOR)
exports.deleteTurnosPorFecha = async (req, res) => {
    try {
        const { fecha } = req.params; // formato YYYY-MM-DD

        if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ message: 'Formato de fecha inválido. Use YYYY-MM-DD' });
        }

        // Buscar turnos cuyo campo "fecha" coincida, o cuyo createdAt caiga en ese día
        const inicio = new Date(`${fecha}T00:00:00.000Z`);
        const fin    = new Date(`${fecha}T23:59:59.999Z`);

        const resultado = await Turno.deleteMany({
            entidadId: req.user.entidadId,
            $or: [
                { fecha: fecha },
                { createdAt: { $gte: inicio, $lte: fin } }
            ]
        });

        if (socketService.getIO()) {
            socketService.getIO().emit('cola_actualizada');
        }

        res.status(200).json({
            message: `Se eliminaron ${resultado.deletedCount} turno(s) del ${fecha}`,
            eliminados: resultado.deletedCount
        });
    } catch (error) {
        console.error('Error al eliminar turnos por fecha:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Eliminar un turno (Admin)
// @route   DELETE /api/turnos/:id
// @access  Privado (ADMINISTRADOR)
exports.deleteTurno = async (req, res) => {
    try {
        const turnoEliminado = await Turno.findOneAndDelete({ _id: req.params.id, entidadId: req.user.entidadId });
        if (!turnoEliminado) {
            return res.status(404).json({ message: 'Turno no encontrado o sin permisos' });
        }

        if (socketService.getIO()) {
            socketService.getIO().emit('cola_actualizada');
        }

        res.status(200).json({ message: 'Turno eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
