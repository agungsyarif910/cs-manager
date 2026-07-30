export default () => ({
  port: parseInt(process.env.APP_PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
    expiration: process.env.JWT_EXPIRATION || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  }
});
