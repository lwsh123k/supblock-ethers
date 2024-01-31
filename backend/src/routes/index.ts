import express from 'express';
import { slqiteRouter } from './sqliteQuery';

const router = express.Router();

router.use('/', slqiteRouter);

export default router;
