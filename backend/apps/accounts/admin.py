from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.html import format_html

from .models import ResponsibleProject, ResponsibleProjectNews, Specialty, User


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.action(description="Tanlanganlarni tasdiqlash (faollashtirish)")
def approve_users(modeladmin, request, queryset):
    updated = queryset.filter(is_active=False).update(is_active=True)
    modeladmin.message_user(request, f"Tasdiqlandi: {updated} ta foydalanuvchi.")


@admin.action(description="Tanlanganlarni bloklash")
def block_users(modeladmin, request, queryset):
    # O'zini bloklab qo'yishning oldi olinadi.
    updated = queryset.exclude(pk=request.user.pk).update(is_active=False)
    modeladmin.message_user(request, f"Bloklandi: {updated} ta foydalanuvchi.")


class ResponsibleProjectNewsInline(admin.TabularInline):
    model = ResponsibleProjectNews
    extra = 0
    fields = ("author", "text", "created_at")
    readonly_fields = ("created_at",)


@admin.register(ResponsibleProject)
class ResponsibleProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "employee", "created_by", "created_at", "updated_at")
    list_filter = ("created_at",)
    search_fields = ("name", "employee__username", "employee__first_name", "employee__last_name")
    inlines = [ResponsibleProjectNewsInline]


@admin.register(ResponsibleProjectNews)
class ResponsibleProjectNewsAdmin(admin.ModelAdmin):
    list_display = ("project", "author", "short_text", "created_at")
    list_filter = ("created_at",)
    search_fields = ("text", "project__name", "author__username")
    readonly_fields = ("created_at",)

    @admin.display(description="Yangilik matni")
    def short_text(self, obj):
        text = obj.text or ""
        return text if len(text) <= 60 else f"{text[:60]}..."


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "username",
        "full_name",
        "role",
        "specialty",
        "department_name",
        "status_badge",
        "date_joined",
    )
    list_filter = ("is_active", "role", "specialty")
    search_fields = ("username", "first_name", "last_name", "department_name")
    ordering = ("is_active", "-date_joined")  # tasdiqlanmaganlar tepada
    actions = [approve_users, block_users]

    fieldsets = DjangoUserAdmin.fieldsets + (
        ("TeamFlow", {"fields": ("role", "specialty", "department_name", "telegram_username", "business_trip_return_date")}),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ("TeamFlow", {"fields": ("first_name", "last_name", "role", "specialty", "department_name", "telegram_username")}),
    )

    @admin.display(description="Holat", ordering="is_active")
    def status_badge(self, obj):
        if obj.is_active:
            return format_html('<span class="tf-badge tf-badge-success">Faol</span>')
        return format_html('<span class="tf-badge tf-badge-danger">Kutilmoqda / Nofaol</span>')
