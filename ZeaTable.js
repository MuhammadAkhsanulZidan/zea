
 class ZeaTable {
  constructor({ containerId = null, container }) {
    if (containerId) {
      this.container = document.getElementById(containerId);
    } else {
      this.container = container;
    }
    this.columnDefs = [];
    this.rowData = [];
    this.pagination = null;
    this.onRowClick = null;
    this.rowColorCallback = null;
    this.onPageChange = null;

    this.table = null;
    this.tbody = null;
    this.shimmerWrapper = null;
    this.errorWrapper = null;
    this.paginationWrapper = null;

    this.infiniteScroll = false;
    this.scrollListener = null;
    this.loadMoreCallback = null;

    this.isLoading = false;
    this.autoAddRow = false;
    this.autoAddRowAppend = 'end';
    this.autoWidth = true;
    this.columnHasChildren = false;
  }

  setColumnDefs(columnDefs = []) {
    this.columnDefs = columnDefs;
    this.flatCols = !this.columnHasChildren ? this.columnDefs : this._getFlattenedColumns();
      
  }

  setRowData(rowData = []) {
    this.rowData = rowData;
    if (!this.tbody) return;

    this.clearStates();
    this.tbody.innerHTML = "";

    if (this.rowData.length === 0) {
      // 🔹 Show "No data" row
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = this.columnDefs.length || 1;
      td.className = "text-center text-gray-400 py-3";
      td.innerHTML = `<i class="fas fa-database mr-1"></i> No data available`;
      tr.appendChild(td);
      this.tbody.appendChild(tr);
      return;
    }

    this.rowData.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50 hover:text-black cursor-pointer transition border-b';

      if (this.rowColorCallback) {
        const colorValue = this.rowColorCallback(row, rowIndex);
        if (typeof colorValue === 'string') tr.classList.add(...colorValue.split(" "));
        else if (typeof colorValue === 'object') Object.assign(tr.style, colorValue);
      }

      tr.addEventListener('click', () => {
        if (this.onRowClick) {
          this.onRowClick({ data: row, index: rowIndex, tr });
        }
      });

      for (let colIndex = 0; colIndex < this.flatCols.length; colIndex++) {
        const col = this.flatCols[colIndex];
        let value = row[col.field];
        const td = document.createElement('td');
        td.className = 'px-1 py-1 break-words';

        // text alignment
        if (col.textAlign) {
          if (col.textAlign === 'center') td.classList.add('text-center');
          else if (col.textAlign === 'right') td.classList.add('text-right');
          else td.classList.add('text-left');
        } else {
          td.classList.add('text-left');
        }

        let colSpan = 1;
        if (typeof col.colSpan === "function") {
          colSpan = col.colSpan(value, row, rowIndex) || 1;
        } else if (typeof col.colSpan === "number") {
          colSpan = col.colSpan;
        }
        td.colSpan = colSpan;

        if (col.renderCell && typeof col.renderCell === 'function') {
          const rendered = col.renderCell(value, row);
          if (typeof rendered === "string") {
            td.innerHTML = rendered;
          } else {
            td.appendChild(rendered ?? '');
          }
        } else {
          td.textContent = value ?? '';
        }

        tr.appendChild(td);

        if (colSpan > 1) {
          colIndex += (colSpan - 1);
        }
      }

      this.tbody.appendChild(tr);
    });
  }

  _getFlattenedColumns() {
    let flatCols = [];
    this.columnDefs.forEach(col => {
      if (col.children && col.children.length > 0) {
        flatCols = flatCols.concat(col.children);
      } else {
        flatCols.push(col);
      }
    });
    return flatCols;
  }

  addRowData(newRows = [], options = { position: "end" }) {
    if (!Array.isArray(newRows) || newRows.length === 0) return;

    if (!this.tbody || !this.rowData || this.rowData.length === 0) {
      this.setRowData(newRows);
      return;
    }

    if (options.position === "begin") {
      // Prepend new rows to internal rowData
      this.rowData = newRows.concat(this.rowData);
    } else {
      // Append new rows to internal rowData
      this.rowData = this.rowData.concat(newRows);
    }

    newRows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50 hover:text-black cursor-pointer transition border-b';

      // Correct index based on position
      let globalRowIndex;
      if (options.position === "begin") {
        globalRowIndex = rowIndex; // start at 0 for new first rows
      } else {
        globalRowIndex = this.rowData.length - newRows.length + rowIndex;
      }

      // Custom row color
      if (this.rowColorCallback) {
        const colorValue = this.rowColorCallback(row, globalRowIndex);
        if (typeof colorValue === 'string') tr.classList.add(...colorValue.split(" "));
        else if (typeof colorValue === 'object') Object.assign(tr.style, colorValue);
      }

      // Click event
      tr.addEventListener('click', () => {
        if (this.onRowClick) {
          this.onRowClick({ data: row, index: globalRowIndex, tr });
        }
      });

      // Render cells
      for (let colIndex = 0; colIndex < this.flatCols.length; colIndex++) {
        const col = this.flatCols[colIndex] ;
        let value = row[col.field];
        const td = document.createElement('td');
        td.className = 'px-1 py-1';

        // text alignment
        if (col.textAlign) {
          if (col.textAlign === 'center') td.classList.add('text-center');
          else if (col.textAlign === 'right') td.classList.add('text-right');
          else td.classList.add('text-left');
        } else {
          td.classList.add('text-left');
        }

        // colSpan
        let colSpan = 1;
        if (typeof col.colSpan === "function") colSpan = col.colSpan(value, row, globalRowIndex) || 1;
        else if (typeof col.colSpan === "number") colSpan = col.colSpan;
        td.colSpan = colSpan;

        // renderCell
        if (col.renderCell && typeof col.renderCell === 'function') {
          const rendered = col.renderCell(value, row);
          if (typeof rendered === "string") td.innerHTML = rendered;
          else td.appendChild(rendered ?? '');
        } else {
          td.textContent = value ?? '';
        }

        tr.appendChild(td);

        if (colSpan > 1) colIndex += (colSpan - 1);
      }

      // Insert row in correct position
      if (options.position === "begin" && this.tbody.firstChild) {
        this.tbody.insertBefore(tr, this.tbody.firstChild);
      } else {
        this.tbody.appendChild(tr);
      }
    });
  }

  /**
   * Show/hide loading shimmer
   * @param {boolean} isLoading
   * @param {object} options
   *        options.reset {boolean} - default true, whether to clear existing data
   */
  setLoading(isLoading, options = { reset: true }) {
    if (!this.table || !this.tbody) return;

    this.isLoading = isLoading;

    if (!isLoading) {
      this.clearStates();
      return;
    }

    // clear existing row data only if reset === true
    if (options.reset) {
      this.rowData = [];
      this.tbody.innerHTML = "";
    }

    // create loading shimmer row
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = this.flatCols.length || 1;
    td.className = "py-3";

    td.innerHTML = `
      <div class="grid grid-cols-1 gap-3 animate-pulse">
        <div class="h-8 bg-gray-300 rounded w-full"></div>
        <div class="h-8 bg-gray-300 rounded w-full"></div>
        <div class="h-8 bg-gray-300 rounded w-full"></div>
      </div>
    `;

    tr.appendChild(td);

    // append below existing rows if reset === false
    if (options.reset) this.tbody.innerHTML = "";
    this.tbody.appendChild(tr);

    this.shimmerWrapper = tr;
  }




  setError(message = "Error loading data") {
    console.log("setError called with:", message);

    // stop shimmer
    this.clearStates();

    if (!this.container) return;

    // wipe tbody rows if table exists
    if (this.tbody) {
      this.tbody.innerHTML = "";
      this.rowData = [];
    }

    // build error UI
    this.errorWrapper = document.createElement("div");
    this.errorWrapper.className =
      "flex items-center justify-center text-red-500 text-sm mt-3 gap-2 px-3 bg-red-50 border border-red-200 rounded";
    this.errorWrapper.innerHTML = `
    <i class="fas fa-exclamation-triangle"></i>
    <span>${message}</span>
  `;

    // show at the top so it's not hidden
    this.container.prepend(this.errorWrapper);
  }



  clearStates() {
    if (this.shimmerWrapper) {
      this.shimmerWrapper.remove();
      this.shimmerWrapper = null;
    }
    if (this.errorWrapper) {
      this.errorWrapper.remove();
      this.errorWrapper = null;
    }
  }

  /**
   * Enable or disable infinite scroll
   * @param {boolean} flag
   * @param {function} loadMoreCallback callback to fetch more data
   */
  enableInfiniteScroll(flag = true, loadMoreCallback = null) {
    this.infiniteScroll = flag;
    this.loadMoreCallback = typeof loadMoreCallback === "function" ? loadMoreCallback : null;

    if (flag) {
      // hide pagination UI
      if (this.paginationWrapper) this.paginationWrapper.style.display = 'none';

      // attach scroll listener to table wrapper
      const wrapper = this.table.parentElement;
      if (this.scrollListener) wrapper.removeEventListener('scroll', this.scrollListener);

      this.scrollListener = () => {
        const { scrollTop, scrollHeight, clientHeight } = wrapper;
        if (scrollTop + clientHeight >= scrollHeight - 50) {
          if (this.isLoading) return;
          // near bottom, call load more
          if (this.loadMoreCallback) this.loadMoreCallback();
        }
      };

      wrapper.addEventListener('scroll', this.scrollListener);
    } else {
      // show pagination
      if (this.paginationWrapper) this.paginationWrapper.style.display = '';
      if (this.scrollListener) this.table.parentElement.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }
  }

  /**
   * Set pagination data
   * @param {Object} param0 
   * @param {number} param0.pageNo current page
   * @param {number} param0.pageRow number of rows per page
   * @param {number} param0.totalRecord total records
   * @param {number} param0.totalPage total number of pages (optional, fallback = auto calc)
   */
  setPagination({ pageNo = 1, pageRow = 10, totalRecord = 0, totalPage = 0 } = {}) {
    this.pagination = { pageNo, pageRow, totalRecord, totalPage };

    if (this.container && this.pagination) {
      this.renderPagination();
    }
  }

  renderPagination() {
    if (!this.pagination) return;

    if (this.paginationWrapper) {
      this.paginationWrapper.remove();
      this.paginationWrapper = null;
    }

    const { pageNo, pageRow, totalPage } = this.pagination;
    this.paginationWrapper = document.createElement('div');
    this.paginationWrapper.className = 'border border-gray-200 rounded-md mb-1';

    const inner = document.createElement('div');
    inner.className = 'flex items-center justify-between text-xs text-gray-600 px-2 py-1';

    // left
    const left = document.createElement('div');
    left.className = 'flex items-center gap-1';
    const label = document.createElement('span');
    label.textContent = 'Data per halaman';
    const select = document.createElement('select');
    select.className = 'border rounded px-1 py-0.5 text-xs';
    [10, 20, 50].forEach(size => {
      const opt = document.createElement('option');
      opt.value = size;
      opt.textContent = size;
      if (pageRow === size) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      if (this.onPageChange) {
        this.onPageChange(pageNo, parseInt(select.value, 10));
      }
    });
    left.appendChild(label);
    left.appendChild(select);

    // right
    const right = document.createElement('div');
    right.className = 'flex items-center gap-1';

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = `<i class="fas fa-chevron-left"></i>`;
    prevBtn.className = 'px-1 py-0.5 border rounded text-xs disabled:opacity-40';
    prevBtn.disabled = pageNo <= 1;
    prevBtn.addEventListener('click', () => {
      if (this.onPageChange && pageNo > 1) {
        this.onPageChange(pageNo - 1, pageRow);
      }
    });

    const pageInfo = document.createElement('span');
    pageInfo.className = 'px-2 py-1 bg-white border rounded';
    pageInfo.textContent = `${pageNo} of ${totalPage}`;

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = `<i class="fas fa-chevron-right"></i>`;
    nextBtn.className = 'px-1 py-0.5 border rounded text-xs disabled:opacity-40';
    nextBtn.disabled = pageNo >= totalPage;
    nextBtn.addEventListener('click', () => {
      if (this.onPageChange && pageNo < totalPage) {
        this.onPageChange(pageNo + 1, pageRow);
      }
    });

    right.appendChild(prevBtn);
    right.appendChild(pageInfo);
    right.appendChild(nextBtn);

    inner.appendChild(left);
    inner.appendChild(right);
    this.paginationWrapper.appendChild(inner);

    this.container.prepend(this.paginationWrapper);
  }

  setOnRowClick(callback) {
    if (typeof callback === 'function') this.onRowClick = callback;
  }

  setRowStyle(callback) {
    if (typeof callback === 'function') this.rowColorCallback = callback;
  }

  setOnPageChange(callback) {
    if (typeof callback === 'function') this.onPageChange = callback;
  }

  setAutoAddRow(flag = true, append = 'end') {
    this.autoAddRow = flag;
    this.autoAddRowAppend = append;
  }

  setAutoWidth(flag = true) {
    this.autoWidth = flag;
  }

  handleAutoAddRow(row, append = 'end') {
    if (!this.autoAddRow) return;
    if (!this.validateRequiredCol(row)) {
      console.log(this.validateRequiredCol(row));
      console.log(row);
      return;
    }
    const appendedRow = this.rowData[this.autoAddRowAppend == 'end' ? this.rowData.length - 1 : 0];
    if (row !== appendedRow) return;
    // Check if any cell in the last row has a value
    const isFilled = Object.values(appendedRow).some(val => val !== '' && val != null);
    if (isFilled) {
      const newRow = {};
      this.columnDefs.forEach(col => newRow[col.field] = '');
      this.addRowData([newRow], { position: 'begin' });
    }
  }

  render() {
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'h-full overflow-auto';

    this.table = document.createElement('table');
    this.table.className = 'text-xs border-collapse';

    if (this.autoWidth) {
      this.table.classList.add('min-w-full');
    } else {
      this.table.style.tableLayout = 'fixed';
      this.table.style.width = 'max-content';
      const colgroup = document.createElement('colgroup');
      this.columnDefs.forEach(col => {
        const colEl = document.createElement('col');
        if (col.width) {
          colEl.style.width = typeof col.width === 'number' ? `${col.width}px` : col.width;
        }
        colgroup.appendChild(colEl);
      });
      this.table.appendChild(colgroup);
    }

    // === HEADER ===
    const thead = document.createElement('thead');
    thead.className = 'text-gray-500 bg-gray-50';

    if (!this.columnHasChildren) {
      const headerRow = document.createElement('tr');
      headerRow.className = 'border-b';
      this.columnDefs.forEach(col => {
        const th = this._createTh(col.headerName, col.textAlign);
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
    } else {
      const parentRow = document.createElement('tr');
      parentRow.className = 'border-b';

      const childRow = document.createElement('tr');
      childRow.className = 'border-b';

      this.columnDefs.forEach(col => {
        if (col.children && col.children.length > 0) {
          const th = this._createTh(col.headerName, col.textAlign);
          th.colSpan = col.children.length;
          parentRow.appendChild(th);

          col.children.forEach(childCol => {
            const childTh = this._createTh(childCol.headerName, childCol.textAlign);
            childRow.appendChild(childTh);
          });
        } else {
          const th = this._createTh(col.headerName, col.textAlign);
          th.rowSpan = 2;
          parentRow.appendChild(th);
        }
      });

      thead.appendChild(parentRow);
      thead.appendChild(childRow);
    }

    // === BODY ===
    this.tbody = document.createElement('tbody');

    this.table.appendChild(thead);
    this.table.appendChild(this.tbody);
    wrapper.appendChild(this.table);
    this.container.appendChild(wrapper);

    this.setRowData(this.rowData);
  }

  _createTh(headerName, textAlign) {
    const th = document.createElement('th');
    th.className = 'px-1 py-1 break-words text-left border-b bg-gray-50 sticky top-0';
    if (textAlign === 'center') th.classList.add('text-center');
    else if (textAlign === 'right') th.classList.add('text-right');

    if (typeof headerName === 'string') {
      th.innerHTML = headerName || '';
    } else if (headerName) {
      th.appendChild(headerName);
    }
    return th;
  }

  /**
 * Delete a row from the table
 * @param {Object|string|number} target - row object or key (e.g., PART_ID)
 * @param {string} [keyField="id"] - field name to match when target is a key
 */
  deleteRowData(target, keyField = "id") {
    console.log('called');
    if (!target) return;

    let rowIndex = -1;

    if (typeof target === "object") {
      // Case: row object
      rowIndex = this.rowData.findIndex(r => r === target);
    } else {
      // Case: key (string/number)
      rowIndex = this.rowData.findIndex(r => r[keyField] === target);
    }

    if (rowIndex === -1) return;

    // Remove from rowData
    this.rowData.splice(rowIndex, 1);

    // Remove the corresponding <tr>
    if (this.tbody && this.tbody.children[rowIndex]) {
      this.tbody.removeChild(this.tbody.children[rowIndex]);
    }

    // If no data left, render "No data"
    if (this.rowData.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = this.columnDefs.length || 1;
      td.className = "text-center text-gray-400 py-3";
      td.innerHTML = `<i class="fas fa-database mr-1"></i> No data available`;
      tr.appendChild(td);
      this.tbody.appendChild(tr);
    }
  }

  setRequiredCol(cols = []) {
    this.requiredColumns = cols;
  }


  validateRequiredCol(row = null) {
    if (!Array.isArray(this.requiredColumns) || this.requiredColumns.length === 0) return true;
    if (row) {
      return this.requiredColumns.every(col => {
        const val = row[col];
        console.log(val);
        return val !== undefined && val !== null && val !== '';
      });
    }
    return this.rowData.every(row => this.validateRequiredCol(row));
  }

  getAllValidRow() {
    if (!Array.isArray(this.rowData) || this.rowData.length === 0) return [];
    return this.rowData.filter(row => this.validateRequiredCol(row));
  }

}


 class ZTActionBtn {
  constructor({ className, action, title }) {
    const icon = document.createElement("i");
    icon.className = className;
    if (title) {
      icon.title = title;
    }
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      action(e);
    });
    return icon;
  }
}

 class ZTCustomElement {
  constructor({ element = null, onAttach }) {
    if (element) {
      this.element = element;
    }
    else {
      this.element = document.createElement('div');
    }
    if (typeof onAttach == 'function') {
      requestAnimationFrame(() => { onAttach(this.element); });
    }
    return this.element;
  }
}

 class ZTCheckBox {
  constructor({ row, field, onChange }) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'accent-blue-500 focus:ring-blue-500 border-gray-300 rounded';
    checkbox.checked = !!row[field];

    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    checkbox.addEventListener('change', (e) => {
      const checked = e.target.checked;
      row[field] = checked;
      if (typeof onChange === 'function') onChange(checked);
    });

    return checkbox;
  }
}

 class ZTPassword {
  constructor({ value, row, field, placeholder = '', onChange, disabled = false }) {
    const div = document.createElement('div');
    div.className = 'flex items-center w-full border gap-2 border-gray-300 rounded focus-within:ring-2 focus-within:ring-primary px-3 py-1 bg-white';
    const input = document.createElement('input');
    input.type = 'password';
    input.className = 'disabled:bg-transparent disabled:cursor-not-allowed w-full flex-1 text-xs focus:outline-none';
    input.placeholder = placeholder;
    input.disabled = disabled;
    input.value = value || row[field];

    input.onchange = (event) => {
      row[field] = event.target.value;
      if (typeof onChange === 'function') onChange(row, field, row[field]);
    };

    const btn = document.createElement('span');
    btn.className = 'text-xs text-gray-500 flex items-center gap-1 cursor-pointer';
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-eye-slash';
    btn.appendChild(icon);
    btn.addEventListener("click", () => {
      if (!input.disabled) {
        input.type = input.type == "password" ? "text" : "password";
        icon.classList.toggle("fa-eye");
        icon.classList.toggle("fa-eye-slash");
      }
    });
    div.appendChild(input);
    div.appendChild(btn);

    div.hide = (disable) => {
      if (disable) {
        div.classList.add('hidden');
      } else {
        div.classList.remove('hidden');
      }
    };

    div.disable = (disable) => {
      input.disabled = disable;
    };

    return div;
  }
}

 class ZTDate {
  constructor({ row, field, valueFormatter = 'DD/MM/YYYY', valueParser = 'YYYY-MM-DD', onChange }) {
    const input = document.createElement('input');
    input.type = 'text'; // Litepicker works with text input
    input.className = 'w-full border gap-2 border-gray-300 rounded focus-within:ring-2 focus-within:ring-primary px-3 py-1 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

    // initialize Litepicker
    const picker = new Litepicker({
      element: input,
      format: valueFormatter, // what the user sees
      singleMode: true,
    });

    // show initial value if exists
    if (row[field]) {
      try {
        const date = dayjs(row[field], valueParser); // parse from storage format
        if (date.isValid()) {
          input.value = date.format(valueFormatter); // display format
          picker.setDate(date.toDate());
        }
      } catch (err) {
        console.warn('Invalid date in row:', row[field]);
      }
    }

    // when user picks a date
    picker.on('selected', (date) => {
      const displayValue = date.format(valueFormatter); // show nicely formatted
      input.value = displayValue;

      // always save in storage format
      const newValue = date.format(valueParser);

      row[field] = newValue;
      if (typeof onChange === 'function') {
        onChange(row, field, newValue);
      }
    });

    return input;
  }
}

