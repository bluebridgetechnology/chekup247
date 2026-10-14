# Loading the NAPPI medicine catalogue

The doctor's medication search (prescription screen) reads the `nappi_products` table. Until that table is
loaded, the API serves a short built-in list of common SA medicines (plus free-text entry). The prescription
screen shows an amber note when this is the case, and `GET /api/v1/medical/medications/status` returns
`{ "source": "sample" | "nappi", "products": <count> }`.

## Load the catalogue on the VPS

The MediKredit source file (`mhsprods.txt`, fixed-width, 553-char records) is licensed data and is not in the
repo or the Docker image. Copy it to the server, then run the importer inside the API container (it uses the
container's `OPERATIONAL_DB_*` settings; re-running is safe and only updates changed rows):

```bash
docker cp /path/to/mhsprods.txt chekup-api:/tmp/mhsprods.txt
docker exec chekup-api node apps/api/dist/cli/nappi-import.cli.js /tmp/mhsprods.txt
docker exec chekup-api rm /tmp/mhsprods.txt
```

Then check: `curl -s https://<api-host>/api/v1/medical/medications/status` should report `"source":"nappi"`.

## Notes
- Fuzzy (typo-tolerant) search uses the Postgres `pg_trgm` extension. The API now creates it (and a trigram
  index) on startup; if the database role isn't allowed to, run once as a superuser:
  `CREATE EXTENSION IF NOT EXISTS pg_trgm;`. Without it, search still works (plain substring matching).
- Search matches the product name and the generic (ATC) descriptions, so "amoxicillin" finds brand products.
- Prices are only returned when `SHOW_NAPPI_PRICES=true`.
