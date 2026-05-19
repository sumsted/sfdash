class MetricCard extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    const label = this.getAttribute('label') || '';
    const value = this.getAttribute('value') || '';
    const sub = this.getAttribute('sub') || '';

    this.innerHTML = `
      <div class="metric-card">
        <div class="label">${label}</div>
        <div class="value">${value}</div>
        ${sub ? `<div class="sub">${sub}</div>` : ''}
      </div>`;
  }
}

customElements.define('metric-card', MetricCard);
