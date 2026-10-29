from django.contrib import admin
from django.utils.html import format_html

from .models import ChatMessage
from apps.core.recovery import RecoverableDeleteMixin


@admin.register(ChatMessage)
class ChatMessageAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("id", "author_display", "recipient_display", "short_text", "is_read_badge", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = (
        "text",
        "author__username",
        "author__first_name",
        "author__last_name",
        "recipient__username",
        "recipient__first_name",
        "recipient__last_name",
    )
    readonly_fields = ("created_at",)
    list_select_related = ("author", "recipient")
    date_hierarchy = "created_at"

    @admin.display(description="Yuboruvchi", ordering="author")
    def author_display(self, obj):
        return f"{obj.author.full_name} (@{obj.author.username})"

    @admin.display(description="Qabul qiluvchi", ordering="recipient")
    def recipient_display(self, obj):
        return f"{obj.recipient.full_name} (@{obj.recipient.username})"

    @admin.display(description="Xabar matni")
    def short_text(self, obj):
        text = obj.text or ""
        return text if len(text) <= 80 else f"{text[:80]}..."

    @admin.display(description="O'qilganlik", ordering="is_read")
    def is_read_badge(self, obj):
        if obj.is_read:
            return format_html('<span class="tf-badge tf-badge-success">O‘qilgan</span>')
        return format_html('<span class="tf-badge tf-badge-warning">O‘qilmagan</span>')
