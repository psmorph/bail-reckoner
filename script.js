/* Set this once after the ESP prints its IP address.  Leave empty when this
   dashboard is served by the ESP itself (the recommended, same-origin setup). */
const ESP_BASE_URL = 'http://172.20.10.2'; // CHANGE TO YOUR ESP IP; no trailing /
const API = ESP_BASE_URL ? ESP_BASE_URL.replace(/\/$/, '') : '';
const POLL_MS = 3000;
let currentRange = '12h';
let lastTips = null;

const chart = new Chart(document.getElementById('rainChart'), { type: 'line', data: { labels: [], datasets: [{ label: 'Tips', data: [], borderColor: '#8ec5ff', backgroundColor: 'rgba(142,197,255,.18)', borderWidth: 2.5, fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: '#f8fbff', pointBorderColor: '#6fb7ff' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#94a3b8' } }, y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { precision: 0, color: '#94a3b8' } } } } });

const $ = id => document.getElementById(id);
const n = (value, digits = 1) => Number(value || 0).toFixed(digits);
const text = (id, value) => { $(id).textContent = value; };
function setBar(id, percent) { $(id).style.width = `${Math.max(0, Math.min(100, percent))}%`; }
function age(seconds) { if (seconds == null || seconds < 0) return 'No tips yet'; if (seconds < 60) return `${Math.round(seconds)} sec`; if (seconds < 3600) return `${Math.floor(seconds / 60)} min`; return `${Math.floor(seconds / 3600)} hr`; }

function connection(online) {
  const badge = $('connection-badge');
  badge.className = `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium self-start sm:self-auto ${online ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`;
  badge.innerHTML = `<span class="h-2 w-2 rounded-full ${online ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}"></span><span>ESP-12F ${online ? 'Connected' : 'Offline'}</span>`;
}
function animateBucket() { const icon = $('bucket-icon'); icon.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-18deg)' }, { transform: 'rotate(0deg)' }], { duration: 520, easing: 'ease-out' }); }
function render(data) {
  text('rainfall-today', n(data.rainfallMm)); text('total-tips', data.tips); text('sidebar-tips', data.tips); text('total-volume', n(data.volumeMl, 0)); text('rain-rate', n(data.rainRateMmHr)); text('last-tip', age(data.lastTipAgeSec)); text('tip-interval', data.avgTipIntervalSec == null ? '—' : n(data.avgTipIntervalSec, 0)); text('calibration', n(data.mlPerTip));
  text('updated-at', `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
  const active = Boolean(data.raining); $('rain-status').innerHTML = `<span class="h-2 w-2 rounded-full bg-blue-400 ${active ? 'animate-pulse' : ''}"></span><span>${active ? 'Raining' : 'Dry'}</span>`;
  setBar('tips-bar', (data.tips % 100)); setBar('volume-bar', (data.volumeMl % 500) / 5); setBar('rate-bar', data.rainRateMmHr / 2); setBar('last-tip-bar', data.lastTipAgeSec == null ? 0 : Math.max(0, 100 - data.lastTipAgeSec / 36)); setBar('interval-bar', data.avgTipIntervalSec == null ? 0 : Math.min(100, data.avgTipIntervalSec));
  if (lastTips !== null && data.tips > lastTips) animateBucket(); lastTips = data.tips;
  updateChart(data.history || {});
}
function updateChart(history) { window.lastHistory = history; const series = history[currentRange] || { labels: [], tips: [] }; $('chart-title').textContent = currentRange === '7d' ? 'Tips over 7 days' : currentRange === '24h' ? 'Tips over 24 hours' : 'Tips per hour'; chart.data.labels = series.labels; chart.data.datasets[0].data = series.tips; chart.update(); }
async function poll() { try { const response = await fetch(`${API}/data`, { cache: 'no-store' }); if (!response.ok) throw new Error(response.status); const data = await response.json(); render(data); connection(true); } catch (error) { connection(false); console.warn('ESP-12F data request failed:', error); } }
document.querySelectorAll('.range-btn').forEach(button => button.addEventListener('click', () => { currentRange = button.dataset.range; document.querySelectorAll('.range-btn').forEach(b => b.className = 'range-btn px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition'); button.className = 'range-btn px-3 py-1.5 rounded-lg font-medium bg-blue-600 text-white shadow'; poll(); }));
$('reset-hardware').addEventListener('click', async () => { if (!confirm('Reset all counters?')) return; try { const r = await fetch(`${API}/reset`, { method: 'POST' }); if (!r.ok) throw new Error(r.status); poll(); } catch { alert('Could not reset the ESP-12F. Check the connection.'); } });
$('download-csv').addEventListener('click', () => { const rows = [['period','tips']]; const s = (window.lastHistory || {})[$('csv-range').value === 'daily' ? '7d' : '24h'] || { labels: [], tips: [] }; s.labels.forEach((label, i) => rows.push([label, s.tips[i]])); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })); a.download = 'rain-data.csv'; a.click(); URL.revokeObjectURL(a.href); });
poll(); setInterval(poll, POLL_MS);
