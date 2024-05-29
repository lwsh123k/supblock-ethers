import { pino } from 'pino';
import * as dotenv from 'dotenv';
dotenv.config();

// 默认异步传输
const transport = pino.transport({
    // pino-pretty 用于美化日志输出, 使其更易于阅读
    // pino/file 用于将日志写入到文件中
    target: 'pino-pretty',
    options: {
        colorize: true, // 启用颜色输出
        destination: 1, // 指定输出目的地, 1表示标准输出
        translateTime: 'yyyy-mm-dd HH:MM:ss.l', // 格式化时间
        ignore: 'pid,hostname', // 忽略不需要的字段
    },
});

// 'fatal', 'error', 'warn', 'info', 'debug', 'trace' or 'silent'.
const baseLogger = pino(
    {
        // The minimum level to log: Pino will not log messages with a lower level
        // 记录的最低级别, 低于这个级别的不会被记录
        level: process.env.LOG_LEVEL || 'info',
    },
    transport
);

export const logger = baseLogger.child({});
