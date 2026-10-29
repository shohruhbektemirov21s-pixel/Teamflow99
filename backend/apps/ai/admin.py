from django.contrib import admin
from django.utils.html import format_html

from .models import WebAgentRun
from apps.core.recovery import RecoverableDeleteMixin


@admin.register(WebAgentRun)
class WebAgentRunAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("id", "provider_kind", "status_badge", "created_by", "created_at")
    list_filter = ("status", "provider_kind", "created_at")
    search_fields = ("task", "provider_run_id", "created_by__username")
    readonly_fields = ("provider_run_id", "created_at", "updated_at")

    @admin.display(description="Holat", ordering="status")
    def status_badge(self, obj):
        colors = {
            WebAgentRun.Status.COMPLETED: "tf-badge-success",
            WebAgentRun.Status.RUNNING: "tf-badge-info",
            WebAgentRun.Status.PENDING: "tf-badge-warning",
            WebAgentRun.Status.FAILED: "tf-badge-danger",
        }
        cls = colors.get(obj.status, "tf-badge-neutral")
        return format_html('<span class="tf-badge {}">{}</span>', cls, obj.get_status_display())
