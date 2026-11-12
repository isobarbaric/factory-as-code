"""Expose the process reader over local HTTP."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .reader import ProcessReader, RecordUnavailable, configured_reader


def create_app(reader: ProcessReader) -> FastAPI:
    app = FastAPI(title="Process platform API")
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1"])

    @app.exception_handler(RecordUnavailable)
    async def unavailable(request: Request, error: RecordUnavailable):
        return JSONResponse(status_code=404, content={"detail": "Record not found"})

    app.get("/api/process")(reader.get_process)
    app.get("/api/documents")(reader.list_documents)
    app.get("/api/documents/{document_id:path}")(reader.get_document)
    app.get("/api/tickets")(reader.list_tickets)
    app.get("/api/tickets/{ticket_id:path}")(reader.get_ticket)
    return app


def local_app() -> FastAPI:
    return create_app(configured_reader())
