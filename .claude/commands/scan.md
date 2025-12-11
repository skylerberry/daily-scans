# Publish Scan

Publish a new momentum scan from a CSV file.

## Arguments
- `$ARGUMENTS` - Path to the CSV file (required). Optionally add a scan name after the path.

## Instructions

1. Parse the arguments to get:
   - CSV file path (first argument, required)
   - Scan name (second argument, optional - for multiple scans per day like "semis", "growth")

2. Run the publish command:
   ```
   python momentum_scan.py <csv_path> --publish --push [--name <scan_name>]
   ```

3. Report the result to the user with the URL to view the scan.

## Examples
- `/scan C:\Users\cmsky\Downloads\export.csv` - publishes as today's main scan
- `/scan C:\Users\cmsky\Downloads\semis.csv semis` - publishes as today's "semis" scan
