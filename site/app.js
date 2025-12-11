// Daily Scans - Site JavaScript

(function() {
  // Elements
  const scanContent = document.getElementById('scan-content');
  const currentDateEl = document.getElementById('current-date');
  const prevBtn = document.getElementById('prev-day');
  const nextBtn = document.getElementById('next-day');
  const datePicker = document.getElementById('date-picker');
  const dateDropdown = document.getElementById('date-dropdown');
  const dateList = document.getElementById('date-list');
  const scanTitleEl = document.getElementById('scan-title');
  const scanSubtitleEl = document.getElementById('scan-subtitle');

  // State
  let availableScans = []; // Array of {id, date, name}
  let currentIndex = 0;

  // Get all scans for a specific date
  function getScansForDate(date) {
    return availableScans
      .map((scan, index) => ({ ...scan, index }))
      .filter(scan => scan.date === date);
  }

  // Initialize
  function init() {
    // Get scans from manifest (loaded via manifest.js)
    if (typeof SCAN_MANIFEST !== 'undefined' && SCAN_MANIFEST.scans) {
      availableScans = SCAN_MANIFEST.scans;
    }

    if (availableScans.length === 0) {
      showNoScans();
      return;
    }

    // Check URL for specific scan
    const urlParams = new URLSearchParams(window.location.search);
    const requestedDate = urlParams.get('date');

    if (requestedDate) {
      const idx = availableScans.findIndex(s => s.id === requestedDate);
      if (idx !== -1) currentIndex = idx;
    }

    // Build date picker
    buildDateList();

    // Load initial scan
    loadScan(availableScans[currentIndex].id);

    // Setup event listeners
    setupEventListeners();
  }

  function buildDateList() {
    dateList.innerHTML = '';

    // Group scans by month, then by day
    const grouped = {};
    availableScans.forEach((scan, index) => {
      const dateObj = parseDate(scan.date);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!grouped[monthKey]) {
        grouped[monthKey] = { label: monthLabel, days: {} };
      }

      if (!grouped[monthKey].days[scan.date]) {
        grouped[monthKey].days[scan.date] = [];
      }
      grouped[monthKey].days[scan.date].push({ ...scan, index });
    });

    // Get sorted month keys (most recent first)
    const monthKeys = Object.keys(grouped).sort().reverse();

    monthKeys.forEach((monthKey, monthIndex) => {
      const group = grouped[monthKey];
      const dayCount = Object.keys(group.days).length;

      // Create month header
      const monthHeader = document.createElement('div');
      monthHeader.className = 'month-header' + (monthIndex === 0 ? ' expanded' : '');
      monthHeader.innerHTML = `
        <span class="month-toggle">${monthIndex === 0 ? '▼' : '▶'}</span>
        <span class="month-label">${group.label}</span>
        <span class="month-count">${dayCount}</span>
      `;

      // Create days container
      const daysContainer = document.createElement('div');
      daysContainer.className = 'month-dates' + (monthIndex === 0 ? ' expanded' : '');

      // Get sorted days (most recent first)
      const dayKeys = Object.keys(group.days).sort().reverse();

      dayKeys.forEach((dayKey) => {
        const scans = group.days[dayKey];
        const dateObj = parseDate(dayKey);
        const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = dateObj.getDate();

        // Check if any scan in this day is active
        const hasActiveScan = scans.some(s => s.index === currentIndex);

        // Create day row
        const dayRow = document.createElement('div');
        dayRow.className = 'day-row' + (hasActiveScan ? ' has-active' : '');

        // Day label
        const dayLabel = document.createElement('div');
        dayLabel.className = 'day-label';
        dayLabel.textContent = `${weekday} ${dayNum}`;
        dayRow.appendChild(dayLabel);

        // Scans for this day
        const scansRow = document.createElement('div');
        scansRow.className = 'day-scans';

        scans.forEach((scan) => {
          const scanItem = document.createElement('button');
          scanItem.className = 'scan-item' + (scan.index === currentIndex ? ' active' : '');
          scanItem.dataset.index = scan.index;
          scanItem.textContent = scan.name || 'scan';

          scanItem.addEventListener('click', (e) => {
            e.stopPropagation();
            currentIndex = scan.index;
            loadScan(scan.id);
            closeDropdown();
            updateDateList();
          });

          scansRow.appendChild(scanItem);
        });

        dayRow.appendChild(scansRow);
        daysContainer.appendChild(dayRow);
      });

      // Toggle month expansion
      monthHeader.addEventListener('click', () => {
        const isExpanded = monthHeader.classList.contains('expanded');
        monthHeader.classList.toggle('expanded');
        daysContainer.classList.toggle('expanded');
        monthHeader.querySelector('.month-toggle').textContent = isExpanded ? '▶' : '▼';
      });

      dateList.appendChild(monthHeader);
      dateList.appendChild(daysContainer);
    });
  }

  function updateDateList() {
    // Update scan items
    const scanItems = dateList.querySelectorAll('.scan-item');
    scanItems.forEach((item) => {
      const index = parseInt(item.dataset.index, 10);
      item.classList.toggle('active', index === currentIndex);
    });

    // Update day rows
    const dayRows = dateList.querySelectorAll('.day-row');
    dayRows.forEach((row) => {
      const hasActive = row.querySelector('.scan-item.active');
      row.classList.toggle('has-active', !!hasActive);
    });
  }

  function setupEventListeners() {
    // Previous scan
    prevBtn.addEventListener('click', () => {
      if (currentIndex < availableScans.length - 1) {
        currentIndex++;
        loadScan(availableScans[currentIndex].id);
        updateDateList();
      }
    });

    // Next scan
    nextBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        loadScan(availableScans[currentIndex].id);
        updateDateList();
      }
    });

    // Date picker toggle
    datePicker.addEventListener('click', toggleDropdown);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dateDropdown.contains(e.target) && !datePicker.contains(e.target)) {
        closeDropdown();
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        prevBtn.click();
      } else if (e.key === 'ArrowRight') {
        nextBtn.click();
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });
  }

  function toggleDropdown() {
    dateDropdown.classList.toggle('open');
  }

  function closeDropdown() {
    dateDropdown.classList.remove('open');
  }

  async function loadScan(scanId) {
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('date', scanId);
    window.history.replaceState({}, '', url);

    // Extract date part (first 10 chars) for display
    const datePart = scanId.substring(0, 10);

    // Update header
    currentDateEl.textContent = formatDateDisplay(datePart);

    // Update nav buttons
    prevBtn.disabled = currentIndex >= availableScans.length - 1;
    nextBtn.disabled = currentIndex <= 0;

    // Show loading
    scanContent.innerHTML = '<div class="loading">Loading scan...</div>';

    try {
      const response = await fetch(`scans/${scanId}.html`);

      if (!response.ok) {
        throw new Error('Scan not found');
      }

      const html = await response.text();

      // Extract just the container div from the full HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const container = doc.querySelector('.container');

      if (container) {
        // Extract title and subtitle from scan header
        const headerH1 = container.querySelector('.header-left h1');
        const headerSubtitle = container.querySelector('.header-left .subtitle');

        if (headerH1) {
          scanTitleEl.textContent = headerH1.textContent;
        }
        if (headerSubtitle) {
          scanSubtitleEl.textContent = headerSubtitle.textContent;
          scanSubtitleEl.style.display = 'block';
        } else {
          scanSubtitleEl.style.display = 'none';
        }

        // Remove the footer from embedded scan (we have site footer)
        const footer = container.querySelector('.footer');
        if (footer) footer.remove();

        // Build scan selector if multiple scans for this date
        const scansForDate = getScansForDate(datePart);
        let selectorHtml = '';

        if (scansForDate.length > 1) {
          const pills = scansForDate.map(scan => {
            const isActive = scan.index === currentIndex;
            const label = scan.name || 'scan';
            return `<button class="scan-pill${isActive ? ' active' : ''}" data-index="${scan.index}">${label}</button>`;
          }).join('');

          selectorHtml = `
            <div class="scan-selector">
              <span class="scan-selector-label">Scans</span>
              <div class="scan-selector-pills">${pills}</div>
            </div>
          `;
        }

        scanContent.innerHTML = selectorHtml + container.outerHTML;

        // Add click handlers to scan pills
        scanContent.querySelectorAll('.scan-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            const index = parseInt(pill.dataset.index, 10);
            currentIndex = index;
            loadScan(availableScans[index].id);
            updateDateList();
          });
        });

        // Re-run the table sorting script, ticker copy, and column resize
        initTableSorting();
        initTickerCopy();
        initColumnResize();
      } else {
        throw new Error('Invalid scan format');
      }
    } catch (error) {
      scanContent.innerHTML = `
        <div class="error">
          <h2>Scan not available</h2>
          <p>No scan found for ${formatDateDisplay(datePart)}</p>
        </div>
      `;
    }
  }

  function initTableSorting() {
    const table = scanContent.querySelector('table');
    if (!table) return;

    const headers = table.querySelectorAll('thead th');
    const tbody = table.querySelector('tbody');
    let currentSort = { col: null, asc: true };

    function parseValue(text, type) {
      text = text.trim();
      if (text === '-' || text === '') return null;

      if (type === 'number') {
        return parseFloat(text.replace(/[$,BMK]/g, '').replace(/[()]/g, '')) *
               (text.includes('B') ? 1000 : text.includes('M') ? 1 : text.includes('K') ? 0.001 : 1);
      }
      if (type === 'percent') {
        return parseFloat(text.replace(/[%+]/g, ''));
      }
      return text.toLowerCase();
    }

    function sortTable(colIndex, type) {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const asc = currentSort.col === colIndex ? !currentSort.asc : false;

      rows.sort((a, b) => {
        const aVal = parseValue(a.cells[colIndex].textContent, type);
        const bVal = parseValue(b.cells[colIndex].textContent, type);

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        if (typeof aVal === 'string') {
          return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return asc ? aVal - bVal : bVal - aVal;
      });

      rows.forEach(row => tbody.appendChild(row));

      headers.forEach((h, i) => {
        h.classList.remove('sorted');
        const arrow = h.querySelector('.sort-arrow');
        if (arrow) arrow.textContent = '↕';
      });

      headers[colIndex].classList.add('sorted');
      const arrow = headers[colIndex].querySelector('.sort-arrow');
      if (arrow) arrow.textContent = asc ? '↑' : '↓';

      currentSort = { col: colIndex, asc };
    }

    headers.forEach((header, index) => {
      header.addEventListener('click', () => {
        const type = header.dataset.type || 'string';
        sortTable(index, type);
      });
    });
  }

  function initTickerCopy() {
    scanContent.querySelectorAll('.ticker').forEach(ticker => {
      ticker.addEventListener('click', async (e) => {
        e.stopPropagation();
        const originalText = ticker.textContent.trim();
        if (ticker.dataset.copying) return; // Prevent double-clicks during animation

        try {
          await navigator.clipboard.writeText(originalText);
          ticker.dataset.copying = 'true';

          // Fade out
          ticker.classList.add('copying');
          setTimeout(() => {
            // Swap text
            ticker.textContent = 'Copied';
            ticker.classList.remove('copying');

            // Wait, then fade out again
            setTimeout(() => {
              ticker.classList.add('copying');
              setTimeout(() => {
                // Restore original
                ticker.textContent = originalText;
                ticker.classList.remove('copying');
                delete ticker.dataset.copying;
              }, 150);
            }, 600);
          }, 150);
        } catch (err) {
          console.error('Copy failed:', err);
        }
      });
    });
  }

  function initColumnResize() {
    const table = scanContent.querySelector('table');
    if (!table) return;

    const headers = table.querySelectorAll('thead th');
    let isResizing = false;
    let currentTh = null;
    let startX = 0;
    let startWidth = 0;

    // Add resize handles to each header
    headers.forEach((th) => {
      // Skip if already has resize handle
      if (th.querySelector('.resize-handle')) return;

      const handle = document.createElement('div');
      handle.className = 'resize-handle';
      th.appendChild(handle);

      // Drag to resize
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        currentTh = th;
        startX = e.pageX;
        startWidth = th.offsetWidth;
        handle.classList.add('resizing');
        table.classList.add('resizing');
      });

      // Double-click to auto-fit
      handle.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        autoFitColumn(th);
      });
    });

    // Mouse move handler
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const diff = e.pageX - startX;
      const newWidth = Math.max(40, startWidth + diff);
      currentTh.style.width = newWidth + 'px';
      currentTh.style.minWidth = newWidth + 'px';
    });

    // Mouse up handler
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        table.classList.remove('resizing');
        const handle = currentTh.querySelector('.resize-handle');
        if (handle) handle.classList.remove('resizing');
        currentTh = null;
      }
    });

    function autoFitColumn(th) {
      const colIndex = Array.from(headers).indexOf(th);
      const tbody = table.querySelector('tbody');
      const rows = tbody.querySelectorAll('tr');

      // Create temp span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.position = 'absolute';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.font = window.getComputedStyle(th).font;
      document.body.appendChild(tempSpan);

      // Measure header width
      tempSpan.textContent = th.textContent;
      let maxWidth = tempSpan.offsetWidth + 30; // padding

      // Measure each cell in the column
      rows.forEach(row => {
        const cell = row.cells[colIndex];
        if (cell) {
          tempSpan.style.font = window.getComputedStyle(cell).font;
          tempSpan.textContent = cell.textContent;
          maxWidth = Math.max(maxWidth, tempSpan.offsetWidth + 24);
        }
      });

      document.body.removeChild(tempSpan);

      th.style.width = maxWidth + 'px';
      th.style.minWidth = maxWidth + 'px';
    }
  }

  function showNoScans() {
    currentDateEl.textContent = 'No scans';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    datePicker.disabled = true;

    scanContent.innerHTML = `
      <div class="no-scan">
        <h2>No scans yet</h2>
        <p>Check back soon for daily momentum scans.</p>
      </div>
    `;
  }

  // Date utilities
  function parseDate(dateStr) {
    // Parse YYYY-MM-DD format
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDateDisplay(dateStr) {
    const date = parseDate(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  // Start
  init();
})();
