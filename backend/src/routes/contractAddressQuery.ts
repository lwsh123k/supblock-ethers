import express from 'express';
import address from '../contract-interaction/contract-address.json';

const contractAddressRouter = express.Router();

// get public key and address
contractAddressRouter.get('/getContractAddress', async (req, res) => {
    res.send(address);
});

export { contractAddressRouter };
