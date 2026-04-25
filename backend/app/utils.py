def trim_ocr(text: str, max_chars: int = 8000) -> str:
    """Preserve header (seller/buyer/dates) + table + footer summary.

    The old version only kept <table> content and discarded all header info,
    causing seller name, document number, dates, etc. to always be null.
    """
    if len(text) <= max_chars:
        return text

    if "<table>" in text and "</table>" in text:
        t_start = text.index("<table>")
        t_end   = text.index("</table>") + len("</table>")

        header  = text[:t_start]          # seller, buyer, doc number, dates
        table   = text[t_start:t_end]     # line items
        footer  = text[t_end:]            # totals, bank info, notes

        # header is the most important — always keep it in full
        footer_keep = footer[:600]        # totals/bank are in first ~600 chars of footer
        table_budget = max_chars - len(header) - len(footer_keep) - 2
        table_keep   = table[:max(table_budget, 800)]

        return (header + "\n" + table_keep + "\n" + footer_keep)[:max_chars]

    # No table structure: keep all (already checked len above)
    return text[:max_chars]
