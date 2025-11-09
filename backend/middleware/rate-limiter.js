/**
 * API 限流中间件
 * 防止滥用，控制每个 IP 的调用次数
 */

// 存储每个 IP 的调用记录
const callRecords = new Map();

// 每天最大调用次数
const MAX_CALLS_PER_DAY = parseInt(process.env.MAX_CALLS_PER_DAY) || 50;

/**
 * 清理过期记录（每小时执行一次）
 */
setInterval(() => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  for (const [ip, record] of callRecords.entries()) {
    // 清理 24 小时前的调用记录
    record.calls = record.calls.filter(timestamp => timestamp > oneDayAgo);
    
    // 如果没有调用记录，删除该 IP
    if (record.calls.length === 0) {
      callRecords.delete(ip);
    }
  }

  console.log(`限流清理完成，当前监控 IP 数: ${callRecords.size}`);
}, 60 * 60 * 1000); // 每小时清理一次

/**
 * 限流中间件
 */
function rateLimiter(req, res, next) {
  // 获取客户端 IP
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // 获取或创建该 IP 的记录
  let record = callRecords.get(ip);
  if (!record) {
    record = { calls: [] };
    callRecords.set(ip, record);
  }

  // 清理 24 小时前的记录
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  record.calls = record.calls.filter(timestamp => timestamp > oneDayAgo);

  // 检查是否超过限制
  if (record.calls.length >= MAX_CALLS_PER_DAY) {
    console.log(`IP ${ip} 超过每日限制 (${MAX_CALLS_PER_DAY} 次)`);
    return res.status(429).json({
      success: false,
      error: `已达到每日最大调用次数限制 (${MAX_CALLS_PER_DAY} 次)`,
      remainingCalls: 0,
      resetTime: new Date(record.calls[0] + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // 记录本次调用
  record.calls.push(now);

  // 添加剩余次数到响应头
  res.setHeader('X-RateLimit-Limit', MAX_CALLS_PER_DAY);
  res.setHeader('X-RateLimit-Remaining', MAX_CALLS_PER_DAY - record.calls.length);

  console.log(`IP ${ip} 调用 API，剩余次数: ${MAX_CALLS_PER_DAY - record.calls.length}`);

  next();
}

/**
 * 获取 IP 的剩余调用次数
 */
function getRemainingCalls(ip) {
  const record = callRecords.get(ip);
  if (!record) {
    return MAX_CALLS_PER_DAY;
  }

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const recentCalls = record.calls.filter(timestamp => timestamp > oneDayAgo);

  return Math.max(0, MAX_CALLS_PER_DAY - recentCalls.length);
}

module.exports = {
  rateLimiter,
  getRemainingCalls,
};

