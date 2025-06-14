// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = 3000;

app.use(express.static(path.join(__dirname)));

let users = new Map();   // phone => socket.id
let adminSocket = null;

io.on('connection', socket => {
  console.log('🔌 New connection:', socket.id);

  socket.on('user-joined', ({ phone }) => {
    users.set(phone, socket.id);
    console.log('👤 User joined:', phone);
    if (adminSocket) {
      adminSocket.emit('user-list', Array.from(users.keys()));
    }
  });

  socket.on('user-message', ({ phone, message }) => {
    console.log(`💬 Message from ${phone}: ${message}`);

    if (adminSocket) {
      adminSocket.emit('new-message', { phone, message, from: 'user' });
    }
  });

  socket.on('admin-login', ({ phone, password }) => {
    if (phone === '9870914365' && password === 'admin@123') {
      adminSocket = socket;
      socket.emit('admin-login-success');
      socket.emit('user-list', Array.from(users.keys()));
      console.log('✅ Admin logged in');
    } else {
      socket.emit('admin-login-failed', 'Invalid phone or password');
    }
  });

  socket.on('admin-message', ({ phone, message }) => {
    const userSocketId = users.get(phone);
    if (userSocketId) {
      io.to(userSocketId).emit('admin-message', { phone, message });
      socket.emit('new-message', { phone, message, from: 'admin' });
    }
  });

  socket.on('disconnect', () => {
    if (socket === adminSocket) {
      console.log('⚠️ Admin disconnected');
      adminSocket = null;
    }

    for (let [phone, id] of users.entries()) {
      if (id === socket.id) {
        users.delete(phone);
        console.log('❌ User left:', phone);
        if (adminSocket) {
          adminSocket.emit('user-list', Array.from(users.keys()));
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
