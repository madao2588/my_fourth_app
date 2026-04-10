from app.core.config import normalize_database_url


def test_normalize_database_url_keeps_sqlite_unchanged():
    assert normalize_database_url("sqlite:///./visitors.db") == "sqlite:///./visitors.db"


def test_normalize_database_url_converts_postgres_scheme():
    assert (
        normalize_database_url("postgres://user:pass@localhost:5432/demo")
        == "postgresql+psycopg://user:pass@localhost:5432/demo"
    )


def test_normalize_database_url_converts_plain_postgresql_scheme():
    assert (
        normalize_database_url("postgresql://user:pass@localhost:5432/demo")
        == "postgresql+psycopg://user:pass@localhost:5432/demo"
    )
