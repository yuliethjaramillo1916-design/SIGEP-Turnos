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
    }
};
