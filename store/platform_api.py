"""Expose the factory reader and writer over local HTTP."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlmodel import SQLModel
from starlette.middleware.trustedhost import TrustedHostMiddleware

from . import models  # noqa: F401  Register every table before create_all.
from .reader import FactoryReader, RecordUnavailable, configured_store
from .writer import InvalidRecord, FactoryWriter


def create_app(reader: FactoryReader, writer: FactoryWriter) -> FastAPI:
    app = FastAPI(title="Factory platform API")
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["localhost", "127.0.0.1"])

    @app.exception_handler(RecordUnavailable)
    async def unavailable(request: Request, error: RecordUnavailable):
        return JSONResponse(status_code=404, content={"detail": "Record not found"})

    @app.exception_handler(InvalidRecord)
    async def invalid(request: Request, error: InvalidRecord):
        return JSONResponse(status_code=422, content={"detail": str(error)})

    route = app.add_api_route
    route("/api/repositories", reader.list_repositories, methods=["GET"])
    route("/api/factory", reader.get_factory, methods=["GET"])

    route("/api/documents", reader.list_documents, methods=["GET"])
    route("/api/documents", writer.create_document, methods=["POST"], status_code=201)
    route("/api/documents/{document_id:path}", reader.get_document, methods=["GET"])
    route("/api/documents/{document_id:path}", writer.update_document, methods=["PATCH"])
    route("/api/documents/{document_id:path}", writer.delete_document, methods=["DELETE"], status_code=204)

    route("/api/tickets", reader.list_tickets, methods=["GET"])
    route("/api/tickets", writer.create_ticket, methods=["POST"], status_code=201)
    route("/api/tickets/{ticket_id:path}", reader.get_ticket, methods=["GET"])
    route("/api/tickets/{ticket_id:path}", writer.update_ticket, methods=["PATCH"])
    route("/api/tickets/{ticket_id:path}", writer.delete_ticket, methods=["DELETE"], status_code=204)

    route("/api/comments", writer.list_comments, methods=["GET"])
    route("/api/comments", writer.create_comment, methods=["POST"], status_code=201)
    route("/api/comments/{comment_id}", writer.update_comment, methods=["PATCH"])
    route("/api/comments/{comment_id}", writer.delete_comment, methods=["DELETE"], status_code=204)
    return app


def local_app() -> FastAPI:
    engine, manifests = configured_store()
    SQLModel.metadata.create_all(engine)
    return create_app(FactoryReader(engine, manifests), FactoryWriter(engine, manifests))
