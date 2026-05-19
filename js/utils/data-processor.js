export function processData(rawRows) {
  const colMap = findColumns(rawRows);
  if (!colMap.url || !colMap.method) {
    return { error: 'Could not identify required columns (url, method/action, timestamp, duration, status)' };
  }

  const rows = rawRows.map(r => ({
    url: r[colMap.url] || '',
    rawUrl: r[colMap.url] || '',
    method: (r[colMap.method] || 'UNKNOWN').toUpperCase(),
    timestamp: parseTimestamp(r[colMap.timestamp]),
    duration: parseFloat(r[colMap.duration]) || 0,
    status: parseInt(r[colMap.status]) || 0,
    userId: colMap.userId ? (r[colMap.userId] || 'unknown') : 'unknown',
    normalizedUrl: ''
  }));

  rows.forEach(r => {
    r.normalizedUrl = normalizeUrl(r.url, r.method);
  });

  return { rows, colMap };
}

export function computeMetrics(rows) {
  const total = rows.length;
  const totalDuration = rows.reduce((s, r) => s + r.duration, 0);
  const avgDuration = total ? totalDuration / total : 0;
  const durations = rows.map(r => r.duration).sort((a, b) => a - b);
  const p50 = percentile(durations, 50);
  const p90 = percentile(durations, 90);
  const p99 = percentile(durations, 99);
  const maxDuration = durations.length ? durations[durations.length - 1] : 0;

  const byMethod = {};
  const byStatus = {};
  const byNormalizedUrl = {};
  const byHour = {};
  const byUserId = {};
  const errors = rows.filter(r => r.status >= 400).length;

  rows.forEach(r => {
    byMethod[r.method] = (byMethod[r.method] || 0) + 1;
    const statusGroup = Math.floor(r.status / 100) + 'xx';
    byStatus[statusGroup] = (byStatus[statusGroup] || 0) + 1;
    byNormalizedUrl[r.normalizedUrl] = (byNormalizedUrl[r.normalizedUrl] || 0) + 1;

    if (r.timestamp) {
      const hourKey = r.timestamp.toISOString().slice(0, 13);
      byHour[hourKey] = (byHour[hourKey] || 0) + 1;
    }

    if (!byUserId[r.userId]) {
      byUserId[r.userId] = { callCount: 0, totalDuration: 0, errors: 0, endpoints: {} };
    }
    byUserId[r.userId].callCount++;
    byUserId[r.userId].totalDuration += r.duration;
    if (r.status >= 400) byUserId[r.userId].errors++;
    byUserId[r.userId].endpoints[r.normalizedUrl] = (byUserId[r.userId].endpoints[r.normalizedUrl] || 0) + 1;
  });

  const topUrls = Object.entries(byNormalizedUrl)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([url, count]) => {
      const urlRows = rows.filter(r => r.normalizedUrl === url);
      const avgDur = urlRows.reduce((s, r) => s + r.duration, 0) / urlRows.length;
      return { url, count, avgDuration: avgDur, methods: [...new Set(urlRows.map(r => r.method))] };
    });

  const sortedHours = Object.entries(byHour).sort((a, b) => a[0].localeCompare(b[0]));

  const avgByMethod = {};
  Object.keys(byMethod).forEach(m => {
    const mRows = rows.filter(r => r.method === m);
    avgByMethod[m] = mRows.reduce((s, r) => s + r.duration, 0) / mRows.length;
  });

  const topCallers = Object.entries(byUserId)
    .map(([userId, stats]) => {
      const topEndpoint = Object.entries(stats.endpoints).sort((a, b) => b[1] - a[1])[0];
      return {
        userId,
        callCount: stats.callCount,
        avgDuration: stats.totalDuration / stats.callCount,
        errorRate: (stats.errors / stats.callCount) * 100,
        topEndpoint: topEndpoint ? topEndpoint[0] : 'N/A'
      };
    })
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, 10);

  return {
    total,
    avgDuration,
    p50,
    p90,
    p99,
    maxDuration,
    errors,
    byMethod,
    byStatus,
    topUrls,
    sortedHours,
    avgByMethod,
    topCallers,
    errorRate: total ? (errors / total * 100) : 0
  };
}

function findColumns(rows) {
  if (!rows.length) return {};
  const keys = Object.keys(rows[0]);
  const map = {};

  const urlPatterns = ['url', 'endpoint', 'callout_url', 'request_url'];
  const methodPatterns = ['method', 'action', 'http_method', 'verb', 'request_method'];
  const tsPatterns = ['timestamp', 'datetime', 'date', 'created_date', 'event_time', 'time'];
  const durPatterns = ['duration', 'duration_ms', 'elapsed', 'response_time', 'latency', 'total_time'];
  const statusPatterns = ['status', 'status_code', 'http_status', 'response_code', 'statusCode'];
  const userIdPatterns = ['userid', 'user_id', 'created_by_id', 'createdbyid', 'owner_id', 'ownerid'];

  keys.forEach(k => {
    const lk = k.toLowerCase();
    if (!map.url && urlPatterns.some(p => lk.includes(p))) map.url = k;
    if (!map.method && methodPatterns.some(p => lk.includes(p))) map.method = k;
    if (!map.timestamp && tsPatterns.some(p => lk.includes(p))) map.timestamp = k;
    if (!map.duration && durPatterns.some(p => lk.includes(p))) map.duration = k;
    if (!map.status && statusPatterns.some(p => lk.includes(p))) map.status = k;
    if (!map.userId && userIdPatterns.some(p => lk.includes(p))) map.userId = k;
  });

  if (!map.url && keys.length >= 5) map.url = keys[0];
  if (!map.method && keys.length >= 5) map.method = keys[1];
  if (!map.timestamp && keys.length >= 5) map.timestamp = keys[2];
  if (!map.duration && keys.length >= 5) map.duration = keys[3];
  if (!map.status && keys.length >= 5) map.status = keys[4];

  return map;
}

function normalizeUrl(url, method) {
  if (!url) return url;
  if (method?.toUpperCase() === 'GET') {
    try {
      const u = new URL(url);
      return u.origin + u.pathname;
    } catch {
      return url.split('?')[0];
    }
  }
  return url;
}

function parseTimestamp(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
