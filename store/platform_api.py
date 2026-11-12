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

    app.add_api_route("/api/process", reader.get_process, methods=["GET"])
    app.add_api_route("/api/documents", reader.list_documents, methods=["GET"])
    app.add_api_route(
        "/api/documents/{document_id:path}", reader.get_document, methods=["GET"]
    )
    app.add_api_route("/api/tickets", reader.list_tickets, methods=["GET"])
    app.add_api_route(
        "/api/tickets/{ticket_id:path}", reader.get_ticket, methods=["GET"]
    )
    return app


def local_app() -> FastAPI:
    return create_app(configured_reader())
