// Inject required env vars before any module imports so that
// the Zod-based env.ts validation passes in the test environment.
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb';
process.env['JWT_SECRET'] = 'test-super-secret-jwt-key-for-unit-tests';
process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';
process.env['PORT'] = '3000';
process.env['API_PREFIX'] = '/api/v1';
process.env['MPG_BASE_URL'] = 'https://developer.bankmega.app';
process.env['MPG_PARTNER_ID'] = 'test-mpg-partner-id';
process.env['MPG_CHANNEL_ID'] = '95221';
process.env['MPG_SECRET_KEY_PATH'] = require('path').resolve(__dirname, 'fixtures/mpg_secret_test.key');
process.env['MPG_CLIENT_ID'] = 'test-mpg-client-id';
process.env['MPG_CLIENT_SECRET'] = 'test-mpg-client-secret';
process.env['SMTP_HOST'] = 'smtp.test.com';
process.env['SMTP_PORT'] = '587';
process.env['SMTP_SERVICE'] = 'gmail';
process.env['SMTP_MAIL'] = 'test@test.com';
process.env['SMTP_PASSWORD'] = 'test-password';
process.env['CLIENT_APP_URL'] = 'http://localhost:8085';

