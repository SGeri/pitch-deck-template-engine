import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().min(1),

        OPENAI_API_KEY: z.string().min(1),

        BETTER_AUTH_SECRET: z.string().min(1),
        BETTER_AUTH_URL: z.string().min(1),

        AWS_REGION: z.string().min(1),
        AWS_ACCESS_KEY_ID: z.string().min(1),
        AWS_SECRET_ACCESS_KEY: z.string().min(1),
        S3_ENDPOINT: z.string().min(1),
        S3_BUCKET_NAME: z.string().min(1),
        S3_FORCE_PATH_STYLE: z.string().optional(),
    },
    client: {},
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL ?? '123',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '123',
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? '123',
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? '123',
        AWS_REGION: process.env.AWS_REGION ?? '123',
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? '123',
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? '123',
        S3_ENDPOINT: process.env.S3_ENDPOINT ?? '123',
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ?? '123',
        S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE ?? '123',
    },
});
