#!/usr/bin/env python3
"""
Momentum Scan Table Generator
Converts stock screener CSV exports into beautiful, shareable HTML/PNG tables.

Usage:
    python momentum_scan.py <csv_file> [options]

Options:
    --sort COLUMN       Sort by column (default: BIS)
    --order asc|desc    Sort order (default: desc)
    --output NAME       Output filename without extension (default: momentum_scan)
    --png               Also generate PNG image (requires playwright)
    --dark              Use dark mode theme
    --help              Show this help message

Examples:
    python momentum_scan.py stocks_export.csv
    python momentum_scan.py stocks_export.csv --sort "BIS" --order desc
    python momentum_scan.py stocks_export.csv --png --dark
"""

import csv
import argparse
import sys
import os
from datetime import datetime
from pathlib import Path


def parse_percent(value):
    """Parse percentage string to float."""
    if not value or str(value).strip() == '':
        return None
    try:
        return float(str(value).replace('%', '').replace(',', '').strip())
    except (ValueError, AttributeError):
        return None


def parse_number(value):
    """Parse number string to float."""
    if not value or str(value).strip() == '':
        return None
    try:
        return float(str(value).replace(',', '').strip())
    except (ValueError, AttributeError):
        return None


def format_liquidity(value):
    """Format liquidity as $XXM or $X.XB."""
    num = parse_number(value)
    if num is None:
        return '-'
    if num >= 1_000_000_000:
        return f'${num/1_000_000_000:.1f}B'
    return f'${num/1_000_000:.0f}M'


def format_price(value):
    """Format price with dollar sign."""
    num = parse_number(value)
    if num is None:
        return '-'
    return f'${num:,.2f}'


def format_rs_badge(value):
    """Format RS as colored badge."""
    num = parse_percent(value)
    if num is None:
        return '-', 'rs-low'

    if num >= 90:
        cls = 'rs-elite'
    elif num >= 80:
        cls = 'rs-high'
    elif num >= 60:
        cls = 'rs-mid'
    else:
        cls = 'rs-low'

    return f'{num:.0f}', cls


def format_bis(value):
    """Format BIS score with color."""
    num = parse_number(value)
    if num is None:
        return '-', 'bis-weak'

    if num >= 1.0:
        cls = 'bis-strong'
    elif num >= 0.5:
        cls = 'bis-moderate'
    else:
        cls = 'bis-weak'

    return f'{num:.2f}', cls


def format_rvol(value):
    """Format relative volume with color."""
    num = parse_number(value)
    if num is None:
        return '-', 'rvol-low'

    if num >= 1.5:
        cls = 'rvol-high'
    elif num >= 1.1:
        cls = 'rvol-mid'
    else:
        cls = 'rvol-low'

    return f'{num:.2f}', cls


def format_contraction(value):
    """Format contraction percentage with intensity."""
    num = parse_number(value)
    if num is None:
        return '-', 'contr-low'

    if num >= 70:
        cls = 'contr-high'
    elif num >= 50:
        cls = 'contr-mid'
    else:
        cls = 'contr-low'

    return f'{num:.0f}%', cls


def format_closing_range(value):
    """Format daily closing range with color."""
    num = parse_percent(value)
    if num is None:
        return '-', 'dcr-low'

    if num >= 80:
        cls = 'dcr-high'
    elif num >= 50:
        cls = 'dcr-mid'
    else:
        cls = 'dcr-low'

    return f'{num:.0f}%', cls


def format_from_open(value):
    """Format % from open with color."""
    num = parse_number(value)
    if num is None:
        return '-', 'from-open-neutral'

    if num >= 3:
        cls = 'from-open-high'
    elif num >= 0:
        cls = 'from-open-mid'
    else:
        cls = 'from-open-neg'

    return f'{num:+.1f}%', cls


def shorten_name(name):
    """Shorten company name."""
    if not name:
        return ''
    return (name.replace(' Inc.', '')
                .replace(' Inc', '')
                .replace(' Corporation', '')
                .replace(' Corp.', '')
                .replace(' Corp', '')
                .replace(' Ltd', '')
                .replace(' plc', '')
                .replace(' Holdings', '')
                .replace(' Holding', '')
                .replace(' Group', '')
                .replace(' Technology', ' Tech')
                .replace(' Technologies', ' Tech'))


