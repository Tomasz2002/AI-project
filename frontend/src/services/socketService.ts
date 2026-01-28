import { io, Socket } from 'socket.io-client';

const URL = 'http://localhost:3001'; // Adjust if backend runs on different port

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (!this.socket) {
            this.socket = io(URL, {
                transports: ['websocket'],
                autoConnect: true
            });

            console.log('SocketService connecting to:', URL);

            this.socket.on('connect', () => {
                console.log('Connected to socket server');
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from socket server');
            });
        }
        return this.socket;
    }

    getSocket(): Socket {
        if (!this.socket) {
            return this.connect();
        }
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
