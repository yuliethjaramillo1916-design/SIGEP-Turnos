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
    const cmd = `head -n 50 /home/yessica/proyectos/yessica.online/SIGEP-Turnos/frontend/src/App.jsx || true`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data);
        });
    });
}).connect(config);
