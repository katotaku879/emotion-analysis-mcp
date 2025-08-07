import { Client } from 'pg';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

async function testDatabaseConnection() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        await client.connect();
        console.log('✅ データベース接続成功！');
        
        const result = await client.query('SELECT current_database(), current_user, version()');
        console.log('データベース情報:', result.rows[0]);
        
    } catch (error) {
        console.error('❌ データベース接続エラー:', error);
    } finally {
        await client.end();
    }
}

testDatabaseConnection();