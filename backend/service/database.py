"""Cloud SQL Python Connector + SQLAlchemy 2.0 Engine with IAM Authentication.

Strictly follows Architecture Revision 0.10 §11:
- Connects via Cloud SQL Python Connector with enable_iam_auth=True
- Small connection pool (pool_size=2, max_overflow=2) suited for db-f1-micro
- Zero static database passwords
"""
from __future__ import annotations

from collections.abc import Generator
import sqlalchemy
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from google.cloud.sql.connector import Connector, IPTypes

from service.config import get_settings


class Base(DeclarativeBase):
    pass


_connector: Connector | None = None
_engine: sqlalchemy.Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_connector() -> Connector:
    global _connector
    if _connector is None:
        _connector = Connector()
    return _connector


def get_engine() -> sqlalchemy.Engine:
    global _engine
    if _engine is None:
        settings = get_settings()
        iam_user = settings.resolve_iam_db_user()
        connector = get_connector()

        def getconn():
            return connector.connect(
                settings.instance_connection_name,
                "pg8000",
                user=iam_user,
                db=settings.db_name,
                enable_iam_auth=True,
                ip_type=IPTypes.PUBLIC,
            )

        _engine = sqlalchemy.create_engine(
            "postgresql+pg8000://",
            creator=getconn,
            pool_size=2,
            max_overflow=2,
            pool_pre_ping=True,
            pool_recycle=1800,
        )
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


def close_db_connector() -> None:
    global _engine, _connector
    if _engine is not None:
        _engine.dispose()
        _engine = None
    if _connector is not None:
        _connector.close()
        _connector = None
