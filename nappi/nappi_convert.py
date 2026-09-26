#!/usr/bin/env python3
"""
Convert the Medis fixed-width NAPPI input file into CSVs for PostgreSQL.

Usage:
    python nappi_convert.py NAPPI.txt output_dir [encoding]

Writes:
    products.csv   one row per NAPPI code
    prices.csv     one row per (NAPPI code, price_type) with its effective date

The file is streamed line by line, so a 400 MB input needs very little memory.
Offsets below come from "Medis work input file layout" (1-based From/To there,
converted here to 0-based, end-exclusive). Record length is 553.
"""
import csv
import hashlib
import os
import sys
from collections import Counter
from datetime import datetime
from decimal import Decimal, InvalidOperation

RECORD_LEN = 553

LAYOUT = [
    ("nappi_code",         0,  11),   # NAPPI code & suffix (last 3 = pack suffix)
    ("product_name",      11,  41),   # layout doc says 100 chars, but it overlaps
                                      # strength; the data shows 30 chars
    ("strength_raw",      41,  53),   # 12 digits, 3 implied decimals
    ("strength_unit",     53,  64),
    ("dosage_form_code",  64,  68),
    ("dosage_form",       68, 118),
    ("pack_size_raw",    118, 126),   # 8 digits, 2 implied decimals
    ("route",            126, 128),   # ROA; XX = non-medicine item
    ("atc_mims_code",    128, 135),
    ("atc_mims_desc",    135, 185),
    ("generic_ind",      185, 186),
    ("excl_flag",        186, 187),   # Mediscor exclusion flag
    ("excl_desc",        187, 237),
    ("single_comb",      237, 238),
    ("pack_uom",         238, 240),
    ("product_eff_date", 240, 248),
    ("brand_code",       248, 268),
    ("schedule",         268, 269),
    ("old_nappi_code",   269, 280),
    ("old_nappi_eff",    280, 288),
    ("new_nappi_code",   288, 299),
    ("new_nappi_eff",    299, 307),
    ("price_lstx",       307, 319),   # Lstx (excl VAT)
    ("price_lstx_date",  319, 327),
    ("price_hist1",      327, 339),   # historical SEP 1
    ("price_hist1_date", 339, 347),
    ("price_hist2",      347, 359),   # historical SEP 2
    ("price_hist2_date", 359, 367),
    ("manuf_code",       367, 372),
    ("manuf_desc",       372, 422),
    ("mmap_unit_price",  422, 435),
    ("mmap_price",       435, 448),
    ("mmap_price_date",  448, 456),
    ("mmap_ind",         456, 457),
    ("term_date",        457, 465),
    ("status",           465, 466),   # A = active
    ("who_atc_code",     466, 473),
    ("who_atc_desc",     473, 553),
]

PRODUCT_COLUMNS = [
    "nappi_code", "product_code", "pack_code", "product_name",
    "strength", "strength_unit", "dosage_form_code", "dosage_form",
    "pack_size", "pack_uom", "route", "atc_mims_code", "atc_mims_desc",
    "generic_ind", "excl_flag", "excl_desc", "single_comb", "product_eff_date",
    "brand_code", "schedule", "old_nappi_code", "old_nappi_eff",
    "new_nappi_code", "new_nappi_eff", "manuf_code", "manuf_desc",
    "mmap_ind", "term_date", "status", "who_atc_code", "who_atc_desc",
    "is_medicine", "is_active", "row_hash",
]

# (price_type, value field, date field, decimal places)
PRICES = [
    ("lstx",      "price_lstx",      "price_lstx_date",  2),
    ("hist_1",    "price_hist1",     "price_hist1_date", 2),
    ("hist_2",    "price_hist2",     "price_hist2_date", 2),
    ("mmap_unit", "mmap_unit_price", "mmap_price_date",  3),
    ("mmap",      "mmap_price",      "mmap_price_date",  3),
]


def parse_date(s, field, warnings):
    s = s.strip()
    if not s or set(s) == {"0"}:
        return ""
    try:
        return datetime.strptime(s, "%Y%m%d").date().isoformat()
    except ValueError:
        warnings["unparseable date in %s" % field] += 1
        return ""


def parse_scaled(s, places):
    """Digits with implied decimals -> plain number string ('' if zero/invalid)."""
    s = s.strip()
    if not s.isdigit():
        return ""
    d = Decimal(int(s)).scaleb(-places)
    return "" if d == 0 else format(d.normalize(), "f")


