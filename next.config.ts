import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    webpack: (config, { isServer }) => {
        if (isServer) {
            // Make sure externals is an array
            if (!Array.isArray(config.externals)) {
                config.externals = [];
            }

            // Ignore typeorm (already done)
            config.externals.push("typeorm");

            // Ignore anything in src/server (server-only code)
            config.externals.push(({ request }, callback) => {
                if (request && request.startsWith("./src/server")) {
                    return callback(null, `commonjs ${request}`);
                }
                callback();
            });
        }
        return config;
    }
};

export default nextConfig;
