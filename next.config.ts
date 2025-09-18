import type { NextConfig } from "next";

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_ENDPOINT = process.env.S3_ENDPOINT

const nextConfig: NextConfig = {
    webpack: (config, { isServer }) => {
        config.module.rules.push({
            test: /pdf\.worker\.min\.js$/,
            type: 'asset/resource',
        });
        if (isServer) {
            config.externals = config.externals || [];
            if (!Array.isArray(config.externals)) config.externals = [config.externals];
            config.externals.push("typeorm", "pg", "sqlite3");
        }
        return config;
    },

    async rewrites() {
        return [
            {
                source: "/s3/:path*",
                destination: `${S3_ENDPOINT}/${S3_BUCKET_NAME}/:path*`,
            },
        ];
    }
}

export default nextConfig;
