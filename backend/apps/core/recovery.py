"""Admin recovery snapshots.

Admin deletes are captured before Django removes the row.  This keeps the
operational panel recoverable without changing the product APIs or domain
models that already use their own archive flags (for example tasks).
"""

import json

from django.core.serializers.json import DjangoJSONEncoder
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone

from .models import AdminDeletedRecord


def _json_value(value):
    return json.loads(json.dumps(value, cls=DjangoJSONEncoder))


def snapshot_instance(instance, deleted_by=None):
    """Create a portable snapshot of concrete and many-to-many fields."""
    opts = instance._meta
    fields = {}
    for field in opts.concrete_fields:
        value = instance.__dict__.get(field.attname, getattr(instance, field.attname))
        # FileField/ImageField descriptors expose a FieldFile object; the
        # stable value that can be restored is its storage path.
        if hasattr(value, "name") and hasattr(value, "storage"):
            value = value.name
        fields[field.attname] = _json_value(value)

    many_to_many = {}
    for field in opts.many_to_many:
        many_to_many[field.name] = list(getattr(instance, field.name).values_list("pk", flat=True))

    payload = {"fields": fields, "many_to_many": many_to_many}
    content_type = ContentType.objects.get_for_model(instance, for_concrete_model=False)
    return AdminDeletedRecord.objects.create(
        content_type=content_type,
        object_id=str(instance.pk),
        object_repr=str(instance),
        payload=payload,
        deleted_by=deleted_by if getattr(deleted_by, "is_authenticated", False) else None,
    )


@transaction.atomic
def restore_snapshot(record):
    """Restore a snapshot and mark it recovered; raise on an unsafe conflict."""
    if record.restored_at:
        return record.content_type.model_class().objects.get(pk=record.object_id)

    model = record.content_type.model_class()
    if model is None:
        raise ValueError("Model topilmadi yoki endi mavjud emas.")
    if model.objects.filter(pk=record.object_id).exists():
        raise ValueError("Shu ID bilan obyekt allaqachon mavjud.")

    data = record.payload or {}
    fields = data.get("fields", {})
    kwargs = {}
    for field in model._meta.concrete_fields:
        if field.attname in fields:
            kwargs[field.attname] = fields[field.attname]
    restored = model(**kwargs)
    restored.save(force_insert=True)

    for field in model._meta.many_to_many:
        values = (data.get("many_to_many", {}) or {}).get(field.name, [])
        if values:
            getattr(restored, field.name).set(values)

    record.restored_at = timezone.now()
    record.restore_error = ""
    record.save(update_fields=["restored_at", "restore_error"])
    return restored


class RecoverableDeleteMixin:
    """Capture every standard Django Admin delete before it is executed."""

    def delete_model(self, request, obj):
        snapshot_instance(obj, request.user)
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        # Call delete_model one-by-one so bulk delete has the same recovery
        # guarantee as deleting one object from its detail page.
        for obj in queryset:
            self.delete_model(request, obj)
