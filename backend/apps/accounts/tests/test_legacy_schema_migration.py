from importlib import import_module
from types import SimpleNamespace
from unittest.mock import MagicMock

from django.test import SimpleTestCase

from apps.accounts.models import User


migration = import_module("apps.accounts.migrations.0011_legacy_location_default")


class LegacyLocationMigrationTests(SimpleTestCase):
    def build_schema_editor(self, columns):
        cursor_context = MagicMock()
        cursor_context.__enter__.return_value = object()

        connection = SimpleNamespace(
            vendor="postgresql",
            cursor=MagicMock(return_value=cursor_context),
            introspection=SimpleNamespace(
                get_table_description=MagicMock(
                    return_value=[SimpleNamespace(name=name) for name in columns]
                )
            ),
            ops=SimpleNamespace(quote_name=lambda name: f'"{name}"'),
        )
        return SimpleNamespace(connection=connection, execute=MagicMock())

    def test_sets_a_default_without_dropping_the_legacy_column(self):
        apps = SimpleNamespace(get_model=MagicMock(return_value=User))
        schema_editor = self.build_schema_editor(["id", "username", "location"])

        migration.allow_current_user_inserts(apps, schema_editor)

        schema_editor.execute.assert_called_once_with(
            'ALTER TABLE "accounts_user" ALTER COLUMN "location" SET DEFAULT %s',
            [""],
        )

    def test_is_a_noop_for_clean_schemas(self):
        apps = SimpleNamespace(get_model=MagicMock(return_value=User))
        schema_editor = self.build_schema_editor(["id", "username"])

        migration.allow_current_user_inserts(apps, schema_editor)

        schema_editor.execute.assert_not_called()
