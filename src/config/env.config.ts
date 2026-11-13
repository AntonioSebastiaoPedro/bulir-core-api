export interface EnvironmentVariables {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  DATABASE_URL_POOLER?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

export const envConfig = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    url: process.env.DATABASE_URL ?? '',
    poolerUrl: process.env.DATABASE_URL_POOLER,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'default_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
});
