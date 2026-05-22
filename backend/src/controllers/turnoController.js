const Turno = require('../models/Turno');
const Tramite = require('../models/Tramite');
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
        let query = {};

        if (estado) query.estado = estado;
        if (tramite) query.tramite = tramite;
        if (prioridad) query.prioridad = prioridad;

        if (buscar) {
            query.codigoTurno = { $regex: buscar, $options: 'i' };
        }

        const turnos = await Turno.find(query)
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido email rol')
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
    try {
        const { fecha } = getLocalDateString();
        
        // Obtener turnos de hoy
        const turnos = await Turno.find({
            fecha: fecha,
            estado: { $in: ['ESPERA', 'ATENDIENDO', 'PAUSADO'] }
        })
        .populate('tramite')
        .populate('usuarioAtencion', 'nombre apellido')
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
        const turno = await Turno.findById(req.params.id)
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido');
            
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado' });
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

        let tramite;
        let finalTramiteId = tramiteId;

        if (tramiteId === 'OTRO') {
            if (!nombreTramitePersonalizado || !nombreTramitePersonalizado.trim()) {
                return res.status(400).json({ message: 'El nombre del trámite personalizado es obligatorio' });
            }
            const nombreNormalizado = nombreTramitePersonalizado.trim();
            // Buscar si ya existe un tramite con ese nombre exacto (insensible a mayúsculas/minúsculas)
            let tramiteExistente = await Tramite.findOne({
                nombre: { $regex: new RegExp(`^${nombreNormalizado.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
            });

            if (!tramiteExistente) {
                // Crear el trámite personalizado inactivo (para que no ensucie el dispensador estándar)
                tramiteExistente = new Tramite({
                    nombre: nombreNormalizado,
                    descripcion: 'Trámite ad-hoc registrado por el Vigilante',
                    tiempoEstimado: 15,
                    estado: false
                });
                await tramiteExistente.save();
            }
            tramite = tramiteExistente;
            finalTramiteId = tramite._id;
        } else {
            tramite = await Tramite.findById(tramiteId);
            if (!tramite) {
                return res.status(404).json({ message: 'El trámite seleccionado no existe' });
            }
        }

        // Obtener prefijo del trámite (primera letra en mayúscula)
        const prefijo = tramite.nombre.trim().charAt(0).toUpperCase() || 'T';

        // Obtener fecha y hora local
        const { fecha, hora } = getLocalDateString();

        // Contar cuántos turnos se han creado hoy para este prefijo
        const countHoy = await Turno.countDocuments({
            fecha: fecha,
            codigoTurno: { $regex: `^${prefijo}-` }
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
            hora
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
            estado: 'ATENDIENDO'
        });

        if (turnoActivoPrevio) {
            turnoActivoPrevio.estado = 'FINALIZADO';
            await turnoActivoPrevio.save();
            socketService.emitTurnoActualizado(turnoActivoPrevio);
        }

        // 2. Buscar el siguiente turno en cola ('ESPERA') de hoy
        // Criterio de prioridad estricto: PRIORITARIO primero, luego NORMAL. Y por fecha de creación (FIFO)
        let siguienteTurno = await Turno.findOne({
            fecha: fecha,
            estado: 'ESPERA',
            prioridad: 'PRIORITARIO'
        }).populate('tramite').sort({ createdAt: 1 });

        if (!siguienteTurno) {
            siguienteTurno = await Turno.findOne({
                fecha: fecha,
                estado: 'ESPERA',
                prioridad: 'NORMAL'
            }).populate('tramite').sort({ createdAt: 1 });
        }

        if (!siguienteTurno) {
            return res.status(404).json({ message: 'No hay más turnos en espera por el día de hoy' });
        }

        // 3. Calcular tiempo de espera en segundos
        const ahora = new Date();
        const creacion = new Date(siguienteTurno.createdAt);
        const diffSegundos = Math.max(0, Math.floor((ahora - creacion) / 1000));

        // 4. Actualizar estado y asignar al operador
        siguienteTurno.estado = 'ATENDIENDO';
        siguienteTurno.usuarioAtencion = req.user._id;
        siguienteTurno.ventanilla = ventanilla;
        siguienteTurno.tiempoEspera = diffSegundos;

        await siguienteTurno.save();

        const turnoActualizado = await Turno.findById(siguienteTurno._id)
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido');

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
        const turno = await Turno.findById(req.params.id);
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado' });
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
        const turno = await Turno.findById(req.params.id);
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado' });
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
        const turno = await Turno.findById(req.params.id);
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado' });
        }

        if (turno.estado !== 'PAUSADO') {
            return res.status(400).json({ message: 'El turno no está pausado' });
        }

        // Finalizar cualquier otro turno que esté en atención de este operador
        const turnoActivoPrevio = await Turno.findOne({
            usuarioAtencion: req.user._id,
            estado: 'ATENDIENDO'
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
        const turno = await Turno.findById(req.params.id);
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado' });
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

// @desc    Transferir/Reasignar turno a otro trámite (Operador)
// @route   PUT /api/turnos/:id/transferir
// @access  Privado (OPERADOR, ADMINISTRADOR)
exports.transferirTurno = async (req, res) => {
    const { nuevoTramiteId } = req.body;

    try {
        if (!nuevoTramiteId) {
            return res.status(400).json({ message: 'El nuevo trámite es obligatorio' });
        }

        const nuevoTramite = await Tramite.findById(nuevoTramiteId);
        if (!nuevoTramite) {
            return res.status(404).json({ message: 'El trámite de destino no existe' });
        }

        const turno = await Turno.findById(req.params.id);
        if (!turno) {
            return res.status(404).json({ message: 'Turno no encontrado' });
        }

        // Actualizar el turno para volver a ponerlo en fila de espera para el nuevo trámite
        turno.tramite = nuevoTramiteId;
        turno.estado = 'ESPERA';
        turno.usuarioAtencion = null;
        turno.ventanilla = null;
        // Mantenemos el código original del turno para no confundir al cliente

        await turno.save();

        const turnoPopulado = await Turno.findById(turno._id)
            .populate('tramite');

        socketService.emitTurnoActualizado(turnoPopulado);
        res.status(200).json(turnoPopulado);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Actualizar un turno (genérico, p.ej. para editar campos por el Admin)
// @route   PUT /api/turnos/:id
// @access  Privado (ADMINISTRADOR)
exports.updateTurno = async (req, res) => {
    try {
        const turnoActualizado = await Turno.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido');

        if (!turnoActualizado) {
            return res.status(404).json({ message: 'Turno no encontrado' });
        }

        socketService.emitTurnoActualizado(turnoActualizado);
        res.status(200).json(turnoActualizado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Eliminar un turno (Admin)
// @route   DELETE /api/turnos/:id
// @access  Privado (ADMINISTRADOR)
exports.deleteTurno = async (req, res) => {
    try {
        const turnoEliminado = await Turno.findByIdAndDelete(req.params.id);
        if (!turnoEliminado) {
            return res.status(404).json({ message: 'Turno no encontrado' });
        }

        if (socketService.getIO()) {
            socketService.getIO().emit('cola_actualizada');
        }

        res.status(200).json({ message: 'Turno eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
