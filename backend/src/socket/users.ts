import { Socket } from 'socket.io';

export const onlineUsers: { [propName: string]: Socket } = {};
