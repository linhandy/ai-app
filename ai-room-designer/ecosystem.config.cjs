/**
 * pm2 ecosystem config for 装AI
 *
 * 部署步骤（HK VPS）：
 *   1. scp -r ai-room-designer/ root@YOUR_HK_IP:/opt/zhuang-ai
 *   2. ssh root@YOUR_HK_IP
 *   3. cd /opt/zhuang-ai && npm install && npm run build
 *   4. cp .env.local.example .env.local  # fill in keys
 *   5. mkdir -p logs
 *   6. pm2 start ecosystem.config.cjs
 *   7. pm2 save && pm2 startup
 *
 * 查看日志：pm2 logs zhuang-ai
 * 重启：    pm2 restart zhuang-ai
 */

module.exports = {
  apps: [
    {
      name: 'zhuang-ai',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      cwd: '/opt/zhuang-ai',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env.local',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
