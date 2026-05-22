const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');
const Usuario = require('./models/Usuario');
const Tramite = require('./models/Tramite');
const Configuracion = require('./models/Configuracion');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Conectar a la base de datos
connectDB().then(() => {
    // Sembrar datos iniciales (Seed Data) en segundo plano
    seedInitialData();
});

// Inicializar Socket.io acoplado al servidor HTTP
socketService.init(server);

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api', require('./routes'));

// Ruta base
app.get('/', (req, res) => {
    res.send('SIGEP-Turnos API Profesional en funcionamiento');
});

// Manejo de errores básico
app.use((err, req, res, next) => {
    console.error('Error general del servidor:', err.stack);
    res.status(500).json({ message: 'Algo salió mal en el servidor backend!', error: err.message });
});

// Función para sembrar datos por defecto si la base de datos está vacía
async function seedInitialData() {
    try {
        // 1. Sembrar Administrador por defecto
        const adminCount = await Usuario.countDocuments({ rol: 'ADMINISTRADOR' });
        if (adminCount === 0) {
            console.log('Sembrando usuario administrador por defecto...');
            const defaultAdmin = new Usuario({
                nombre: 'Administrador',
                apellido: 'SIGEP',
                email: 'admin@sigep.com',
                password: 'admin123456', // Se aplicará hash automáticamente por el hook
                rol: 'ADMINISTRADOR',
                estado: true
            });
            await defaultAdmin.save();
            console.log('✅ Usuario Administrador sembrado con éxito: admin@sigep.com / admin123456');
        }

        // Sembrar algunos Operadores y Vigilantes de ejemplo si no hay usuarios en absoluto
        const totalUsers = await Usuario.countDocuments();
        if (totalUsers <= 1) {
            console.log('Sembrando usuarios de ejemplo (operador y vigilante)...');
            const defaultOperador = new Usuario({
                nombre: 'Juan',
                apellido: 'Operador',
                email: 'operador@sigep.com',
                password: 'operador123456',
                rol: 'OPERADOR',
                estado: true
            });
            await defaultOperador.save();

            const defaultVigilante = new Usuario({
                nombre: 'Carlos',
                apellido: 'Vigilante',
                email: 'vigilante@sigep.com',
                password: 'vigilante123456',
                rol: 'VIGILANTE',
                estado: true
            });
            await defaultVigilante.save();
            console.log('✅ Usuarios de ejemplo sembrados: operador@sigep.com y vigilante@sigep.com');
        }

        // 2. Sembrar Trámites por defecto
        const tramitesCount = await Tramite.countDocuments();
        if (tramitesCount === 0) {
            console.log('Sembrando trámites por defecto...');
            const defaultTramites = [
                { nombre: 'Caja', descripcion: 'Pagos, retiros e ingresos de efectivo', tiempoEstimado: 10, estado: true },
                { nombre: 'Atención al Cliente', descripcion: 'Consultas generales, reclamos y apertura de cuentas', tiempoEstimado: 15, estado: true },
                { nombre: 'Soporte Técnico', descripcion: 'Ayuda técnica sobre productos o servicios', tiempoEstimado: 20, estado: true },
                { nombre: 'Urgencias', descripcion: 'Trámites rápidos o de prioridad inmediata', tiempoEstimado: 5, estado: true }
            ];
            await Tramite.insertMany(defaultTramites);
            console.log('✅ Trámites iniciales sembrados con éxito.');
        }

        // 3. Sembrar Configuración por defecto
        const configCount = await Configuracion.countDocuments();
        if (configCount === 0) {
            console.log('Sembrando configuración general por defecto...');
            const defaultConfig = new Configuracion({
                nombre_empresa: 'SIGEP - Gestión de Turnos',
                horario_atencion: '08:00 - 18:00',
                limite_turnos_dia: 200,
                logo: '',
                activo: true
            });
            await defaultConfig.save();
            console.log('✅ Configuración inicial sembrada con éxito.');
        }

    } catch (error) {
        console.error('Error al sembrar datos iniciales:', error);
    }
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
    console.log(`🔴 WebSockets (Socket.io) escuchando conexiones entrantes.`);
});
