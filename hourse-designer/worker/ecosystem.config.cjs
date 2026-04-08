/**
 * pm2 ecosystem config for 易建房 Worker
 *
 * 部署步骤（VPS）：
 *   1. git clone / scp 项目到 /opt/yijianfang
 *   2. cd /opt/yijianfang/hourse-designer && npm install
 *   3. 复制 .env 文件（包含 NEXT_PUBLIC_SUPABASE_URL、SUPABASE_SERVICE_KEY、ZENMUX_API_KEY）
 *   4. pm2 start worker/ecosystem.config.cjs
 *   5. pm2 save && pm2 startup
 *
 * 查看日志：pm2 logs yijianfang-worker
 * 重启：    pm2 restart yijianfang-worker
 */

module.exports = {
  apps: [
    {
      name: 'yijianfang-worker',
      script: 'npx',
      args: 'tsx worker/worker.ts',
      cwd: '/opt/yijianfang/hourse-designer',   // ← 修改为实际部署路径
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/worker-error.log',
      out_file: 'logs/worker-out.log',
      merge_logs: true,
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
