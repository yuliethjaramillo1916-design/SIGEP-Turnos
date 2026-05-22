const Turno = require('../models/Turno');
const Tramite = require('../models/Tramite');
const Usuario = require('../models/Usuario');

// Helper para obtener fecha actual local YYYY-MM-DD
const getLocalDateString = () => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzOffset)).toISOString().split('T')[0];
};

// @desc    Obtener estadísticas del día para el Dashboard
// @route   GET /api/reportes/dashboard
// @access  Privado (ADMINISTRADOR, OPERADOR)
exports.getDashboardStats = async (req, res) => {
    try {
        const fechaHoy = getLocalDateString();

        // 1. Obtener todos los turnos de hoy
        const turnosHoy = await Turno.find({ fecha: fechaHoy }).populate('tramite');

        const totalTurnos = turnosHoy.length;
        const enEspera = turnosHoy.filter(t => t.estado === 'ESPERA').length;
        const atendiendo = turnosHoy.filter(t => t.estado === 'ATENDIENDO').length;
        const finalizados = turnosHoy.filter(t => t.estado === 'FINALIZADO').length;
        const cancelados = turnosHoy.filter(t => t.estado === 'CANCELADO').length;
        const pausados = turnosHoy.filter(t => t.estado === 'PAUSADO').length;

        // 2. Calcular tiempo promedio de espera (de turnos que ya fueron atendidos, finalizados o pausados)
        const turnosConEspera = turnosHoy.filter(t => 
            (t.estado === 'ATENDIENDO' || t.estado === 'FINALIZADO' || t.estado === 'PAUSADO') && t.tiempoEspera > 0
        );

        let tiempoEsperaPromedio = 0;
        if (turnosConEspera.length > 0) {
            const sumEspera = turnosConEspera.reduce((acc, t) => acc + t.tiempoEspera, 0);
            tiempoEsperaPromedio = Math.round(sumEspera / turnosConEspera.length); // en segundos
        }

        // 3. Distribución por Trámite
        const tramitesDistribucion = {};
        turnosHoy.forEach(t => {
            const nombreTramite = t.tramite ? t.tramite.nombre : 'Sin Trámite';
            tramitesDistribucion[nombreTramite] = (tramitesDistribucion[nombreTramite] || 0) + 1;
        });

        // 4. Distribución horaria de turnos generados hoy
        const horasDistribucion = Array(24).fill(0);
        turnosHoy.forEach(t => {
            if (t.hora) {
                const horaInt = parseInt(t.hora.split(':')[0]);
                if (horaInt >= 0 && horaInt < 24) {
                    horasDistribucion[horaInt]++;
                }
            }
        });

        res.status(200).json({
            summary: {
                totalTurnos,
                enEspera,
                atendiendo,
                finalizados,
                cancelados,
                pausados,
                tiempoEsperaPromedio // en segundos
            },
            tramitesDistribucion,
            horasDistribucion
        });
    } catch (error) {
        console.error('Error al generar estadísticas del Dashboard:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtener reporte histórico avanzado filtrado por rango de fechas y trámites
// @route   GET /api/reportes/historico
// @access  Privado (ADMINISTRADOR)
exports.getHistoricoReport = async (req, res) => {
    const { fechaInicio, fechaFin, tramiteId } = req.query;

    try {
        let filter = {};

        if (fechaInicio && fechaFin) {
            filter.fecha = { $gte: fechaInicio, $lte: fechaFin };
        } else if (fechaInicio) {
            filter.fecha = { $gte: fechaInicio };
        } else if (fechaFin) {
            filter.fecha = { $lte: fechaFin };
        }

        if (tramiteId) {
            filter.tramite = tramiteId;
        }

        const turnos = await Turno.find(filter)
            .populate('tramite')
            .populate('usuarioAtencion', 'nombre apellido email rol')
            .sort({ createdAt: -1 });

        // Cálculos generales
        const total = turnos.length;
        const finalizados = turnos.filter(t => t.estado === 'FINALIZADO').length;
        const cancelados = turnos.filter(t => t.estado === 'CANCELADO').length;
        const enCola = turnos.filter(t => t.estado === 'ESPERA').length;

        const turnosConEspera = turnos.filter(t => t.tiempoEspera > 0);
        let tiempoEsperaPromedio = 0;
        if (turnosConEspera.length > 0) {
            const sumEspera = turnosConEspera.reduce((acc, t) => acc + t.tiempoEspera, 0);
            tiempoEsperaPromedio = Math.round(sumEspera / turnosConEspera.length);
        }

        res.status(200).json({
            resumen: {
                total,
                finalizados,
                cancelados,
                enCola,
                tiempoEsperaPromedio
            },
            detalles: turnos
        });
    } catch (error) {
        console.error('Error al generar reporte histórico:', error);
        res.status(500).json({ message: error.message });
    }
};
