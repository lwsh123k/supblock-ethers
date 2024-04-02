import express from 'express';
import { slqiteRouter } from './sqliteQuery';
import { contractAddressRouter } from './contractAddressQuery';
import { authentication } from './authentication';

const router = express.Router();

router.use('/', slqiteRouter);
router.use('/', contractAddressRouter);
router.use('/', authentication);

export default router;