def get_sort_value(row, sort_col):
    """Get numeric sort value for a column."""
    # Map display names to CSV column names
    col_map = {
        'RS': 'Composite RS',
        'DCR': 'Daily Closing Range',
        'P.Contr': 'Price Contraction',
    }

    actual_col = col_map.get(sort_col, sort_col)
    value = row.get(actual_col, '')

    # Columns that are percentages
    pct_cols = ['Composite RS', 'Daily Closing Range', 'Price Contraction', 'ADR %']

    if actual_col in pct_cols:
        return parse_percent(value) if parse_percent(value) is not None else -999999
    else:
        return parse_number(value) if parse_number(value) is not None else -999999


def load_csv(filepath):
    """Load and parse CSV file."""
    rows = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def generate_html(rows, dark_mode=False, title="Momentum Scan", subtitle="", emoji="📡"):
    """Generate HTML table from rows."""

    today = datetime.now().strftime('%b %d, %Y')
    subtitle_html = f'<div class="subtitle">{subtitle}</div>' if subtitle else ''
    emoji_prefix = f'{emoji} ' if emoji else ''

    # Flat design theme colors
    if dark_mode:
        theme = {
            'bg': '#0f0f0f',
            'container_bg': '#1a1a1a',
            'container_border': '#2a2a2a',
            'text': '#ffffff',
            'text_secondary': '#e0e0e0',
            'text_muted': '#888888',
            'border': '#2a2a2a',
            'row_alt': '#151515',
            'hover': '#222222',
            'thead_bg': '#252525',
            'tooltip_bg': '#333333',
            'tooltip_text': '#ffffff',
            'rs_elite_bg': '#22c55e', 'rs_elite_text': '#ffffff',
            'rs_high_bg': '#4ade80', 'rs_high_text': '#052e16',
            'rs_mid_bg': '#fbbf24', 'rs_mid_text': '#422006',
            'rs_low_bg': '#404040', 'rs_low_text': '#a0a0a0',
            'bis_strong': '#22c55e', 'bis_moderate': '#fbbf24', 'bis_weak': '#666666',
            'rvol_high': '#22c55e', 'rvol_mid': '#fbbf24', 'rvol_low': '#666666',
            'contr_high': '#22c55e', 'contr_mid': '#fbbf24', 'contr_low': '#666666',
            'dcr_high': '#22c55e', 'dcr_mid': '#fbbf24', 'dcr_low': '#666666',
            'from_open_high': '#22c55e', 'from_open_mid': '#888888', 'from_open_neg': '#ef4444',
        }
    else:
        theme = {
            'bg': '#ffffff',
            'container_bg': '#ffffff',
            'container_border': '#e0e0e0',
            'text': '#111111',
            'text_secondary': '#333333',
            'text_muted': '#666666',
            'border': '#e8e8e8',
            'row_alt': '#fafafa',
            'hover': '#f5f5f5',
            'thead_bg': '#f8f8f8',
            'tooltip_bg': '#1f2937',
            'tooltip_text': '#ffffff',
            'rs_elite_bg': '#16a34a', 'rs_elite_text': '#ffffff',
            'rs_high_bg': '#4ade80', 'rs_high_text': '#052e16',
            'rs_mid_bg': '#fbbf24', 'rs_mid_text': '#422006',
            'rs_low_bg': '#e5e5e5', 'rs_low_text': '#737373',
            'bis_strong': '#16a34a', 'bis_moderate': '#d97706', 'bis_weak': '#9ca3af',
            'rvol_high': '#16a34a', 'rvol_mid': '#d97706', 'rvol_low': '#9ca3af',
            'contr_high': '#16a34a', 'contr_mid': '#d97706', 'contr_low': '#9ca3af',
            'dcr_high': '#16a34a', 'dcr_mid': '#d97706', 'dcr_low': '#9ca3af',
            'from_open_high': '#16a34a', 'from_open_mid': '#6b7280', 'from_open_neg': '#dc2626',
        }

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}

    body {{
      background: {theme['bg']};
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 24px;
      min-height: 100vh;
    }}

    .container {{
      max-width: 1100px;
      margin: 0 auto;
      background: {theme['container_bg']};
      border: 1px solid {theme['container_border']};
    }}

    .header {{
      padding: 16px 20px;
      border-bottom: 1px solid {theme['border']};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    .header-left h1 {{
      font-size: 16px;
      font-weight: 700;
      color: {theme['text']};
      letter-spacing: -0.3px;
    }}

    .header-left .subtitle {{
      font-size: 11px;
      color: {theme['text_muted']};
      font-weight: 500;
      margin-top: 2px;
    }}

    .header-right {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}

    .date {{
      font-size: 12px;
      color: {theme['text_muted']};
      font-weight: 500;
    }}

    .count {{
      font-size: 11px;
      font-weight: 600;
      color: {theme['text_muted']};
      background: {theme['thead_bg']};
      padding: 4px 8px;
      border: 1px solid {theme['border']};
    }}

    .table-wrapper {{
      overflow-x: auto;
      max-height: 80vh;
      overflow-y: auto;
    }}

    table {{
      width: 100%;
      border-collapse: collapse;
    }}

    thead th {{
      padding: 10px 12px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
      color: {theme['text_muted']};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: transparent;
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
      position: sticky;
      top: 0;
      z-index: 20;
    }}

    thead th::after {{
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      background: {theme['thead_bg']};
      border-bottom: 1px solid {theme['border']};
      pointer-events: none;
      z-index: -1;
    }}

    thead th:first-child {{ padding-left: 16px; }}
    thead th:last-child {{ padding-right: 16px; }}
    thead th:hover::after {{ background: {theme['hover']}; }}

    thead th .sort-arrow {{
      margin-left: 3px;
      opacity: 0.3;
      font-size: 9px;
    }}

    thead th.sorted .sort-arrow {{ opacity: 1; }}

    /* Tooltip styles */
    .has-tooltip {{
      /* FIX: Removed position: relative to avoid overriding sticky on th */
    }}

    .has-tooltip .tooltip {{
      visibility: hidden;
      opacity: 0;
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-top: 8px;
      padding: 10px 12px;
      background: {theme['tooltip_bg']};
      color: {theme['tooltip_text']};
      font-size: 11px;
      font-weight: 400;
      line-height: 1.5;
      text-transform: none;
      letter-spacing: 0;
      white-space: normal;
      width: 260px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 100;
      transition: opacity 0.15s ease;
    }}

    .has-tooltip .tooltip::before {{
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 6px solid transparent;
      border-bottom-color: {theme['tooltip_bg']};
    }}

    .has-tooltip:hover .tooltip {{
      visibility: visible;
      opacity: 1;
    }}

    /* Right-align tooltip for last column */
    th:last-child.has-tooltip .tooltip {{
      left: auto;
      right: 0;
      transform: none;
    }}

    th:last-child.has-tooltip .tooltip::before {{
      left: auto;
      right: 16px;
      transform: none;
    }}

    .tooltip-title {{
      font-weight: 600;
      margin-bottom: 4px;
      display: block;
      font-size: 11px;
    }}

    tbody tr {{
      border-bottom: 1px solid {theme['border']};
    }}

    tbody tr:nth-child(even) {{ background: {theme['row_alt']}; }}
    tbody tr:hover {{ background: {theme['hover']}; }}

    tbody td {{
      padding: 8px 12px;
      font-size: 12px;
      color: {theme['text_secondary']};
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }}

    tbody td:first-child {{ padding-left: 16px; }}
    tbody td:last-child {{ padding-right: 16px; }}

    .ticker {{ font-weight: 700; color: {theme['text']}; }}
    .name {{ font-size: 11px; color: {theme['text_muted']}; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }}
    .price {{ font-weight: 600; color: {theme['text']}; }}
    .liq {{ font-size: 11px; color: {theme['text_muted']}; }}
    .adr {{ color: {theme['text_muted']}; }}
    .rank {{ color: {theme['text_muted']}; font-size: 11px; }}

    .rs-badge {{
      display: inline-block;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 700;
      min-width: 32px;
      text-align: center;
    }}

    .rs-elite {{ background: {theme['rs_elite_bg']}; color: {theme['rs_elite_text']}; }}
    .rs-high {{ background: {theme['rs_high_bg']}; color: {theme['rs_high_text']}; }}
    .rs-mid {{ background: {theme['rs_mid_bg']}; color: {theme['rs_mid_text']}; }}
    .rs-low {{ background: {theme['rs_low_bg']}; color: {theme['rs_low_text']}; }}

    .bis-strong {{ color: {theme['bis_strong']}; font-weight: 700; }}
    .bis-moderate {{ color: {theme['bis_moderate']}; font-weight: 600; }}
    .bis-weak {{ color: {theme['bis_weak']}; }}

    .rvol-high {{ color: {theme['rvol_high']}; font-weight: 600; }}
    .rvol-mid {{ color: {theme['rvol_mid']}; font-weight: 600; }}
    .rvol-low {{ color: {theme['rvol_low']}; }}

    .contr-high {{ color: {theme['contr_high']}; font-weight: 600; }}
    .contr-mid {{ color: {theme['contr_mid']}; font-weight: 600; }}
    .contr-low {{ color: {theme['contr_low']}; }}

    .dcr-high {{ color: {theme['dcr_high']}; font-weight: 600; }}
    .dcr-mid {{ color: {theme['dcr_mid']}; font-weight: 600; }}
    .dcr-low {{ color: {theme['dcr_low']}; }}

    .from-open-high {{ color: {theme['from_open_high']}; font-weight: 600; }}
    .from-open-mid {{ color: {theme['from_open_mid']}; }}
    .from-open-neg {{ color: {theme['from_open_neg']}; font-weight: 600; }}

    .footer {{
      padding: 12px 16px;
      border-top: 1px solid {theme['border']};
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: {theme['text_muted']};
    }}

    .footer .branding a {{
      color: {theme['text_muted']};
      text-decoration: none;
      font-weight: 600;
      transition: color 0.15s ease;
    }}

    .footer .branding a:hover {{
      color: {theme['text']};
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <h1>{emoji_prefix}{title}</h1>
        {subtitle_html}
      </div>
      <div class="header-right">
        <div class="date">{today}</div>
        <div class="count">{len(rows)} stocks</div>
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th data-col="0" data-type="string">Ticker <span class="sort-arrow">↕</span></th>
            <th data-col="1" data-type="percent" class="has-tooltip">RS <span class="sort-arrow">↕</span>
              <span class="tooltip"><span class="tooltip-title">Composite Relative Strength</span>Combines multiple timeframes (1M, 3M, 6M, 1Y) into an aggregate score. Percentile ranking vs all stocks. 90+ = top 10% performers across timeframes.</span>
            </th>
            <th data-col="2" data-type="string">Name <span class="sort-arrow">↕</span></th>
            <th data-col="3" data-type="number">Price <span class="sort-arrow">↕</span></th>
            <th data-col="4" data-type="number" class="has-tooltip">Liq <span class="sort-arrow">↕</span>
              <span class="tooltip"><span class="tooltip-title">Daily Liquidity</span>20-day average dollar volume (price × volume). Indicates how easily you can enter/exit positions. Higher = more liquid, tighter spreads, less slippage.</span>
            </th>
            <th data-col="5" data-type="number" class="has-tooltip">BIS <span class="sort-arrow">↕</span>
              <span class="tooltip"><span class="tooltip-title">Breakout Intensity Score</span>Measures breakout strength by combining price move (% change / ADR), relative volume vs 20-day avg, and intraday efficiency (close position in day's range). Higher = stronger conviction breakout.</span>
            </th>
            <th data-col="6" data-type="percent" class="has-tooltip">DCR <span class="sort-arrow">↕</span>
              <span class="tooltip"><span class="tooltip-title">Daily Closing Range</span>Where price closed within the day's high-low range. 100% = closed at the high, 0% = closed at the low. Higher values indicate bullish closing action.</span>
            </th>
            <th data-col="7" data-type="percent" class="has-tooltip">ADR% <span class="sort-arrow">↕</span>
              <span class="tooltip"><span class="tooltip-title">Average Daily Range</span>Average of (High - Low) / Close over the last 20 trading days. Excludes overnight gaps. Useful for position sizing and setting stop losses.</span>
            </th>
            <th data-col="8" data-type="percent" class="has-tooltip">P.Contr <span class="sort-arrow">↕</span>
              <span class="tooltip"><span class="tooltip-title">Price Contraction</span>Volatility contraction score over 15 sessions. Ranks current session's price range vs recent ranges. Higher = tighter consolidation (current range narrower than recent sessions). Low values indicate volatility expansion.</span>
            </th>
            <th data-col="9" data-type="number" class="has-tooltip">RVol <span class="sort-arrow">↕</span>
              <span class="tooltip"><span class="tooltip-title">Relative Volume</span>Today's volume divided by 20-day average volume. 1.0 = normal, 1.5+ = elevated interest, 2.0+ = unusual activity worth attention.</span>
            </th>
            <th data-col="10" data-type="number">% Open <span class="sort-arrow">↕</span></th>
            <th data-col="11" data-type="number" class="has-tooltip">Rank <span class="sort-arrow">↕</span>
              <span class="tooltip"><span class="tooltip-title">RS Rank</span>Custom score combining performance across multiple timeframes (1M to 1Y) plus distance from 52-week high/low. Provides a comprehensive view of relative strength vs peers in various market conditions.</span>
            </th>
          </tr>
        </thead>
        <tbody>
'''

    # Generate data rows
    for row in rows:
        ticker = row.get('Ticker', '')
        name = shorten_name(row.get('Name', ''))
        price = format_price(row.get('Price', ''))
        liquidity = format_liquidity(row.get('Daily Liquidity', ''))

        bis_val, bis_cls = format_bis(row.get('BIS', ''))

        dcr_val, dcr_cls = format_closing_range(row.get('Daily Closing Range', ''))

        adr_num = parse_number(row.get('ADR %', ''))
        adr_val = f'{adr_num:.1f}%' if adr_num else '-'

        price_contr_val, price_contr_cls = format_contraction(row.get('Price Contraction', ''))

        rvol_val, rvol_cls = format_rvol(row.get('RVol', ''))

        from_open_val, from_open_cls = format_from_open(row.get('% From Open', ''))

        rs_val, rs_cls = format_rs_badge(row.get('Composite RS', ''))
        rs_rank = row.get('RS Rank', '-')

        html += f'''          <tr>
            <td class="ticker">{ticker}</td>
            <td><span class="rs-badge {rs_cls}">{rs_val}</span></td>
            <td class="name">{name}</td>
            <td class="price">{price}</td>
            <td class="liq">{liquidity}</td>
            <td class="{bis_cls}">{bis_val}</td>
            <td class="{dcr_cls}">{dcr_val}</td>
            <td class="adr">{adr_val}</td>
            <td class="{price_contr_cls}">{price_contr_val}</td>
            <td class="{rvol_cls}">{rvol_val}</td>
            <td class="{from_open_cls}">{from_open_val}</td>
            <td class="rank">{rs_rank}</td>
          </tr>
'''

    html += '''        </tbody>
      </table>
    </div>

    <div class="footer">
      <span>Click column headers to sort • Not financial advice</span>
      <span class="branding">Crafted with ❤️ by Skyler · <a href="https://x.com/skylerber" target="_blank">𝕏</a> · <a href="https://discord.gg/uxgzXpYP" target="_blank">Discord</a></span>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const table = document.querySelector('table');
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
    });
  </script>
</body>
</html>
'''

    return html


def generate_png(html_path, output_path):
    """Generate PNG from HTML using playwright."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("PNG generation requires playwright. Install with:")
        print("   pip install playwright")
        print("   playwright install chromium")
        return False

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(viewport={'width': 1300, 'height': 1000})
            page.goto(f'file://{html_path}')
            page.wait_for_timeout(500)

            container = page.query_selector('.container')
            box = container.bounding_box()

            page.screenshot(
                path=output_path,
                clip={
                    'x': max(0, box['x'] - 16),
                    'y': max(0, box['y'] - 16),
                    'width': box['width'] + 32,
                    'height': box['height'] + 32
                }
            )

            browser.close()
        return True
    except Exception as e:
        print(f"PNG generation failed: {e}")
        return False


def update_manifest(site_dir):
    """Update the manifest.js file with available scan dates."""
    scans_dir = Path(site_dir) / 'scans'
    manifest_path = scans_dir / 'manifest.js'

    # Find all scan HTML files (YYYY-MM-DD.html or YYYY-MM-DD-name.html format)
    scans = []
    for f in scans_dir.glob('*.html'):
        filename = f.stem
        # Check if it starts with a valid date format
        if len(filename) >= 10 and filename[4] == '-' and filename[7] == '-':
            date_part = filename[:10]
            name_part = filename[11:] if len(filename) > 10 else None
            scans.append({
                'id': filename,
                'date': date_part,
                'name': name_part
            })

    # Sort by date (desc), then by name
    scans.sort(key=lambda x: (x['date'], x['name'] or ''), reverse=True)

    # Write manifest
    manifest_content = f'''// Auto-generated manifest of available scans
// This file is updated by momentum_scan.py --publish

const SCAN_MANIFEST = {{
  scans: {scans}
}};
'''
    # Fix Python dict to JS object format
    manifest_content = manifest_content.replace("'", '"').replace('None', 'null')

    with open(manifest_path, 'w') as f:
        f.write(manifest_content)

    return scans


def main():
    parser = argparse.ArgumentParser(
        description='Convert stock screener CSV to HTML/PNG tables.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python momentum_scan.py stocks.csv
  python momentum_scan.py stocks.csv --sort "BIS" --order desc
  python momentum_scan.py stocks.csv --png --dark
  python momentum_scan.py stocks.csv --publish  # Publish to site
        '''
    )
    parser.add_argument('csv_file', help='Path to CSV file')
    parser.add_argument('--sort', default='BIS', help='Column to sort by (default: BIS)')
    parser.add_argument('--order', default='desc', choices=['asc', 'desc'], help='Sort order (default: desc)')
    parser.add_argument('--output', default='momentum_scan', help='Output filename (without extension)')
    parser.add_argument('--png', action='store_true', help='Also generate PNG image')
    parser.add_argument('--dark', action='store_true', help='Use dark mode theme')
    parser.add_argument('--title', default='Momentum Scan', help='Table title')
    parser.add_argument('--subtitle', default='', help='Subtitle below title')
    parser.add_argument('--emoji', default='📡', help='Emoji before title (default: 📡)')
    parser.add_argument('--publish', action='store_true', help='Publish to site folder with today\'s date')
    parser.add_argument('--date', default=None, help='Custom date for publish (YYYY-MM-DD), defaults to today')
    parser.add_argument('--name', default=None, help='Scan name for multiple scans per day (e.g., semis, growth)')
    parser.add_argument('--push', action='store_true', help='Git add, commit, and push after publishing')

    args = parser.parse_args()

    if not os.path.exists(args.csv_file):
        print(f"File not found: {args.csv_file}")
        sys.exit(1)

    print(f"Loading {args.csv_file}...")
    rows = load_csv(args.csv_file)
    print(f"Found {len(rows)} stocks")

    reverse = args.order == 'desc'
    rows.sort(key=lambda r: get_sort_value(r, args.sort), reverse=reverse)
    print(f"Sorted by {args.sort} ({args.order})")

    html = generate_html(rows, dark_mode=args.dark, title=args.title, subtitle=args.subtitle, emoji=args.emoji)

    # Determine output path
    if args.publish:
        # Get the script's directory to find the site folder
        script_dir = Path(__file__).parent
        site_dir = script_dir / 'site'
        scans_dir = site_dir / 'scans'

        # Use provided date or today's date
        if args.date:
            date_str = args.date
        else:
            date_str = datetime.now().strftime('%Y-%m-%d')

        # Add name suffix if provided
        if args.name:
            scan_id = f'{date_str}-{args.name}'
        else:
            scan_id = date_str

        html_path = scans_dir / f'{scan_id}.html'
    else:
        html_path = Path(args.output).with_suffix('.html')

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"HTML saved: {html_path}")

    # Update manifest if publishing
    if args.publish:
        dates = update_manifest(site_dir)
        print(f"Manifest updated: {len(dates)} scans available")
        print(f"\nPublished! View at: site/index.html?date={scan_id}")

    if args.png:
        png_path = Path(args.output).with_suffix('.png') if not args.publish else html_path.with_suffix('.png')
        print(f"Generating PNG...")
        abs_html = os.path.abspath(html_path)
        if generate_png(abs_html, str(png_path)):
            print(f"PNG saved: {png_path}")

    # Git push if requested
    if args.push:
        if not args.publish:
            print("Warning: --push requires --publish, skipping git push")
        else:
            import subprocess
            print("\nPushing to GitHub...")
            try:
                # Get the date for commit message
                commit_date = datetime.strptime(date_str, '%Y-%m-%d').strftime('%b %d')

                subprocess.run(['git', 'add', '.'], cwd=script_dir, check=True)
                subprocess.run(['git', 'commit', '-m', f'{commit_date} scan'], cwd=script_dir, check=True)
                subprocess.run(['git', 'push'], cwd=script_dir, check=True)
                print("Pushed! Site will update in ~30 seconds.")
            except subprocess.CalledProcessError as e:
                print(f"Git error: {e}")

    if not args.publish:
        print(f"\nDone! Open {html_path} in your browser.")


if __name__ == '__main__':
    main()
