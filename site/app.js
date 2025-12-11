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

  // State
  let availableDates = [];
  let currentIndex = 0;

  // Initialize
  function init() {
    // Get dates from manifest (loaded via manifest.js)
    if (typeof SCAN_MANIFEST !== 'undefined' && SCAN_MANIFEST.dates) {
      availableDates = SCAN_MANIFEST.dates.sort().reverse(); // Most recent first
    }

    if (availableDates.length === 0) {
      showNoScans();
      return;
    }

    // Check URL for specific date
    const urlParams = new URLSearchParams(window.location.search);
    const requestedDate = urlParams.get('date');

    if (requestedDate && availableDates.includes(requestedDate)) {
      currentIndex = availableDates.indexOf(requestedDate);
    }

    // Build date picker
    buildDateList();

    // Load initial scan
    loadScan(availableDates[currentIndex]);

    // Setup event listeners
    setupEventListeners();
  }

  function buildDateList() {
    dateList.innerHTML = '';

    // Group dates by month
    const grouped = {};
    availableDates.forEach((date, index) => {
      const dateObj = parseDate(date);
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!grouped[monthKey]) {
        grouped[monthKey] = { label: monthLabel, dates: [] };
      }
      grouped[monthKey].dates.push({ date, index });
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
        <span class="month-count">${group.dates.length}</span>
      `;

      // Create dates container
      const datesContainer = document.createElement('div');
      datesContainer.className = 'month-dates' + (monthIndex === 0 ? ' expanded' : '');

      // Add dates to container
      group.dates.forEach(({ date, index }) => {
        const item = document.createElement('div');
        item.className = 'date-item' + (index === currentIndex ? ' active' : '');
        item.dataset.index = index;

        const dateObj = parseDate(date);
        const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = dateObj.getDate();

        item.innerHTML = `
          <span class="date-day">${weekday} ${dayNum}</span>
        `;

        item.addEventListener('click', () => {
          currentIndex = index;
          loadScan(date);
          closeDropdown();
          updateDateList();
        });

        datesContainer.appendChild(item);
      });

      // Toggle month expansion
      monthHeader.addEventListener('click', () => {
        const isExpanded = monthHeader.classList.contains('expanded');
        monthHeader.classList.toggle('expanded');
        datesContainer.classList.toggle('expanded');
        monthHeader.querySelector('.month-toggle').textContent = isExpanded ? '▶' : '▼';
      });

      dateList.appendChild(monthHeader);
      dateList.appendChild(datesContainer);
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
    // Previous day
    prevBtn.addEventListener('click', () => {
      if (currentIndex < availableDates.length - 1) {
        currentIndex++;
        loadScan(availableDates[currentIndex]);
        updateDateList();
      }
    });

    // Next day
    nextBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        loadScan(availableDates[currentIndex]);
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

  async function loadScan(date) {
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('date', date);
    window.history.replaceState({}, '', url);

    // Update header
    currentDateEl.textContent = formatDateDisplay(date);

    // Update nav buttons
    prevBtn.disabled = currentIndex >= availableDates.length - 1;
    nextBtn.disabled = currentIndex <= 0;

    // Show loading
    scanContent.innerHTML = '<div class="loading">Loading scan...</div>';

    try {
      const response = await fetch(`scans/${date}.html`);

      if (!response.ok) {
        throw new Error('Scan not found');
      }

      const html = await response.text();

      // Extract just the container div from the full HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const container = doc.querySelector('.container');

      if (container) {
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
          <p>No scan found for ${formatDateDisplay(date)}</p>
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
