module.exports = {
  apps: [
    {
      name: 'idental-backend',
      script: './dist/index.js',
      instances: 'max', // Or a specific number like 1, 2, 4 if you want to limit instances
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
