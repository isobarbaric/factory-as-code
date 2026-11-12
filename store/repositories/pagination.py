PAGE_SIZE = 50


def page(session, query, column):
    rows = session.execute(query.order_by(column).limit(PAGE_SIZE + 1)).mappings().all()
    items = [dict(row) for row in rows[:PAGE_SIZE]]
    cursor = items[-1][column.key] if len(rows) > PAGE_SIZE else None
    return {"items": items, "next_cursor": cursor}
