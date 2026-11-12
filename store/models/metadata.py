from sqlalchemy import JSON, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB


def metadata_type():
    return JSON(none_as_null=True).with_variant(JSONB(none_as_null=True), "postgresql")


def metadata_constraints():
    return (
        CheckConstraint("json_type(metadata) = 'object'").ddl_if(dialect="sqlite"),
        CheckConstraint("jsonb_typeof(metadata) = 'object'").ddl_if(
            dialect="postgresql"
        ),
    )
