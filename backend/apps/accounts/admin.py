from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.contrib.auth.forms import AdminUserCreationForm
from django.shortcuts import redirect
from django.urls import path
from django.utils.html import format_html

from apps.core.recovery import RecoverableDeleteMixin

from .models import ResponsibleProject, ResponsibleProjectNews, Role, Specialty, User


@admin.register(Specialty)
class SpecialtyAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
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
class ResponsibleProjectAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("name", "employee", "created_by", "created_at", "updated_at")
    list_filter = ("created_at",)
    search_fields = ("name", "employee__username", "employee__first_name", "employee__last_name")
    inlines = [ResponsibleProjectNewsInline]


@admin.register(ResponsibleProjectNews)
class ResponsibleProjectNewsAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ("project", "author", "short_text", "created_at")
    list_filter = ("created_at",)
    search_fields = ("text", "project__name", "author__username")
    readonly_fields = ("created_at",)

    @admin.display(description="Yangilik matni")
    def short_text(self, obj):
        text = obj.text or ""
        return text if len(text) <= 60 else f"{text[:60]}..."


class CustomUserCreationForm(AdminUserCreationForm):
    """Admin panel orqali yangi Boshliq yoki boshqa xodimlarni login va parol bilan yaratish formasi."""

    class Meta(AdminUserCreationForm.Meta):
        model = User
        fields = (
            "username",
            "first_name",
            "last_name",
            "role",
            "specialty",
            "department_name",
            "telegram_username",
            "is_active",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if "is_active" in self.fields:
            self.fields["is_active"].initial = True


@admin.register(User)
class UserAdmin(RecoverableDeleteMixin, DjangoUserAdmin):
    add_form = CustomUserCreationForm
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
    add_fieldsets = (
        (
            "Asosiy ma'lumotlar",
            {
                "classes": ("wide",),
                "fields": ("username", "role", "first_name", "last_name", "usable_password", "password1", "password2"),
            },
        ),
        (
            "Qo'shimcha va holat",
            {
                "classes": ("wide",),
                "fields": ("specialty", "department_name", "telegram_username", "is_active"),
            },
        ),
    )

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "<id>/approve/",
                self.admin_site.admin_view(self.process_approve),
                name="accounts_user_approve",
            ),
        ]
        return custom_urls + urls

    def process_approve(self, request, id, *args, **kwargs):
        user = self.get_object(request, id)
        if user:
            user.is_active = True
            user.save(update_fields=["is_active"])
            self.message_user(
                request,
                f"{user.full_name or user.username} akkaunti muvaffaqiyatli tasdiqlandi (faollashtirildi).",
                level=messages.SUCCESS,
            )
        return redirect(request.META.get("HTTP_REFERER") or "admin:accounts_user_changelist")

    @admin.display(description="Holat", ordering="is_active")
    def status_badge(self, obj):
        if obj.is_active:
            return format_html('<span class="tf-badge tf-badge-success">Faol</span>')
        return format_html(
            '<span class="tf-badge tf-badge-danger">Kutilmoqda</span> '
            '<a href="{}/approve/" style="display:inline-block; margin-left:6px; padding:2px 8px; font-size:11px; '
            'background:#16a34a; color:#fff; border-radius:4px; text-decoration:none; font-weight:600;">'
            'Tasdiqlash ✓</a>',
            obj.pk,
        )
