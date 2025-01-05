import express from 'express';
import { slqiteRouter } from './sqliteQuery';
import { contractAddressRouter } from './contractAddressQuery';
import { authentication } from './authentication';
import { verifyWrongData } from './verifyWrongData/verifyWrongData';

const router = express.Router();

router.use('/', slqiteRouter);
router.use('/', contractAddressRouter);
router.use('/', authentication);
router.use('/', verifyWrongData);

export default router;
