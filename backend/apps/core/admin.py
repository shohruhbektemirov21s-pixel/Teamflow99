from django.contrib import admin
from django.contrib.admin.models import LogEntry
from django.db import models
from django.utils.html import format_html

from .models import ActivityLog, Comment


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("author", "target_object_display", "short_text", "created_at")
    list_filter = ("target_type", "created_at")
    search_fields = ("text", "author__username", "author__first_name", "author__last_name")
    readonly_fields = ("created_at",)

    @admin.display(description="Ob'ekt")
    def target_object_display(self, obj):
        if obj.target:
            return f"{obj.target_type.name}: {obj.target}"
        return f"{obj.target_type.name} #{obj.target_id}"

    @admin.display(description="Izoh matni")
    def short_text(self, obj):
        text = obj.text or ""
        return text if len(text) <= 70 else f"{text[:70]}..."


class ActivityLogActionFilter(admin.SimpleListFilter):
    title = "Amal toifasi"
    parameter_name = "action_type"

    def lookups(self, request, model_admin):
        return (
            ("deletions", "O'chirish va arxivlash"),
            ("tasks", "Vazifalar amallari"),
            ("projects", "Loyihalar amallari"),
            ("orders", "Buyurtmalar amallari"),
        )

    def queryset(self, request, queryset):
        val = self.value()
        if val == "deletions":
            return queryset.filter(models.Q(verb__icontains="delete") | models.Q(verb__icontains="archive"))
        if val == "tasks":
            return queryset.filter(verb__startswith="task_")
        if val == "projects":
            return queryset.filter(verb__startswith="project_")
        if val == "orders":
            return queryset.filter(verb__startswith="order_")
        return queryset


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor_display", "action_badge", "message", "target_display")
    list_filter = (ActivityLogActionFilter, "verb", "created_at")
    search_fields = ("message", "actor__username", "actor__first_name", "actor__last_name")
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)

    @admin.display(description="Foydalanuvchi", ordering="actor")
    def actor_display(self, obj):
        if not obj.actor:
            return "Tizim"
        return f"{obj.actor.full_name} (@{obj.actor.username})"

    @admin.display(description="Amal", ordering="verb")
    def action_badge(self, obj):
        is_delete = "delete" in obj.verb or "archive" in obj.verb
        badge_cls = "tf-badge-danger" if is_delete else "tf-badge-info"
        label = "O'chirildi / Arxivlandi" if is_delete else obj.verb
        return format_html('<span class="tf-badge {}" title="{}">{}</span>', badge_cls, obj.verb, label)

    @admin.display(description="Ob'ekt")
    def target_display(self, obj):
        if obj.target:
            return f"{obj.target}"
        if obj.target_type:
            return f"{obj.target_type.name} #{obj.target_id}"
        return "-"


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = ("action_time", "user", "action_flag_display", "content_type", "object_repr")
    list_filter = ("action_flag", "content_type", "action_time")
    search_fields = ("object_repr", "change_message", "user__username", "user__first_name", "user__last_name")
    date_hierarchy = "action_time"
    readonly_fields = ("action_time", "user", "content_type", "object_id", "object_repr", "action_flag", "change_message")

    @admin.display(description="Amal turi", ordering="action_flag")
    def action_flag_display(self, obj):
        flags = {
            1: ("Qo‘shish", "tf-badge-success"),
            2: ("O‘zgartirish", "tf-badge-info"),
            3: ("O‘chirish", "tf-badge-danger"),
        }
        name, cls = flags.get(obj.action_flag, (str(obj.action_flag), "tf-badge-neutral"))
        return format_html('<span class="tf-badge {}">{}</span>', cls, name)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
