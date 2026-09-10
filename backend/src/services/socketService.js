let io;

module.exports = {
    init: (server) => {
        const { Server } = require('socket.io');
        io = new Server(server, {
            cors: {
                origin: '*', // Permitir conexiones desde cualquier origen en desarrollo
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                credentials: true
            }
        });

        io.on('connection', (socket) => {
            console.log(`Cliente conectado por WebSocket: ${socket.id}`);

            // Permitir al cliente unirse a la sala de su entidad para notificaciones dirigidas
            socket.on('join_entidad', (entidadId) => {
                if (entidadId) {
                    socket.join(`entidad_${entidadId}`);
                }
            });

            socket.on('disconnect', () => {
                console.log(`Cliente desconectado: ${socket.id}`);
            });
        });

        return io;
    },

    getIO: () => {
        if (!io) {
            console.warn('Socket.io no ha sido inicializado aún!');
        }
        return io;
    },

    // Métodos helpers para notificar eventos comunes
    emitTurnoCreado: (turno) => {
        if (io) {
            io.emit('turno_creado', turno);
            io.emit('cola_actualizada');
        }
    },

    emitTurnoLlamado: (turno) => {
        if (io) {
            io.emit('turno_llamado', turno);
            io.emit('cola_actualizada');
        }
    },

    emitTurnoActualizado: (turno) => {
        if (io) {
            io.emit('turno_actualizado', turno);
            io.emit('cola_actualizada');
        }
    },

    emitVentanillaActualizada: (ventanilla) => {
        if (io) {
            io.emit('ventanilla_actualizada', ventanilla);
        }
    },

    // Notificación en tiempo real de inicio / cierre de sesión para administradores de la entidad
    emitNotificacionSesion: (entidadId, notificacion) => {
        if (io) {
            if (entidadId) {
                io.to(`entidad_${entidadId}`).emit('notificacion_sesion', notificacion);
            }
            // También emitir broadcast general con entidadId para clientes conectados
            io.emit('notificacion_sesion', notificacion);
        }
    }
};

