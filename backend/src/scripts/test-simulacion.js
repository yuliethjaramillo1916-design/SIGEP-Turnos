const mongoose = require('mongoose');
require('dotenv').config();

async function testInactiva() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Ventanilla = require('../models/Ventanilla');
    const Turno = require('../models/Turno');
    const Usuario = require('../models/Usuario');

    const v1 = await Ventanilla.findOne({ numero: '1' });
    console.log('Estado actual de Ventanilla 1:', v1.estado);

    // Poner inactiva
    v1.estado = 'inactiva';
    await v1.save();
    console.log('-> Cambiado a inactiva con éxito.');

    // Simular llamada a llamarSiguiente con la lógica del controlador
    const req = {
        user: { _id: v1.operador, entidadId: v1.entidadId, ventanilla: v1._id },
        body: { ventanilla: 'Ventanilla 1' }
    };

    let statusCode = null;
    let responseData = null;
    const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { responseData = data; return res; }
    };

    const turnoController = require('../controllers/turnoController');
    await turnoController.llamarSiguiente(req, res);

    console.log('\n--- RESULTADO DE SIMULACIÓN DE LLAMADO ---');
    console.log('Status Code:', statusCode);
    console.log('Respuesta:', responseData);

    if (statusCode === 403) {
        console.log('✅ VALIDACIÓN PERFECTA: El controlador bloqueó el llamado con 403.');
    } else {
        console.log('❌ FALLÓ: No bloqueó como se esperaba.');
    }

    process.exit(0);
}

testInactiva().catch(e => { console.error(e); process.exit(1); });
