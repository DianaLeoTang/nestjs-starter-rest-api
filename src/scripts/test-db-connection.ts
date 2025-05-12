/*
 * @Author: Diana Tang
 * @Date: 2025-05-12 11:18:31
 * @LastEditors: Diana Tang
 * @Description: some description
 * @FilePath: /nestjs-starter-rest-api/src/scripts/test-db-connection.ts
 */
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import * as winston from 'winston';

// Load environment variables from .env file
config();

// Create a logger
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

async function testDatabaseConnection() {
  logger.info('Testing database connection...');

  // Create a new database connection using the configuration from environment variables
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || 'example',
    database: process.env.DB_DATABASE || 'example_db',
    ssl: process.env.DB_SSL === 'true',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    // Initialize the connection
    await dataSource.initialize();
    logger.info('✅ Database connection established successfully!');

    // Test a simple query
    const result = await dataSource.query('SELECT NOW()');
    logger.info(
      `✅ Query executed successfully: Current database time is ${result[0].now}`,
    );

    // Get database information
    const dbInfo = await dataSource.query(`
      SELECT
        current_database() as database,
        current_user as user,
        version() as version
    `);

    logger.info('✅ Database information:');
    logger.info(`   Database: ${dbInfo[0].database}`);
    logger.info(`   User: ${dbInfo[0].user}`);
    logger.info(`   Version: ${dbInfo[0].version}`);

    // Close the connection
    await dataSource.destroy();
    logger.info('✅ Connection closed successfully.');

    return true;
  } catch (error: any) {
    logger.error('❌ Database connection failed with error:');
    logger.error(error);

    if (
      error.message?.includes('role') ||
      error.message?.includes('authentication')
    ) {
      logger.error(
        '🔍 Authentication failed. Please check your DB_USERNAME and DB_PASSWORD.',
      );
    }

    if (
      error.message?.includes('database') &&
      error.message?.includes('does not exist')
    ) {
      logger.error(
        '🔍 Database does not exist. Please check your DB_DATABASE or create the database.',
      );
    }

    if (error.code === 'ECONNREFUSED') {
      logger.error(
        '🔍 Connection refused. Please check if the database server is running and DB_HOST/DB_PORT are correct.',
      );
    }

    return false;
  }
}

// Self-executing async function
(async () => {
  try {
    const success = await testDatabaseConnection();

    // Exit with the appropriate code
    process.exit(success ? 0 : 1);
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    process.exit(1);
  }
})();
