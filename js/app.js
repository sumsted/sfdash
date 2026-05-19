import { parseCSV } from './utils/csv-parser.js';
import { processData, computeMetrics } from './utils/data-processor.js';

let allRows = [];
let filteredRows = [];
let metrics = null;

function init() {
  document.getElementById('csvInput').addEventListener('change', handleFileUpload);
  document.getElementById('filterMethod').addEventListener('change', applyFilters);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('filterUrl').addEventListener('input', applyFilters);
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const rawRows = parseCSV(text);
  const result = processData(rawRows);

  if (result.error) {
    alert(result.error);
    return;
  }

  allRows = result.rows;
  filteredRows = [...allRows];

  document.getElementById('fileInfo').textContent = `${file.name} — ${allRows.length.toLocaleString()} callouts`;
  document.getElementById('uploadArea').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');

  populateFilters();
  renderDashboard();
}

function populateFilters() {
  const methods = [...new Set(allRows.map(r => r.method))].sort();
  const statuses = [...new Set(allRows.map(r => Math.floor(r.status / 100) + 'xx'))].sort();

  const methodSelect = document.getElementById('filterMethod');
  methodSelect.innerHTML = '<option value="all">All</option>' + methods.map(m => `<option value="${m}">${m}</option>`).join('');

  const statusSelect = document.getElementById('filterStatus');
  statusSelect.innerHTML = '<option value="all">All</option>' + statuses.map(s => `<option value="${s}">${s}</option>`).join('');
}

function applyFilters() {
  const method = document.getElementById('filterMethod').value;
  const status = document.getElementById('filterStatus').value;
  const urlSearch = document.getElementById('filterUrl').value.toLowerCase();

  filteredRows = allRows.filter(r => {
    if (method !== 'all' && r.method !== method) return false;
    if (status !== 'all' && (Math.floor(r.status / 100) + 'xx') !== status) return false;
    if (urlSearch && !r.normalizedUrl.toLowerCase().includes(urlSearch) && !r.rawUrl.toLowerCase().includes(urlSearch)) return false;
    return true;
  });

  renderDashboard();
}

function renderDashboard() {
  metrics = computeMetrics(filteredRows);
  renderMetrics();
  renderCharts();
  renderTables();
}

function renderMetrics() {
  const grid = document.getElementById('metricsGrid');
  grid.innerHTML = `
    <metric-card label="Total Callouts" value="${metrics.total.toLocaleString()}" sub="filtered records"></metric-card>
    <metric-card label="Avg Duration" value="${metrics.avgDuration.toFixed(1)} ms" sub="mean response time"></metric-card>
    <metric-card label="P50 Duration" value="${metrics.p50.toFixed(1)} ms" sub="median"></metric-card>
    <metric-card label="P90 Duration" value="${metrics.p90.toFixed(1)} ms" sub="90th percentile"></metric-card>
    <metric-card label="P99 Duration" value="${metrics.p99.toFixed(1)} ms" sub="99th percentile"></metric-card>
    <metric-card label="Max Duration" value="${metrics.maxDuration.toFixed(1)} ms" sub="slowest callout"></metric-card>
    <metric-card label="Error Rate" value="${metrics.errorRate.toFixed(2)}%" sub="${metrics.errors.toLocaleString()} errors (4xx/5xx)"></metric-card>
    <metric-card label="Unique URLs" value="${new Set(filteredRows.map(r => r.normalizedUrl)).size.toLocaleString()}" sub="normalized endpoints"></metric-card>
    <metric-card label="HTTP Methods" value="${Object.keys(metrics.byMethod).length}" sub="${Object.keys(metrics.byMethod).sort().join(', ')}"></metric-card>
  `;
}

function renderCharts() {
  const grid = document.getElementById('chartsGrid');

  const timeData = metrics.sortedHours.map(([k, v]) => ({
    label: k.slice(11) + ':00',
    value: v
  }));

  const urlData = metrics.topUrls.slice(0, 10).map(u => ({ label: u.url, value: u.count }));
  const methodDurData = Object.entries(metrics.avgByMethod).map(([m, d]) => ({ label: m, value: d }));
  const statusData = Object.entries(metrics.byStatus).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ label: k, value: v }));
  const urlDurData = [...metrics.topUrls].sort((a, b) => b.avgDuration - a.avgDuration).slice(0, 10).map(u => ({ label: u.url, value: u.avgDuration }));

  grid.innerHTML = `
    ${timeData.length > 1 ? `<line-chart title="Callouts Over Time" data='${JSON.stringify(timeData)}'></line-chart>` : ''}
    <status-donut title="Status Code Distribution" data='${JSON.stringify(statusData)}'></status-donut>
    <bar-chart title="Top URLs by Call Count" data='${JSON.stringify(urlData)}'></bar-chart>
    <bar-chart title="Avg Duration by HTTP Method" data='${JSON.stringify(methodDurData)}'></bar-chart>
    <bar-chart title="Top URLs by Avg Duration (ms)" data='${JSON.stringify(urlDurData)}'></bar-chart>
  `;
}

function renderTables() {
  const container = document.getElementById('tablesContainer');

  const topUrlColumns = [
    { key: 'url', label: 'URL' },
    { key: 'count', label: 'Count' },
    { key: 'methods', label: 'Methods' },
    { key: 'avgDuration', label: 'Avg Duration' }
  ];

  const slowest = [...filteredRows]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 20)
    .map(r => ({
      url: r.normalizedUrl,
      method: r.method,
      status: r.status,
      duration: r.duration,
      timestamp: r.timestamp?.toISOString().slice(0, 19).replace('T', ' ') || 'N/A'
    }));

  const slowColumns = [
    { key: 'url', label: 'URL' },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status' },
    { key: 'duration', label: 'Duration (ms)' },
    { key: 'timestamp', label: 'Timestamp' }
  ];

  container.innerHTML = `
    <data-table title="Top URLs by Volume" data='${JSON.stringify(metrics.topUrls.slice(0, 20).map(u => ({ ...u, methods: u.methods.join(', ') })))}' columns='${JSON.stringify(topUrlColumns)}'></data-table>
    <data-table title="Slowest Callouts" data='${JSON.stringify(slowest)}' columns='${JSON.stringify(slowColumns)}'></data-table>
    <caller-table title="Top 10 API Callers" data='${JSON.stringify(metrics.topCallers)}'></caller-table>
  `;
}

init();
