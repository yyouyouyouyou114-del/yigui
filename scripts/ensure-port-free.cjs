#!/usr/bin/env node
// Ensure a TCP port is free. If occupied, kill the owning process.
// Usage: node scripts/ensure-port-free.cjs <port>
const { execSync } = require('child_process');

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function ensurePortFree(port) {
  if (!port) {
    log('No port provided');
    process.exit(1);
  }
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      const findCmd = `powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)"`;
      let pidRaw = '';
      try {
        pidRaw = execSync(findCmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      } catch {}
      if (pidRaw) {
        const pid = parseInt(pidRaw, 10);
        if (!Number.isNaN(pid) && pid > 0) {
          try {
            execSync(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force"`, { stdio: 'ignore' });
            log(`Killed process ${pid} on port ${port}`);
          } catch {
            try {
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
              log(`Taskkilled process ${pid} on port ${port}`);
            } catch {}
          }
        }
      } else {
        log(`Port ${port} free`);
      }
    } else {
      try {
        execSync(`lsof -ti tcp:${port} -sTCP:LISTEN | xargs -r kill -9`);
        log(`Cleared processes on port ${port}`);
      } catch {
        log(`Port ${port} free or lsof not available`);
      }
    }
  } catch {}
}

ensurePortFree(process.argv[2]);


