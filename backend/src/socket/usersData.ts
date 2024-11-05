import { Socket } from 'socket.io';
import { SignedAddress } from './types';

export const onlineUsers: { [propName: string]: Socket } = {};
export const userSig: Map<string, SignedAddress> = new Map();
export const chainNumber = 3;
