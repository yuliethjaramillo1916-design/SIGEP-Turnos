const { Client } = require('ssh2');

const conn = new Client();

const config = {
    host: '31.97.129.144',
    port: 22,
    username: 'yessica',
    password: '2283',
    readyTimeout: 30000
};

conn.on('ready', () => {
    console.log('🚀 Actualizando y compitiendo la compilación en VPS...');
    
    const cmd = `
        set -e
        echo "=== 1. DESCARGANDO CAMBIOS DEL REPOSITORIO ==="
        cd /home/yessica/proyectos/yessica.online/SIGEP-Turnos
        git config --global --add safe.directory /home/yessica/proyectos/yessica.online/SIGEP-Turnos || true
        git reset --hard HEAD
        git pull origin main

        echo "=== 2. COMPILANDO FRONTEND CON LAS NUEVAS RUTAS DINAMICAS ==="
        cd /home/yessica/proyectos/yessica.online/SIGEP-Turnos/frontend
        npm run build

        echo "=== 3. REINICIANDO SERVICIO PM2 ==="
        pm2 restart sigep-backend || pm2 restart 0
        pm2 list

        echo "✅ DESPLIEGUE FINALIZADO EXITOSAMENTE"
    `;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log(`\nDespliegue finalizado con código: ${code}`);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        }).stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}).on('error', (err) => {
    console.error('❌ Error SSH:', err);
}).connect(config);