import { ZeaTooltip } from './ZeaTooltip.js';
 class ZTHeaderTooltip {
  constructor({ headerName = '', tooltipText = '' }) {
    const el = document.createElement('div');
    el.className = 'flex gap-1';
    const headerText = document.createElement('span');
    headerText.textContent = headerName;
    const headerIcon = new ZeaTooltip({
      child: /*html*/ `
        <div class="flex items-center justify-center w-4 h-4 rounded-full border border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-300 cursor-pointer">
          <i class="fas fa-info text-[10px]"></i>
        </div>`,
      text: tooltipText,
    });
    el.className = 'flex gap-1';
    el.appendChild(headerText);
    el.appendChild(headerIcon);
    return el;
  }
}

 class ZTInput {
  constructor({ row, field, placeholder = '', className = '', textAlign = 'left', valueFormatter, valueParser, onChange, disabled = false }) {
    const input = document.createElement('input');
    input.placeholder = placeholder;
    input.disabled = !!disabled;
    input.className = `w-full border gap-2 border-gray-300 rounded focus-within:ring-2 focus-within:ring-primary px-1 py-1 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${className}`;
    switch (textAlign) {
      case 'left':
        input.style.textAlign = 'left';
        break;
      case 'right':
        input.style.textAlign = 'right';
        break;
      case 'center':
        input.style.textAlign = 'center';
        break;
    }
    if (typeof valueFormatter === 'function') {
      input.value = valueFormatter(row[field]);
      input.addEventListener('input', (event) => {
        input.value = valueFormatter(event.target.value);
      });
    } else {
      input.value = row[field] ?? '';
    }

    input.onchange = (event) => {
      const newValue = typeof valueParser === 'function' ? valueParser(event.target.value) : event.target.value;
      row[field] = newValue;
      if (typeof onChange === 'function') onChange(newValue);
    };

    return input;
  }
}

 class ZTTextArea {
  constructor({ row, field, placeholder = '', className = '', textAlign = 'left', valueFormatter, valueParser, onChange, disabled = false }) {
    const input = document.createElement('textarea');
    input.placeholder = placeholder;
    input.disabled = !!disabled;
    input.className = `w-full border gap-2 border-gray-300 rounded focus-within:ring-2 focus-within:ring-primary px-1 py-1 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary ${className}`;
    if (typeof valueFormatter === 'function') {
      input.value = valueFormatter(row[field]);
      input.addEventListener('input', (event) => {
        input.value = valueFormatter(event.target.value);
      });
    } else {
      input.value = row[field] ?? '';
    }

    input.onchange = (event) => {
      const newValue = typeof valueParser === 'function' ? valueParser(event.target.value) : event.target.value;
      row[field] = newValue;
      if (typeof onChange === 'function') onChange(newValue);
    };

    return input;
  }
}

 class ZTSelect {
  constructor({ row, field, options = [], onChange, placeholder }) {
    const select = document.createElement('select');
    select.className = 'w-full border gap-2 border-gray-300 rounded focus-within:ring-2 focus-within:ring-primary px-3 py-1 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

    if (placeholder) {
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = placeholder;
      placeholderOption.disabled = true;
      placeholderOption.selected = !row[field];
      placeholderOption.hidden = true;
      select.appendChild(placeholderOption);
    }

    options.forEach(opt => {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      if (row[field] == opt.value) optionEl.selected = true;
      select.appendChild(optionEl);
    });

    select.addEventListener('change', e => {
      row[field] = e.target.value;
      if (typeof onChange === 'function') onChange(row, field, e.target.value);
    });

    return select;
  }
}
