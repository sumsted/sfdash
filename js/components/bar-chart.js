class BarChart extends HTMLElement {
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
    const colors = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff', '#f0883e', '#79c0ff', '#7ee787', '#e3b341', '#ff7b72'];

    if (!data.length) return;

    const maxVal = Math.max(...data.map(d => d.value));
    const barHeight = 28;
    const gap = 6;
    const labelWidth = 140;
    const height = data.length * (barHeight + gap) + 20;
    const width = this.clientWidth || 500;
    const chartWidth = width - labelWidth - 60;

    this.innerHTML = `
      <div class="chart-panel">
        <h3>${title}</h3>
        <svg width="${width}" height="${height}" style="font-size:11px">
          ${data.map((d, i) => {
            const barW = maxVal ? (d.value / maxVal) * chartWidth : 0;
            const y = i * (barHeight + gap) + 10;
            return `
              <text x="${labelWidth - 8}" y="${y + barHeight / 2 + 4}" text-anchor="end" fill="#8b949e">${this.truncate(d.label, 22)}</text>
              <rect x="${labelWidth}" y="${y}" width="${barW}" height="${barHeight}" rx="3" fill="${colors[i % colors.length]}" opacity="0.85"/>
              <text x="${labelWidth + barW + 6}" y="${y + barHeight / 2 + 4}" fill="#e6edf3">${d.value.toLocaleString()}</text>`;
          }).join('')}
        </svg>
      </div>`;
  }

  truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '...' : str;
  }
}

customElements.define('bar-chart', BarChart);
