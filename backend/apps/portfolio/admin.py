from django.contrib import admin

from .models import Follow, PortfolioAttachment, PortfolioComment, PortfolioItem, PortfolioReview, PortfolioVideo
from apps.core.recovery import RecoverableDeleteMixin


class PortfolioVideoInline(admin.TabularInline):
    model = PortfolioVideo
    extra = 0


class PortfolioAttachmentInline(admin.TabularInline):
    model = PortfolioAttachment
    extra = 0


@admin.register(PortfolioItem)
class PortfolioItemAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ["__str__", "owner", "project", "created_at"]
    list_select_related = ["owner", "project"]
    search_fields = ["title", "project__name", "owner__first_name", "owner__last_name"]
    raw_id_fields = ["owner", "project"]
    inlines = [PortfolioVideoInline, PortfolioAttachmentInline]


@admin.register(PortfolioReview)
class PortfolioReviewAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ["item", "author", "stars", "updated_at"]
    list_filter = ["stars"]
    raw_id_fields = ["item", "author"]


@admin.register(PortfolioComment)
class PortfolioCommentAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ["item", "author", "created_at"]
    raw_id_fields = ["item", "author"]


@admin.register(Follow)
class FollowAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ["follower", "developer", "created_at"]
    raw_id_fields = ["follower", "developer"]


@admin.register(PortfolioVideo)
class PortfolioVideoAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ["item", "original_name", "created_at"]
    search_fields = ["original_name", "item__title"]
    readonly_fields = ["created_at"]


@admin.register(PortfolioAttachment)
class PortfolioAttachmentAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ["item", "original_name", "created_at"]
    search_fields = ["original_name", "item__title"]
    readonly_fields = ["created_at"]
