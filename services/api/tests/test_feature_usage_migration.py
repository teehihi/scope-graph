import importlib.util
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, text


MIGRATION_PATH = Path(__file__).parents[1] / "alembic/versions/96c0bda12ef4_add_daily_feature_usage.py"
SPEC = importlib.util.spec_from_file_location("feature_usage_migration", MIGRATION_PATH)
MIGRATION = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MIGRATION)


def test_feature_usage_migration_adopts_existing_table_without_losing_rows():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TABLE feature_usage ("
            "id VARCHAR(36) PRIMARY KEY, owner_key VARCHAR(255) NOT NULL, "
            "feature VARCHAR(30) NOT NULL, created_at DATETIME NOT NULL)"
        ))
        connection.execute(text(
            "INSERT INTO feature_usage (id, owner_key, feature, created_at) "
            "VALUES ('existing', 'tester', 'voice', '2026-11-03 00:00:00')"
        ))
        context = MigrationContext.configure(connection)
        with Operations.context(context):
            MIGRATION.upgrade()

        assert connection.execute(text("SELECT COUNT(*) FROM feature_usage")).scalar_one() == 1
        index_names = {item["name"] for item in inspect(connection).get_indexes("feature_usage")}
        assert index_names == {
            "ix_feature_usage_owner_key",
            "ix_feature_usage_feature",
            "ix_feature_usage_created_at",
        }
    engine.dispose()
