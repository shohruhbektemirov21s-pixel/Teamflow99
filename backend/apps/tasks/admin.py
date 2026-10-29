from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    ArchivedTask,
    SubTask,
    Submission,
    SubmissionFile,
    Task,
    TaskAssignment,
    TaskFile,
    WorkLog,
)
from apps.core.recovery import RecoverableDeleteMixin


class TaskArchiveStatusFilter(admin.SimpleListFilter):
    title = "Arxiv / O'chirish holati"
    parameter_name = "archive_status"

    def lookups(self, request, model_admin):
        return (
            ("active", "Faqat faol topshiriqlar"),
            ("archived", "O'chirilgan (arxivlangan) topshiriqlar"),
        )

    def queryset(self, request, queryset):
        val = self.value()
        if val == "active":
            return queryset.filter(archived_at__isnull=True)
        if val == "archived":
            return queryset.filter(archived_at__isnull=False)
        return queryset


@admin.action(description="Tanlangan topshiriqlarni qayta tiklash (arxivdan chiqarish)")
def restore_selected_tasks(modeladmin, request, queryset):
    count = queryset.filter(archived_at__isnull=False).update(archived_at=None)
    modeladmin.message_user(request, f"{count} ta topshiriq qayta tiklandi (arxivdan chiqarildi).")


@admin.action(description="Tanlangan topshiriqlarni arxivlash (o'chirish)")
def archive_selected_tasks(modeladmin, request, queryset):
    now = timezone.now()
    count = queryset.filter(archived_at__isnull=True).update(archived_at=now)
    modeladmin.message_user(request, f"{count} ta topshiriq arxivlandi (o'chirildi).")


class TaskAssignmentInline(admin.TabularInline):
    model = TaskAssignment
    extra = 0
    autocomplete_fields = ("developer",)


class SubTaskInline(admin.TabularInline):
    model = SubTask
    extra = 0
    autocomplete_fields = ("assignees",)


class TaskFileInline(admin.TabularInline):
    model = TaskFile
    extra = 0
    fields = ("file", "original_name", "uploaded_by")


class WorkLogInline(admin.TabularInline):
    model = WorkLog
    extra = 0
    fields = ("author", "work_date", "hours", "note", "created_at")
    readonly_fields = ("created_at",)


@admin.register(Task)
class TaskAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = (
        "code",
        "title",
        "project",
        "status",
        "priority",
        "archive_status_display",
        "due_at",
        "completed_at",
    )
    list_filter = (TaskArchiveStatusFilter, "status", "priority", "project")
    search_fields = ("code", "title", "project__name")
    actions = [archive_selected_tasks, restore_selected_tasks]
    inlines = [TaskAssignmentInline, SubTaskInline, TaskFileInline, WorkLogInline]

    @admin.display(description="Arxiv holati", ordering="archived_at")
    def archive_status_display(self, obj):
        if obj.archived_at:
            return format_html(
                '<span class="tf-badge tf-badge-danger" title="O\'chirilgan vaqti: {}">O‘chirilgan ({})</span>',
                obj.archived_at.strftime("%d.%m.%Y %H:%M"),
                obj.archived_at.strftime("%d.%m.%Y"),
            )
        return format_html('<span class="tf-badge tf-badge-success">Faol</span>')

    def has_delete_permission(self, request, obj=None):
        # Admin orqali hard delete ish jurnali va topshirish tarixini yo'qotadi.
        return False


@admin.register(ArchivedTask)
class ArchivedTaskAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("code", "title", "project", "status", "priority", "archived_at_display", "created_by")
    list_filter = ("status", "priority", "project")
    search_fields = ("code", "title", "project__name")
    actions = [restore_selected_tasks]
    readonly_fields = ("code", "created_by", "created_at", "updated_at", "archived_at")

    def get_queryset(self, request):
        return super().get_queryset(request).filter(archived_at__isnull=False)

    @admin.display(description="O'chirilgan (arxivlangan) vaqt", ordering="archived_at")
    def archived_at_display(self, obj):
        if not obj.archived_at:
            return "-"
        return obj.archived_at.strftime("%d.%m.%Y %H:%M")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SubTask)
class SubTaskAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("title", "task", "is_done", "position")
    list_filter = ("is_done",)
    search_fields = ("title", "task__title", "task__code")


@admin.register(TaskAssignment)
class TaskAssignmentAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("task", "developer", "assigned_at")
    list_filter = ("assigned_at",)
    search_fields = ("task__title", "task__code", "developer__username", "developer__first_name")


@admin.register(TaskFile)
class TaskFileAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("original_name", "task", "uploaded_by", "created_at")
    list_filter = ("created_at",)
    search_fields = ("original_name", "task__title", "task__code", "uploaded_by__username")
    readonly_fields = ("created_at",)


class SubmissionFileInline(admin.TabularInline):
    model = SubmissionFile
    extra = 0


@admin.register(Submission)
class SubmissionAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("task", "round", "submitted_by", "decision", "submitted_at")
    list_filter = ("decision",)
    search_fields = ("task__title", "task__code", "submitted_by__username")
    inlines = [SubmissionFileInline]


@admin.register(SubmissionFile)
class SubmissionFileAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("original_name", "submission")
    search_fields = ("original_name", "submission__task__title")


@admin.register(WorkLog)
class WorkLogAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("task", "author", "work_date", "hours", "short_note", "created_at")
    list_filter = ("work_date", "author")
    search_fields = (
        "task__title",
        "task__code",
        "author__username",
        "author__first_name",
        "author__last_name",
        "note",
    )
    date_hierarchy = "work_date"
    readonly_fields = ("created_at",)

    @admin.display(description="Bajarilgan ish")
    def short_note(self, obj):
        note = obj.note or ""
        return note if len(note) <= 60 else f"{note[:60]}..."
