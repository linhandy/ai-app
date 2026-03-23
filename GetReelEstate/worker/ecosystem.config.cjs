module.exports = {
  apps: [
    {
      name: 'getreel-worker',
      script: 'worker.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',
      instances: 1,          // 单进程，防止同一任务被双处理
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      restart_delay: 5000,   // 崩溃后 5s 重启
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
