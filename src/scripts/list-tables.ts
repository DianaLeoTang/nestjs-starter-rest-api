/*
 * @Author: Diana Tang
 * @Date: 2025-05-12 13:42:59
 * @LastEditors: Diana Tang
 * @Description: some description
 * @FilePath: /nestjs-starter-rest-api/src/scripts/list-tables.ts
 */
import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// 加载环境变量
config();

async function listTables(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'example',
    database: process.env.DB_NAME || 'example_db',
    ssl: false,
  });

  try {
    await dataSource.initialize();
    console.log('数据库连接成功!');

    const tables = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    console.log('数据库中的表:');
    if (tables.length === 0) {
      console.log('没有找到任何表');
    } else {
      tables.forEach((table: { table_name: string }, index: number) => {
        console.log(`${index + 1}. ${table.table_name}`);
      });
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('操作失败:', error);
  }
}

// 执行函数
listTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('意外错误:', error);
    process.exit(1);
  });
