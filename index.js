const express = require ('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const randomString = require('randomstring');
const dotenv = require('dotenv').config();
const port = process.env.PORT || 3000;

// template of users' object:
// userId: socket.id
// username: depends on the user
// roomNumber: depends if creating or joining
const users = [];

app.use(express.static("public"));

// checks for client connecting to server
io.on('connection', (socket) => {
    users.push({ id: socket.id });

    // login events
    socket.on('create-room-attempt', (username) => {
        const userIndex = users.findIndex(user => user.id === socket.id);
        let roomCode = randomString.generate({
            length: 4,
            charset: 'numeric'
        });

        // check if roomCode already exists
        while (users.findIndex(user => user.roomCode === roomCode) !== -1) {
            roomCode = randomString.generate({
                length: 4,
                charset: 'numeric'
            });
        }

        // update user array with the needed data
        if (userIndex !== -1) {
            users[userIndex].username = username;
            users[userIndex].roomCode = roomCode;
            socket.join(roomCode);
            socket.emit('create-room-successful', username, roomCode);
            io.to(roomCode).emit('create-room-notification', username, roomCode, users.filter(user => user.roomCode === roomCode));
        } else {
            socket.emit('create-room-failed');
        }
    });

    socket.on('join-room-attempt', (username, roomCode) => {
        const userIndex = users.findIndex(user => user.id === socket.id);

        // check if (1) room does not exist, (2) username is already taken in room
        // (3) successful login, (4) just a general error
        if (users.findIndex(user => user.roomCode === roomCode) === -1) {
            socket.emit('join-room-failed', 'room does not exist');
        } else if (users.findIndex(user => user.username === username && user.roomCode === roomCode) !== -1) {
            socket.emit('join-room-failed', 'username already exists in room');
        } else if (userIndex !== -1) {
            users[userIndex].username = username;
            users[userIndex].roomCode = roomCode;
            socket.join(roomCode);
            socket.emit('join-room-successful', username, roomCode);
            console.log(username, 'has entered room', roomCode, users);
            io.to(roomCode).emit('join-room-notification', username, roomCode, users.filter(user => user.roomCode === roomCode));
        } else {
            socket.emit('join-room-failed', 'join room failed');
        }
    });

    // chat room events
    socket.on('leave-room-attempt', () => {
        const userIndex = users.findIndex(user => user.id === socket.id);

        // update user data (remove roomCode)
        if (userIndex !== -1) {
            const username = users[userIndex].username;
            const roomCode = users[userIndex].roomCode;

            delete users[userIndex].username;
            delete users[userIndex].roomCode;

            socket.leave(roomCode);
            socket.emit('leave-room-successful', username, roomCode);
            console.log(username, 'has left room', roomCode, users);
            io.to(roomCode).emit('leave-room-notification', username, roomCode, users.filter(user => user.roomCode === roomCode));
        } else {
            socket.emit('leave-room-failed');
        }
    });

    socket.on('message-to-server', (message) => {
        const userIndex = users.findIndex(user => user.id === socket.id);
        const roomCode = users[userIndex].roomCode;
        const username = users[userIndex].username;

        // broadcast message to everyone in room
        io.to(roomCode).emit('message-from-server', username, message, socket.id);
    })

    // disconnected from server
    socket.on('disconnect', () => {
        const userIndex = users.findIndex(user => user.id === socket.id);
        const username = users[userIndex].username;
        const roomCode = users[userIndex].roomCode;

        // remove user from users array
        users.splice(userIndex, 1);

        // notify everyone in room that user has left
        if (username && roomCode) {
            io.to(roomCode).emit('leave-room-notification', username, roomCode, users.filter(user => user.roomCode === roomCode));   
        }
    });
});

server.listen(port, () => {
    console.log('listening on port ' + port);
});