def parse_price(s, places):
    try:
        d = Decimal(s.strip())
    except InvalidOperation:
        return ""
    if d <= 0:
        return ""
    return format(d.quantize(Decimal(1).scaleb(-places)), "f")


def main(src, outdir, encoding="cp1252"):
    os.makedirs(outdir, exist_ok=True)
    warnings = Counter()
    stats = Counter()
    seen = set()

    with open(src, "r", encoding=encoding, errors="replace", newline="") as fh, \
         open(os.path.join(outdir, "products.csv"), "w", newline="", encoding="utf-8") as pf, \
         open(os.path.join(outdir, "prices.csv"), "w", newline="", encoding="utf-8") as prf:

        products = csv.DictWriter(pf, fieldnames=PRODUCT_COLUMNS)
        prices = csv.writer(prf)
        products.writeheader()
        prices.writerow(["nappi_code", "price_type", "price", "effective_date"])

        for raw in fh:
            line = raw.rstrip("\r\n")
            if not line.strip():
                continue
            if len(line) != RECORD_LEN:
                warnings["line length != %d" % RECORD_LEN] += 1
                line = line.ljust(RECORD_LEN)[:RECORD_LEN]

            f = {name: line[a:b].strip() for name, a, b in LAYOUT}
            code = f["nappi_code"]
            if not code.isdigit():
                warnings["skipped: NAPPI code not numeric"] += 1
                continue
            if code in seen:
                warnings["duplicate NAPPI code"] += 1
            seen.add(code)

            def d(field):
                return parse_date(f[field], field, warnings)

            is_medicine = f["route"] != "XX"
            stats["status " + (f["status"] or "blank")] += 1
            stats["medicine" if is_medicine else "non-medicine"] += 1

            products.writerow({
                "nappi_code": code,            # text: leading zeros matter
                "product_code": code[:-3],
                "pack_code": code[-3:],
                "product_name": f["product_name"],
                "strength": parse_scaled(f["strength_raw"], 3),
                "strength_unit": f["strength_unit"],
                "dosage_form_code": f["dosage_form_code"],
                "dosage_form": f["dosage_form"],
                "pack_size": parse_scaled(f["pack_size_raw"], 2),
                "pack_uom": f["pack_uom"],
                "route": f["route"],
                "atc_mims_code": f["atc_mims_code"],
                "atc_mims_desc": f["atc_mims_desc"],
                "generic_ind": f["generic_ind"],
                "excl_flag": f["excl_flag"],
                "excl_desc": f["excl_desc"],
                "single_comb": f["single_comb"],
                "product_eff_date": d("product_eff_date"),
                "brand_code": f["brand_code"],
                "schedule": f["schedule"],
                "old_nappi_code": f["old_nappi_code"],
                "old_nappi_eff": d("old_nappi_eff"),
                "new_nappi_code": f["new_nappi_code"],
                "new_nappi_eff": d("new_nappi_eff"),
                "manuf_code": f["manuf_code"],
                "manuf_desc": f["manuf_desc"],
                "mmap_ind": f["mmap_ind"],
                "term_date": d("term_date"),
                "status": f["status"],
                "who_atc_code": f["who_atc_code"],
                "who_atc_desc": f["who_atc_desc"],
                "is_medicine": "true" if is_medicine else "false",
                "is_active": "true" if f["status"] == "A" else "false",
                # hash of the whole record: lets the SQL load skip unchanged rows
                "row_hash": hashlib.md5(line.rstrip().encode("utf-8")).hexdigest(),
            })
            stats["products"] += 1

            for ptype, vfield, dfield, places in PRICES:
                price = parse_price(f[vfield], places)
                if price:
                    prices.writerow([code, ptype, price, d(dfield)])
                    stats["prices"] += 1

    print("products.csv: %d rows" % stats.pop("products", 0))
    print("prices.csv:   %d rows" % stats.pop("prices", 0))
    for k, v in sorted(stats.items()):
        print("  %-16s %d" % (k, v))
    if warnings:
        print("\nLayout warnings (investigate before loading):")
        for msg, count in warnings.most_common():
            print("  %8d  %s" % (count, msg))
    else:
        print("\nNo layout warnings.")


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    main(*sys.argv[1:])
