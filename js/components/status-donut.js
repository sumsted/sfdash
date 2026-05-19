class StatusDonut extends HTMLElement {
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
    const colors = { '2xx': '#3fb950', '3xx': '#58a6ff', '4xx': '#d29922', '5xx': '#f85149' };
    const total = data.reduce((s, d) => s + d.value, 0);

    const size = 180;
    const cx = size / 2;
    const cy = size / 2;
    const r = 70;
    const strokeW = 24;
    let cumulative = 0;

    const segments = data.map(d => {
      const pct = total ? d.value / total : 0;
      const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
      cumulative += pct;
      const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
      const largeArc = pct > 0.5 ? 1 : 0;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const path = pct >= 0.9999
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
      return { ...d, path, color: colors[d.label] || '#8b949e' };
    });

    this.innerHTML = `
      <div class="chart-panel">
        <h3>${title}</h3>
        <div style="display:flex;align-items:center;gap:2rem;flex-wrap:wrap">
          <svg width="${size}" height="${size}">
            ${segments.map(s => `<path d="${s.path}" fill="none" stroke="${s.color}" stroke-width="${strokeW}" stroke-linecap="round" opacity="0.85"/>`).join('')}
            <text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="#e6edf3" font-size="20" font-weight="700">${total.toLocaleString()}</text>
            <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="#8b949e" font-size="10">total</text>
          </svg>
          <div class="legend">
            ${segments.map(s => `
              <div class="legend-item">
                <div class="legend-dot" style="background:${s.color}"></div>
                <span>${s.label}: ${s.value.toLocaleString()} (${total ? (s.value / total * 100).toFixed(1) : 0}%)</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  }
}

customElements.define('status-donut', StatusDonut);
