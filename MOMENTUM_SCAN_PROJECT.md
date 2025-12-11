# Momentum Scan Table Generator

## Overview

A Python CLI tool that converts stock screener CSV exports into beautiful, shareable HTML tables (and optionally PNG images) for posting on X/Twitter or other platforms.

**Primary User:** Skyler — swing trader using Qullamaggie-style momentum breakout strategies, active in Discord trading communities providing educational content and daily market analysis.

**Data Source:** CSV exports from TradersLab.io stock screener.

---

## What It Does

1. **Reads a CSV** from TradersLab.io stock screener exports
2. **Sorts data** by any column (default: BIS descending)
3. **Generates a styled HTML table** with:
   - Light or dark mode themes
   - Color-coded performance metrics (green positive, red negative)
   - RS badges with tier coloring (high/mid/low)
   - Column groupings with visual separators
   - Interactive column sorting (click headers)
   - Hover tooltips explaining key metrics
   - Earnings dates flagged when ≤30 days out
4. **Optionally exports PNG** for direct social media sharing

---

## Current Features

### CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `csv_file` | (required) | Path to input CSV |
| `--sort` | `BIS` | Column to sort by |
| `--order` | `desc` | Sort order: `asc` or `desc` |
| `--output` | `momentum_scan` | Output filename (without extension) |
| `--png` | off | Also generate PNG image |
| `--dark` | off | Use dark mode theme |
| `--title` | `Momentum Scan` | Custom table title |
| `--subtitle` | (empty) | Subtitle below title |
| `--emoji` | `📡` | Emoji before title |

### Example Commands

```bash
# Basic usage
python momentum_scan.py stocks_export.csv

# Full customization
python momentum_scan.py stocks.csv \
  --title "Semis Scan" \
  --subtitle "Semiconductors & Hardware" \
  --emoji "🔬" \
  --sort "Day" \
  --order desc \
  --dark \
  --png \
  --output ~/Trading/scans/semis_dec11

# Minimal (no emoji, no subtitle)
python momentum_scan.py stocks.csv --emoji "" --title "Daily Movers"
```

---

## CSV Column Mapping

The tool expects these columns from TradersLab.io exports:

| CSV Column | Display Name | Type | Notes |
|------------|--------------|------|-------|
| `Ticker` | Ticker | string | Stock symbol |
| `Name` | Name | string | Company name (auto-shortened) |
| `Industry` | Industry | string | Sector (auto-shortened) |
| `Price` | Price | number | Current price |
| `Daily Liquidity` | Liquidity | number | Displayed as $XXM or $X.XB |
| `Day` | Day | percent | Daily % change |
| `Week` | Week | percent | Weekly % change |
| `1M` | 1M | percent | 1-month % change |
| `3M` | 3M | percent | 3-month % change |
| `6M` | 6M | percent | 6-month % change |
| `Composite RS` | RS | percent | Relative strength (badge) |
| `RS Rank` | RS Rank | number | Numerical rank |
| `BIS` | BIS | number | Breakout Intensity Score |
| `RVol` | RVol | number | Relative volume |
| `Volume Contraction` | Vol Contr | percent | Volume contraction % |
| `ADR %` | ADR% | percent | Average daily range |
| `% From Open` | % Open | percent | Change from open |
| `Next Earnings` | Earnings | date | Format: MM/DD/YYYY (Xd) |

**Ignored columns:** `Pre Market %`, `After Market %`, `Gap %` (usually empty)

---

## Table Design

### Column Groups (with visual separators)

1. **Identity** — Ticker, Name, Industry
2. **Price/Size** — Price, Liquidity  
3. **Performance** — Day, Week, 1M, 3M, 6M
4. **Relative Strength** — RS (badge), RS Rank
5. **Volume/Momentum** — BIS, RVol, Vol Contr, ADR%
6. **Context** — % Open, Earnings

### Color Coding

- **Positive %** → Green (#059669 light / #22c55e dark)
- **Negative %** → Red (#dc2626 light / #ef4444 dark)
- **Neutral** → Gray
- **RS Badge High (≥85)** → Green background
- **RS Badge Mid (60-84)** → Yellow background
- **RS Badge Low (<60)** → Gray background
- **BIS ≥1.0** → Green (strong)
- **BIS 0.5-0.99** → Orange (moderate)
- **RVol ≥1.1** → Green (elevated)
- **Vol Contraction ≥70%** → Green (consolidated)
- **Earnings ≤30d** → Red (upcoming)

### Tooltips

Hover tooltips on these headers:
- **RS** — Composite Relative Strength explanation
- **BIS** — Breakout Intensity Score formula
- **RVol** — Relative Volume interpretation
- **Vol Contr** — Volume Contraction significance
- **ADR%** — Average Daily Range usage

---

## Technical Details

### Dependencies

```bash
# Required
pip install playwright

# One-time setup for PNG export
playwright install chromium
```

### File Structure

```
momentum_scan.py    # Single-file CLI tool (~750 lines)
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `load_csv()` | Parse CSV into list of dicts |
| `generate_html()` | Build complete HTML with styles + JS |
| `generate_png()` | Screenshot HTML using Playwright |
| `format_*()` | Format values (price, percent, liquidity, etc.) |
| `get_sort_value()` | Extract numeric value for sorting |

### Output

- **HTML** — Self-contained file with embedded CSS + JS
- **PNG** — Screenshot of the table container with padding

---

## Future Enhancement Ideas

- [ ] Add more tooltips (Liquidity, % Open, etc.)
- [ ] Custom color thresholds via flags
- [ ] Filter rows (e.g., `--min-rs 80`, `--min-bis 0.5`)
- [ ] Multiple sort keys (`--sort "RS,BIS"`)
- [ ] JSON output option
- [ ] Watch mode (auto-regenerate on CSV change)
- [ ] Configurable columns (show/hide)
- [ ] Export to clipboard (for Discord paste)
- [ ] Add watermark/branding option

---

## Resuming Development

To continue working on this project in Claude Code:

1. **Load the script:** The main file is `momentum_scan.py`
2. **Test CSV available:** Use any TradersLab.io export with the columns listed above
3. **Quick test:** `python momentum_scan.py test.csv --output test`
4. **PNG requires:** Playwright + Chromium installed

### Common Modification Patterns

**Add a new CLI flag:**
1. Add to `argparse` in `main()`
2. Pass to `generate_html()`
3. Update function signature
4. Use in HTML template

**Add a tooltip:**
1. Find the `<th>` element in `generate_html()`
2. Add `class="tooltip"` 
3. Add `<span class="tooltip-text">` inside

**Change color thresholds:**
- Look for `format_*()` functions
- Modify the conditional logic for CSS class assignment

**Modify column order:**
- Reorder the `<th>` elements in the thead
- Reorder the `<td>` elements in the row generation loop
- Keep `data-col` indices sequential

---

## Version History

| Date | Changes |
|------|---------|
| Dec 11, 2024 | Initial version with full column support |
| Dec 11, 2024 | Added interactive JS sorting |
| Dec 11, 2024 | Added `--title`, `--subtitle`, `--emoji` flags |
| Dec 11, 2024 | Added hover tooltips for BIS, RS, RVol, Vol Contr, ADR% |
| Dec 11, 2024 | Removed row highlighting feature |
