from django.contrib import admin
from django.utils.html import format_html

from .models import Notification, TelegramDelivery
from apps.core.recovery import RecoverableDeleteMixin


@admin.register(Notification)
class NotificationAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("recipient", "kind", "message", "is_read_badge", "created_at")
    list_filter = ("kind", "is_read", "created_at")
    search_fields = ("message", "recipient__username", "recipient__first_name", "recipient__last_name")
    readonly_fields = ("created_at",)

    @admin.display(description="Holat", ordering="is_read")
    def is_read_badge(self, obj):
        if obj.is_read:
            return format_html('<span class="tf-badge tf-badge-success">O‘qilgan</span>')
        return format_html('<span class="tf-badge tf-badge-warning">O‘qilmagan</span>')


@admin.register(TelegramDelivery)
class TelegramDeliveryAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("chat_id", "short_text", "attempts", "delivery_status", "created_at")
    list_filter = ("attempts", "created_at")
    search_fields = ("chat_id", "text")
    readonly_fields = ("created_at",)

    @admin.display(description="Xabar matni")
    def short_text(self, obj):
        text = obj.text or ""
        return text if len(text) <= 60 else f"{text[:60]}..."

    @admin.display(description="Yetkazish holati")
    def delivery_status(self, obj):
        if obj.sent_at:
            return format_html('<span class="tf-badge tf-badge-success">Yuborildi ({})</span>', obj.sent_at.strftime("%d.%m %H:%M"))
        if obj.failed_at:
            return format_html('<span class="tf-badge tf-badge-danger">Muvaffaqiyatsiz</span>')
        return format_html('<span class="tf-badge tf-badge-warning">Kutilmoqda</span>')
