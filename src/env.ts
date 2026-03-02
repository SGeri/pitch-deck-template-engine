import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().min(1).optional(),

        OPENAI_API_KEY: z.string().min(1).optional(),

        BETTER_AUTH_SECRET: z.string().min(1).optional(),
        BETTER_AUTH_URL: z.string().min(1).optional(),

        AWS_REGION: z.string().min(1).optional(),
        AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
        AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
        S3_ENDPOINT: z.string().min(1).optional(),
        S3_BUCKET_NAME: z.string().min(1).optional(),
        S3_FORCE_PATH_STYLE: z.string().optional(),
    },
    client: {},
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        AWS_REGION: process.env.AWS_REGION,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        S3_ENDPOINT: process.env.S3_ENDPOINT,
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
        S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE,
    },
});
