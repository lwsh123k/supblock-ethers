import express from 'express';
import { slqiteRouter } from './sqliteQuery';
import { contractAddressRouter } from './contractAddressQuery';

const router = express.Router();

router.use('/', slqiteRouter);
router.use('/', contractAddressRouter);

export default router;
