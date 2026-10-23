from django.contrib import admin

from .models import Project, ProjectCompletionAck, ProjectFile, ProjectMember


class ProjectMemberInline(admin.TabularInline):
    model = ProjectMember
    extra = 0
    autocomplete_fields = ("developer",)


class ProjectFileInline(admin.TabularInline):
    model = ProjectFile
    extra = 0
    fields = ("file", "original_name", "uploaded_by")


class ProjectCompletionAckInline(admin.TabularInline):
    model = ProjectCompletionAck
    extra = 0
    fields = ("developer", "confirmed", "reason", "decided_at")
    readonly_fields = ("developer", "confirmed", "reason", "decided_at")
    can_delete = False


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "stage", "start_date", "end_date", "created_by")
    list_filter = ("stage",)
    search_fields = ("code", "name")
    inlines = [ProjectMemberInline, ProjectFileInline, ProjectCompletionAckInline]


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ("project", "developer", "added_at")
    list_filter = ("added_at",)
    search_fields = ("project__name", "project__code", "developer__username", "developer__first_name")


@admin.register(ProjectFile)
class ProjectFileAdmin(admin.ModelAdmin):
    list_display = ("project", "original_name", "is_completion", "uploaded_by", "created_at")
    list_filter = ("is_completion", "created_at")
    search_fields = ("original_name", "project__name", "project__code", "uploaded_by__username")
    readonly_fields = ("created_at",)


@admin.register(ProjectCompletionAck)
class ProjectCompletionAckAdmin(admin.ModelAdmin):
    list_display = ("project", "developer", "confirmed", "decided_at")
    list_filter = ("confirmed", "decided_at")
    search_fields = ("project__name", "project__code", "developer__username", "reason")
    readonly_fields = ("decided_at",)
