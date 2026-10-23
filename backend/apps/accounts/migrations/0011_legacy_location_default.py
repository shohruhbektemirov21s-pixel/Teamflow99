from django.db import migrations


def allow_current_user_inserts(apps, schema_editor):
    """Keep legacy production schemas compatible without discarding old data."""
    if schema_editor.connection.vendor != "postgresql":
        return

    User = apps.get_model("accounts", "User")
    table_name = User._meta.db_table
    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(cursor, table_name)
        }

    if "location" not in columns:
        return

    quote = schema_editor.connection.ops.quote_name
    schema_editor.execute(
        f"ALTER TABLE {quote(table_name)} ALTER COLUMN {quote('location')} SET DEFAULT %s",
        [""],
    )


def restore_legacy_constraint(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    User = apps.get_model("accounts", "User")
    table_name = User._meta.db_table
    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(cursor, table_name)
        }

    if "location" in columns:
        quote = schema_editor.connection.ops.quote_name
        schema_editor.execute(
            f"ALTER TABLE {quote(table_name)} ALTER COLUMN {quote('location')} DROP DEFAULT"
        )


class Migration(migrations.Migration):
    dependencies = [("accounts", "0010_responsible_projects")]

    operations = [migrations.RunPython(allow_current_user_inserts, restore_legacy_constraint)]
