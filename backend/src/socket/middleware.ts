import { Socket } from 'socket.io';
import { onlineUsers } from './users';
import { ethers } from 'ethers';
import { authString } from '../routes/authentication';
import { logger } from '../util/logger';
import { ExtendedError } from 'socket.io/dist/namespace';

type AuthInfo = {
    address: string;
    signedAuthString: string;
};

export function useAuthMiddleware(socket: Socket, next: (err?: ExtendedError | undefined) => void) {
    const info = socket.handshake.query as AuthInfo;
    // console.log(socket.handshake);
    let address = info.address;
    if (address === 'plugin') {
        logger.info(`user ${address} join`);
        onlineUsers[address] = socket;
        // next();
    } else {
        let signedAuthString = info.signedAuthString;
        if (address && authString.has(address) && signedAuthString) {
            let res =
                address ===
                ethers.utils.verifyMessage(authString.get(address) as string, signedAuthString);
            if (res) {
                logger.info(`user ${address} join`);
                onlineUsers[address] = socket;
                // next();
            }
        }
    }
    // for testing, always have user get reconnected
    next();
}
