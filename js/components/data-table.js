class DataTable extends HTMLElement {
  static get observedAttributes() {
    return ['data', 'title', 'columns'];
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
    let columns;
    try {
      columns = JSON.parse(this.getAttribute('columns') || '[]');
    } catch {
      columns = [];
    }

    if (!data.length || !columns.length) return;

    const statusClass = (code) => {
      const g = Math.floor(code / 100);
      return `status-${g}xx`;
    };

    this.innerHTML = `
      <div class="data-table">
        <h3>${title}</h3>
        <table>
          <thead><tr>${columns.map(c => `<th data-col="${c.key}">${c.label}</th>`).join('')}</tr></thead>
          <tbody>
            ${data.map(row => `<tr>${columns.map(c => {
              const val = row[c.key] ?? '';
              if (c.key === 'status') return `<td><span class="status-badge ${statusClass(val)}">${val}</span></td>`;
              if (c.key === 'avgDuration') return `<td>${val.toFixed(1)} ms</td>`;
              if (c.key === 'url') return `<td title="${val}">${this.truncate(val, 60)}</td>`;
              return `<td>${val}</td>`;
            }).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  truncate(str, len) {
    return str.length > len ? str.slice(0, len) + '...' : str;
  }
}

customElements.define('data-table', DataTable);
