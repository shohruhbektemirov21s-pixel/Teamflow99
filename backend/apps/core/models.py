from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class Comment(models.Model):
    """Buyurtma, loyiha yoki vazifaga izoh (target — GenericFK)."""

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="comments")
    text = models.TextField("Izoh")
    target_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    target_id = models.PositiveBigIntegerField()
    target = GenericForeignKey("target_type", "target_id")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["target_type", "target_id", "created_at"], name="comment_target_feed_idx"),
        ]
        verbose_name = "Izoh"
        verbose_name_plural = "Izohlar"

    def __str__(self):
        return f"{self.author}: {self.text[:40]}"


class ActivityLog(models.Model):
    """Umumiy tarix — kim, nima qildi."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="activities"
    )
    verb = models.CharField("Amal", max_length=64)
    message = models.CharField("Xabar", max_length=255)
    target_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    target_id = models.PositiveBigIntegerField(null=True, blank=True)
    target = GenericForeignKey("target_type", "target_id")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at", "-id"], name="activity_feed_idx"),
            models.Index(fields=["target_type", "target_id"], name="activity_target_idx"),
        ]
        verbose_name = "Tarix yozuvi"
        verbose_name_plural = "Umumiy tarix"

    def __str__(self):
        return self.message


class AdminDeletedRecord(models.Model):
    """Recoverable snapshot created before a Django Admin hard delete."""

    content_type = models.ForeignKey(ContentType, on_delete=models.PROTECT, related_name="admin_deleted_records")
    object_id = models.CharField("Obyekt ID", max_length=100)
    object_repr = models.CharField("Obyekt", max_length=255)
    payload = models.JSONField("Snapshot")
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_deleted_records",
    )
    deleted_at = models.DateTimeField("O'chirilgan vaqt", auto_now_add=True, db_index=True)
    restored_at = models.DateTimeField("Tiklangan vaqt", null=True, blank=True)
    restore_error = models.CharField("Tiklash xatosi", max_length=500, blank=True)

    class Meta:
        ordering = ["-deleted_at", "-id"]
        indexes = [
            models.Index(fields=["content_type", "object_id"], name="admin_deleted_object_idx"),
            models.Index(fields=["restored_at", "-deleted_at"], name="admin_deleted_pending_idx"),
        ]
        verbose_name = "O'chirilgan obyekt snapshot'i"
        verbose_name_plural = "O'chirilgan obyekt snapshot'lari"

    @property
    def model_label(self):
        model = self.content_type.model_class() if self.content_type_id else None
        return model._meta.verbose_name if model else "Noma'lum"

    def __str__(self):
        return f"{self.model_label}: {self.object_repr}"
