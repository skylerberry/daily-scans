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

    // Group scans by month
    const grouped = {};
    availableScans.forEach((scan, index) => {
      const dateObj = parseDate(scan.date);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!grouped[monthKey]) {
        grouped[monthKey] = { label: monthLabel, scans: [] };
      }
      grouped[monthKey].scans.push({ ...scan, index });
    });

    // Get sorted month keys (most recent first)
    const monthKeys = Object.keys(grouped).sort().reverse();

    monthKeys.forEach((monthKey, monthIndex) => {
      const group = grouped[monthKey];

      // Create month header
      const monthHeader = document.createElement('div');
      monthHeader.className = 'month-header' + (monthIndex === 0 ? ' expanded' : '');
      monthHeader.innerHTML = `
        <span class="month-toggle">${monthIndex === 0 ? '▼' : '▶'}</span>
        <span class="month-label">${group.label}</span>
        <span class="month-count">${group.scans.length}</span>
      `;

      // Create scans container
      const scansContainer = document.createElement('div');
      scansContainer.className = 'month-dates' + (monthIndex === 0 ? ' expanded' : '');

      // Add scans to container
      group.scans.forEach((scan) => {
        const item = document.createElement('div');
        item.className = 'date-item' + (scan.index === currentIndex ? ' active' : '');
        item.dataset.index = scan.index;

        const dateObj = parseDate(scan.date);
        const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = dateObj.getDate();

        // Show name if present
        const nameLabel = scan.name ? ` — ${scan.name}` : '';

        item.innerHTML = `
          <span class="date-day">${weekday} ${dayNum}${nameLabel}</span>
        `;

        item.addEventListener('click', () => {
          currentIndex = scan.index;
          loadScan(scan.id);
          closeDropdown();
          updateDateList();
        });

        scansContainer.appendChild(item);
      });

      // Toggle month expansion
      monthHeader.addEventListener('click', () => {
        const isExpanded = monthHeader.classList.contains('expanded');
        monthHeader.classList.toggle('expanded');
        scansContainer.classList.toggle('expanded');
        monthHeader.querySelector('.month-toggle').textContent = isExpanded ? '▶' : '▼';
      });

      dateList.appendChild(monthHeader);
      dateList.appendChild(scansContainer);
    });
  }

  function updateDateList() {
    const items = dateList.querySelectorAll('.date-item');
    items.forEach((item) => {
      const index = parseInt(item.dataset.index, 10);
      item.classList.toggle('active', index === currentIndex);
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

        scanContent.innerHTML = container.outerHTML;

        // Re-run the table sorting script
        initTableSorting();
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
