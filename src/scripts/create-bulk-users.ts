import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as winston from 'winston';

// 加载环境变量
config();

// 创建日志记录器
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});

// 用户凭证接口
interface UserCredential {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// 存储生成的用户凭证
const usersCredentials: UserCredential[] = [];

// 生成可预测的密码
const generatePassword = (index: number) => {
  return `Pass123${index}`;
};

// 哈希密码
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// 将用户凭证保存到CSV文件
async function saveUserCredentialsToFile(
  users: UserCredential[],
): Promise<void> {
  try {
    const headers = 'Email,Password,FirstName,LastName\n';
    const rows = users
      .map(
        (user) =>
          `${user.email},${user.password},${user.firstName},${user.lastName}`,
      )
      .join('\n');
    const csvContent = headers + rows;

    const filePath = path.join(process.cwd(), 'user_credentials.csv');
    fs.writeFileSync(filePath, csvContent);

    logger.info(`✅ 用户凭证已保存到: ${filePath}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.error(`❌ 保存用户凭证失败: ${errorMessage}`);
  }
}

async function createBulkUsers() {
  // 建立数据库连接
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'example',
    database: process.env.DB_NAME || 'example_db',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    logger.info('✅ 数据库连接成功!');

    // 确保用户表存在
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

    logger.info('✅ 确保users表存在');

    // 获取有关列的信息
    const columnInfo = await dataSource.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);

    logger.debug('列信息:');
    columnInfo.forEach((col: any) => {
      logger.debug(`${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

    // 查看id列的类型
    const idColumn = columnInfo.find((col: any) => col.column_name === 'id');
    if (idColumn) {
      logger.info(`ID列类型: ${idColumn.data_type} (${idColumn.udt_name})`);
    }

    // 创建用户数量
    const userCount = 50; // 先创建少量用户进行测试
    let successCount = 0;

    // 批量创建用户
    for (let i = 1; i <= userCount; i++) {
      const firstName = `User${i}`;
      const lastName = `Test${i}`;
      const email = `user${i}@example.com`;
      const password = generatePassword(i);
      const hashedPassword = await hashPassword(password);

      // 保存用户信息到CSV
      usersCredentials.push({
        email,
        password,
        firstName,
        lastName,
      });

      try {
        // 明确生成一个UUID字符串
        const idValue = crypto.randomUUID ? crypto.randomUUID() : uuidv4();

        logger.debug(`为用户 ${email} 生成的UUID: ${idValue}`);

        // 使用参数化查询
        const result = await dataSource.query(
          `INSERT INTO users (id, firstName, lastName, email, password, isActive, roles) 
           VALUES ($1, $2, $3, $4, $5, $6, $7::text[])
           ON CONFLICT (email) DO NOTHING
           RETURNING id`,
          [
            idValue, // 使用明确的UUID字符串
            firstName,
            lastName,
            email,
            hashedPassword,
            true,
            '{user}', // PostgreSQL 数组语法
          ],
        );

        if (result && result.length > 0) {
          logger.info(`✅ 用户创建成功: ${email}, ID: ${result[0].id}`);
          successCount++;
        } else {
          logger.warn(`⚠️ 用户可能已存在: ${email}`);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : '未知错误';
        logger.error(`❌ 创建用户失败 ${email}: ${errorMessage}`);

        // 打印详细的错误信息
        if (error instanceof Error && error.stack) {
          logger.debug(`错误堆栈: ${error.stack}`);
        }
      }
    }

    logger.info(`✅ 完成! 成功创建 ${successCount}/${userCount} 个用户`);

    // 保存用户凭证到CSV
    if (usersCredentials.length > 0) {
      await saveUserCredentialsToFile(usersCredentials);
    }

    // 关闭数据库连接
    await dataSource.destroy();
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    logger.error(`❌ 操作失败: ${errorMessage}`);

    if (error instanceof Error && error.stack) {
      logger.debug(`错误堆栈: ${error.stack}`);
    }

    // 确保关闭数据库连接
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    return false;
  }
}

// 运行脚本
(async () => {
  try {
    const success = await createBulkUsers();
    process.exit(success ? 0 : 1);
  } catch (error) {
    logger.error('意外错误:', error);
    process.exit(1);
  }
})();
