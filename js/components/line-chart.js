class LineChart extends HTMLElement {
  static get observedAttributes() {
    return ['data', 'title'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    let data;
    try {
      data = JSON.parse(this.getAttribute('data') || '[]');
    } catch {
      data = [];
    }

    const title = this.getAttribute('title') || '';

    if (!data.length) return;

    const width = this.clientWidth || 500;
    const height = 220;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const maxVal = Math.max(...data.map(d => d.value));
    const minVal = Math.min(...data.map(d => d.value));
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => ({
      x: pad.left + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
      y: pad.top + chartH - ((d.value - minVal) / range) * chartH
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaD = pathD + ` L${points[points.length - 1].x},${pad.top + chartH} L${points[0].x},${pad.top + chartH} Z`;

    const yTicks = 5;
    const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => minVal + (range * i / yTicks));

    this.innerHTML = `
      <div class="chart-panel">
        <h3>${title}</h3>
        <svg width="${width}" height="${height}" style="font-size:10px">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#58a6ff" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#58a6ff" stop-opacity="0"/>
            </linearGradient>
          </defs>
          ${yLabels.map((v, i) => {
            const y = pad.top + chartH - (i / yTicks) * chartH;
            return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#30363d" stroke-dasharray="2,4"/>
                    <text x="${pad.left - 6}" y="${y + 3}" text-anchor="end" fill="#8b949e">${Math.round(v)}</text>`;
          }).join('')}
          <path d="${areaD}" fill="url(#lineGrad)"/>
          <path d="${pathD}" fill="none" stroke="#58a6ff" stroke-width="2"/>
          ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#58a6ff"/>`).join('')}
          ${data.filter((_, i) => i % Math.ceil(data.length / 8) === 0 || i === data.length - 1).map((d, idx) => {
            const i = data.indexOf(d);
            const p = points[i];
            return `<text x="${p.x}" y="${height - 8}" text-anchor="middle" fill="#8b949e">${d.label}</text>`;
          }).join('')}
        </svg>
      </div>`;
  }
}

customElements.define('line-chart', LineChart);
