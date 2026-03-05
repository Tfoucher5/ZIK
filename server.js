// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public')); // Pour servir ton dossier frontend

const TRACK_DATABASE = [
    { id: 'kJQP7kiw5Fk', duration: 240, title: 'Architects - Animals' },
    { id: 'XHeW_vK-RXI', duration: 180, title: 'PLK - Gare du Nord' }
];

io.on('connection', (socket) => {
    console.log('Un joueur est connecté');

    socket.on('request_new_round', () => {
        const track = TRACK_DATABASE[Math.floor(Math.random() * TRACK_DATABASE.length)];
        
        // On définit un départ aléatoire (au moins 30s avant la fin)
        const randomStart = Math.floor(Math.random() * (track.duration - 30));

        // On envoie l'ordre à TOUT LE MONDE
        io.emit('start_round', {
            videoId: track.id,
            startTime: randomStart
        });
    });
});

http.listen(3000, () => console.log('Testeur lancé sur http://localhost:3000'));