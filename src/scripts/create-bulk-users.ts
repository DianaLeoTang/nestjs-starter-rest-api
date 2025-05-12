import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as winston from 'winston';

// 加载.env文件中的环境变量
config();

// 定义接口
interface TableInfo {
  table_name: string;
}

interface ColumnInfo {
  column_name: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
  [key: string]: any;
}

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

async function listTablesAndCreateUsers() {
  // 使用环境变量创建新的数据库连接
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'example',
    database: process.env.DB_NAME || 'example_db',
    ssl: false,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    // 初始化连接
    await dataSource.initialize();
    logger.info('✅ 数据库连接建立成功!');

    // 列出所有表
    const tables = (await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)) as TableInfo[];

    logger.info('可用的表:');
    tables.forEach((table: TableInfo, index: number) => {
      logger.info(`${index + 1}. ${table.table_name}`);
    });

    if (tables.length === 0) {
      logger.error('❌ 数据库中没有表。请先创建表。');
      return false;
    }

    // 通过用户输入或自动检测选择用户表
    let userTableName = null;

    // 自动检测可能的用户表
    const possibleUserTables = tables.filter((table: TableInfo) =>
      table.table_name.toLowerCase().includes('user'),
    );

    if (possibleUserTables.length > 0) {
      userTableName = possibleUserTables[0].table_name;
      logger.info(`使用可能的用户表: ${userTableName}`);
    } else {
      // 如果未找到用户表，尝试创建一个基本的用户表
      logger.info('未找到用户表，将尝试创建一个基本的用户表');

      try {
        // 检查是否需要创建users表
        await dataSource.query(`
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            firstName VARCHAR(100),
            lastName VARCHAR(100),
            email VARCHAR(100) UNIQUE,
            password VARCHAR(255),
            isActive BOOLEAN DEFAULT true,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            roles TEXT[]
          );
        `);

        userTableName = 'users';
        logger.info('✅ 已创建users表');
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : '未知错误';
        logger.error(`❌ 创建用户表失败: ${errorMessage}`);
        return false;
      }
    }

    // 现在我们有了用户表，可以创建用户了
    await createBulkUsers(dataSource, userTableName, 50);

    // 关闭连接
    await dataSource.destroy();
    logger.info('✅ 操作成功完成!');

    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.error('❌ 操作失败，错误:');
    logger.error(errorMessage);
    return false;
  }
}

// 生成随机密码的函数
const generateRandomPassword = (length = 10) => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
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
const createRandomUser = async (index: number): Promise<User> => {
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
    password: hashedPassword,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: ['user'],
  };
};

async function createBulkUsers(
  dataSource: DataSource,
  userTableName: string,
  userCount = 50,
) {
  logger.info(`开始创建 ${userCount} 个用户到表 ${userTableName}...`);

  // 批量创建用户以避免内存问题
  const batchSize = 10;
  const batches = Math.ceil(userCount / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const start = batch * batchSize;
    const end = Math.min(start + batchSize, userCount);
    logger.info(`处理批次 ${batch + 1}/${batches} (用户 ${start + 1}-${end})`);

    // 创建一批用户
    const usersToCreate: User[] = [];
    for (let i = start; i < end; i++) {
      usersToCreate.push(await createRandomUser(i + 1));
    }

    // 将用户插入数据库
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const user of usersToCreate) {
        // 检查表结构以识别有效的列
        const tableColumnsResult = await queryRunner.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${userTableName}'
        `);

        // 将查询结果转换为所需类型
        const tableColumns = tableColumnsResult as ColumnInfo[];

        const availableColumns = tableColumns.map(
          (col: ColumnInfo) => col.column_name,
        );
        logger.info(
          `表 ${userTableName} 的可用列: ${availableColumns.join(', ')}`,
        );

        // 过滤用户对象，只保留与表列匹配的字段
        const userColumns = Object.keys(user).filter((key) =>
          availableColumns.includes(key.toLowerCase()),
        );

        if (userColumns.length === 0) {
          logger.error(`❌ 用户对象中没有与表列匹配的字段`);
          continue;
        }

        const columns = userColumns.join(', ');
        const placeholders = userColumns
          .map((_, idx) => `$${idx + 1}`)
          .join(', ');

        // 收集参数值
        const paramValues = userColumns.map((key) => {
          const value = user[key];
          if (key === 'roles' && Array.isArray(value)) {
            return JSON.stringify(value);
          }
          return value;
        });

        // 插入用户
        await queryRunner.query(
          `INSERT INTO "${userTableName}" (${columns}) VALUES (${placeholders})`,
          paramValues,
        );
      }

      await queryRunner.commitTransaction();
      logger.info(`✅ 成功插入 ${usersToCreate.length} 个用户`);
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      logger.error(`❌ 插入用户失败: ${errorMessage}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // 获取总数以确认
  const totalCount = (await dataSource.query(
    `SELECT COUNT(*) FROM "${userTableName}"`,
  )) as { count: string }[];
  logger.info(`✅ 数据库中的总用户数: ${totalCount[0].count}`);
}

// 自执行异步函数
(async () => {
  try {
    const success = await listTablesAndCreateUsers();

    // 使用适当的代码退出
    process.exit(success ? 0 : 1);
  } catch (error) {
    logger.error('意外错误:', error);
    process.exit(1);
  }
})();
