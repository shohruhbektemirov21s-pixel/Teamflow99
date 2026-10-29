from django.contrib import admin
from .models import Suggestion, SuggestionVote
from apps.core.recovery import RecoverableDeleteMixin

@admin.register(Suggestion)
class SuggestionAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ["title", "author", "is_anonymous", "status", "created_at"]
    list_filter = ["status", "is_anonymous"]
    search_fields = ["title", "body"]

@admin.register(SuggestionVote)
class SuggestionVoteAdmin(RecoverableDeleteMixin, admin.ModelAdmin):
    list_display = ["suggestion", "voter", "kind"]
