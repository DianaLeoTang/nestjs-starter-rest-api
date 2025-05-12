import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as winston from 'winston';

// 加载.env文件中的环境变量
config();

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// 生成随机密码的函数
const generateRandomPassword = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// 哈希密码的函数
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// 创建随机用户的函数
const createRandomUser = async (index: number) => {
  const firstName = `User${index}`;
  const lastName = `Test${index}`;
  const email = `user${index}@example.com`;
  const password = generateRandomPassword();
  const hashedPassword = await hashPassword(password);
  
  // 记录创建的用户信息用于测试
  logger.info(`Created user: ${email} with password: ${password}`);
  
  return {
    id: uuidv4(),
    firstName,
    lastName,
    email,
    password: hashedPassword, // 存储哈希密码
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: ['user'] // 假设你的用户实体有roles字段
  };
};

async function createBulkUsers(userCount = 50) {
  logger.info(`开始创建 ${userCount} 个用户...`);

  // 使用环境变量创建新的数据库连接
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'root',        // 注意这里使用DB_USER而不是DB_USERNAME
    password: process.env.DB_PASS || 'example',     // 注意这里使用DB_PASS而不是DB_PASSWORD
    database: process.env.DB_NAME || 'example_db',  // 注意这里使用DB_NAME而不是DB_DATABASE
    ssl: false, // 假设Docker本地部署不需要SSL
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    // 初始化连接
    await dataSource.initialize();
    logger.info('✅ 数据库连接建立成功!');

    // 查找用户表的名称（可能是'user'或'users'）
    const userTableQuery = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name = 'user' OR table_name = 'users')
    `);

    if (userTableQuery.length === 0) {
      throw new Error('未找到用户表。请确保已运行数据库迁移。');
    }

    const userTableName = userTableQuery[0].table_name;
    logger.info(`找到用户表: ${userTableName}`);

    // 批量创建用户以避免内存问题
    const batchSize = 10;
    const batches = Math.ceil(userCount / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, userCount);
      logger.info(`处理批次 ${batch + 1}/${batches} (用户 ${start + 1}-${end})`);

      // 创建一批用户
      const usersToCreate = [];
      for (let i = start; i < end; i++) {
        usersToCreate.push(await createRandomUser(i + 1));
      }

      // 将用户插入数据库
      // 使用queryRunner启用事务
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        for (const user of usersToCreate) {
          // 从用户对象中提取列和值
          const columns = Object.keys(user).join(', ');
          const placeholders = Object.keys(user).map((_, idx) => `$${idx + 1}`).join(', ');
          
          // 为了解决类型错误，明确处理每种类型
          const paramValues = Object.values(user).map(value => {
            if (value === null) return null;
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value;
            if (value instanceof Date) return value;
            if (Array.isArray(value)) return JSON.stringify(value);
            return String(value);
          });

          await queryRunner.query(
            `INSERT INTO "${userTableName}" (${columns}) VALUES (${placeholders})`,
            paramValues
          );
        }
        
        await queryRunner.commitTransaction();
        logger.info(`✅ 成功插入 ${usersToCreate.length} 个用户`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    // 获取总数以确认
    const totalCount = await dataSource.query(`SELECT COUNT(*) FROM "${userTableName}"`);
    logger.info(`✅ 数据库中的总用户数: ${totalCount[0].count}`);

    // 关闭连接
    await dataSource.destroy();
    logger.info('✅ 操作成功完成!');
    
    return true;
  } catch (error) {
    logger.error('❌ 操作失败，错误:');
    logger.error(error);
    return false;
  }
}

// 自执行异步函数
(async () => {
  try {
    const success = await createBulkUsers();
    
    // 使用适当的代码退出
    process.exit(success ? 0 : 1);
  } catch (error) {
    logger.error('意外错误:', error);
    process.exit(1);
  }
})();
