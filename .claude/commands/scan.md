# Publish Scan

Publish a new momentum scan from a CSV file.

## Arguments
- `$ARGUMENTS` - Path to the CSV file (required). Optionally add a sector preset name.

## Available Sector Presets
- `solar` - ☀️ Solar Scan (Solar & Renewable Energy)
- `comms` - 📡 Comms Scan (Communication Services)
- `financials` - 🏦 Financials Scan (Banks, Insurance & Financial Services)
- `software` - 💻 Software Scan (Software & Cloud Services)
- `hardware` - 🖥️ Hardware Scan (Hardware & Equipment)
- `defensive` - 🛒 Defensive Scan (Consumer Defensive & Staples)
- `industrials` - 🏭 Industrials Scan (Industrial & Manufacturing)
- `cyclical` - 🛍️ Cyclical Scan (Consumer Cyclical & Discretionary)
- `semis` - 🔬 Semis Scan (Semiconductors & Chip Stocks)
- `healthcare` - 🏥 Healthcare Scan (Healthcare & Biotech)
- `materials` - ⛏️ Materials Scan (Basic Materials & Mining)

## Instructions

1. Parse the arguments to get:
   - CSV file path (first argument, required)
   - Sector preset (second argument, optional - uses predefined title/subtitle/emoji)

2. Run the publish command:
   - If sector provided: `python momentum_scan.py <csv_path> --publish --push --sector <sector>`
   - If no sector: `python momentum_scan.py <csv_path> --publish --push`

3. Report the result to the user with the URL to view the scan.

## Examples
- `/scan C:\Users\cmsky\Downloads\export.csv` - publishes as today's main scan
- `/scan C:\Users\cmsky\Downloads\semis.csv semis` - publishes as "🔬 Semis Scan"
- `/scan C:\Users\cmsky\Downloads\solar.csv solar` - publishes as "☀️ Solar Scan"
