class CallerTable extends HTMLElement {
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

    this.innerHTML = `
      <div class="data-table">
        <h3>${title}</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>User ID</th>
              <th>Callouts</th>
              <th>Avg Duration</th>
              <th>Error Rate</th>
              <th>Top Endpoint</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((caller, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><code class="user-id">${caller.userId}</code></td>
                <td>${caller.callCount.toLocaleString()}</td>
                <td>${caller.avgDuration.toFixed(1)} ms</td>
                <td><span class="status-badge ${caller.errorRate > 10 ? 'status-5xx' : caller.errorRate > 5 ? 'status-4xx' : 'status-2xx'}">${caller.errorRate.toFixed(1)}%</span></td>
                <td title="${caller.topEndpoint}">${this.truncate(caller.topEndpoint, 50)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '...' : str;
  }
}

customElements.define('caller-table', CallerTable);
