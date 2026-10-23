from django.contrib import messages
from django.contrib.admin import AdminSite
from django.contrib.admin.models import LogEntry
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.db import models
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils import timezone


class TeamFlowAdminSite(AdminSite):
    site_header = "TeamFlow"
    site_title = "TeamFlow"
    index_title = "Boshqaruv markazi"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("search/", self.admin_view(self.global_search_view), name="global_search"),
            path("trash/", self.admin_view(self.trash_view), name="trash"),
        ]
        return custom_urls + urls

    def each_context(self, request):
        """Add live shell counters without relying on hard-coded UI badges."""
        context = super().each_context(request)
        if not request.user.is_authenticated:
            return context

        from apps.chat.models import ChatMessage
        from apps.notifications.models import Notification

        context["admin_nav_counts"] = {
            "chat": ChatMessage.objects.count() if request.user.has_perm("chat.view_chatmessage") else 0,
            "notifications": Notification.objects.filter(is_read=False).count()
            if request.user.has_perm("notifications.view_notification")
            else 0,
        }
        return context

    def index(self, request, extra_context=None):
        from apps.accounts.models import User
        from apps.chat.models import ChatMessage
        from apps.core.models import ActivityLog, Comment
        from apps.orders.models import Order
        from apps.projects.models import Project
        from apps.suggestions.models import Suggestion
        from apps.tasks.models import Task

        today = timezone.localdate()
        uz_months = ["YANVAR", "FEVRAL", "MART", "APREL", "MAY", "IYUN", "IYUL", "AVGUST", "SENTABR", "OKTABR", "NOYABR", "DEKABR"]
        uz_weekdays = ["DUSHANBA", "SESHANBA", "CHORSHANBA", "PAYSHANBA", "JUMA", "SHANBA", "YAKSHANBA"]
        formatted_date = f"{today.day} {uz_months[today.month - 1]} {today.year}, {uz_weekdays[today.weekday()]}"

        metrics = {
            "total_users": User.objects.count(),
            "pending_users": User.objects.filter(is_active=False).count(),
            "active_projects": Project.objects.exclude(
                stage__in=(Project.Stage.DONE, Project.Stage.REJECTED)
            ).count(),
            "open_tasks": Task.objects.filter(archived_at__isnull=True).exclude(status=Task.Status.DONE).count(),
            "archived_tasks": Task.objects.filter(archived_at__isnull=False).count(),
            "pending_orders": Order.objects.filter(status=Order.Status.SUBMITTED).count(),
            "pending_suggestions": Suggestion.objects.filter(status=Suggestion.Status.PENDING).count(),
            "total_chat_messages": ChatMessage.objects.count(),
            "total_comments": Comment.objects.count(),
            "total_deletions": ActivityLog.objects.filter(
                models.Q(verb__icontains="delete") | models.Q(verb__icontains="archive")
            ).count(),
            "today": today,
            "formatted_date": formatted_date,
        }

        recent_chats = ChatMessage.objects.select_related("author", "recipient").order_by("-created_at")[:6]
        recent_logs = ActivityLog.objects.select_related("actor").order_by("-created_at")[:8]
        recent_activities = []
        for chat in recent_chats:
            recent_activities.append({
                "icon": "chat",
                "title": "Yangi yozishma",
                "desc": chat.text,
                "created_at": chat.created_at,
                "actor": chat.author.full_name,
            })
        for log in recent_logs:
            is_deletion = "delete" in log.verb or "archive" in log.verb
            recent_activities.append({
                "icon": "trash" if is_deletion else "task",
                "title": "O‘chirildi / arxivlandi" if is_deletion else "Tizim amali",
                "desc": log.message,
                "created_at": log.created_at,
                "actor": log.actor.full_name if log.actor else "Tizim",
            })
        recent_activities.sort(key=lambda item: item["created_at"], reverse=True)
        recent_activities = recent_activities[:6]

        # So'nggi arxivlangan vazifalar
        recent_archived_tasks = Task.objects.filter(archived_at__isnull=False).order_by("-archived_at")[:5]

        context = {
            **(extra_context or {}),
            "admin_metrics": metrics,
            "recent_activities": recent_activities,
            "recent_chats": recent_chats,
            "recent_archived_tasks": recent_archived_tasks,
        }
        return super().index(request, context)

    def global_search_view(self, request):
        """Search the main operational records from one admin entry point."""
        from apps.accounts.models import User
        from apps.chat.models import ChatMessage
        from apps.orders.models import Order
        from apps.projects.models import Project
        from apps.suggestions.models import Suggestion
        from apps.tasks.models import Task

        query = request.GET.get("q", "").strip()
        groups = []
        if len(query) >= 2:
            searchable = (
                ("Foydalanuvchilar", "accounts.view_user", User.objects.filter(
                    models.Q(username__icontains=query)
                    | models.Q(first_name__icontains=query)
                    | models.Q(last_name__icontains=query)
                    | models.Q(email__icontains=query)
                )[:8], "accounts_user_change", lambda obj: obj.full_name, lambda obj: f"@{obj.username}"),
                ("Loyihalar", "projects.view_project", Project.objects.filter(
                    models.Q(name__icontains=query) | models.Q(code__icontains=query)
                )[:8], "projects_project_change", lambda obj: obj.name, lambda obj: obj.code),
                ("Vazifalar", "tasks.view_task", Task.objects.filter(
                    models.Q(title__icontains=query) | models.Q(code__icontains=query)
                )[:8], "tasks_task_change", lambda obj: obj.title, lambda obj: obj.code),
                ("Buyurtmalar", "orders.view_order", Order.objects.filter(title__icontains=query)[:8],
                 "orders_order_change", lambda obj: obj.title, lambda obj: obj.get_status_display()),
                ("Takliflar", "suggestions.view_suggestion", Suggestion.objects.filter(
                    models.Q(title__icontains=query) | models.Q(body__icontains=query)
                )[:8], "suggestions_suggestion_change", lambda obj: obj.title, lambda obj: obj.get_status_display()),
                ("Yozishmalar", "chat.view_chatmessage", ChatMessage.objects.filter(text__icontains=query)[:8],
                 "chat_chatmessage_change", lambda obj: obj.text[:90], lambda obj: obj.author.full_name),
            )
            for label, permission, queryset, url_name, title, subtitle in searchable:
                if not request.user.has_perm(permission):
                    continue
                items = [
                    {
                        "title": title(obj),
                        "subtitle": subtitle(obj),
                        "url": reverse(f"admin:{url_name}", args=[obj.pk]),
                    }
                    for obj in queryset
                ]
                if items:
                    groups.append({"label": label, "items": items})

        return TemplateResponse(
            request,
            "admin/global_search.html",
            {
                **self.each_context(request),
                "title": "Qidiruv natijalari",
                "query": query,
                "search_groups": groups,
                "query_is_valid": len(query) >= 2,
            },
        )

    def trash_view(self, request):
        """O'chirilganlar, arxivdagi ob'ektlar, o'chirishlar auditi va keshni boshqarish sahifasi."""
        if not request.user.is_superuser:
            raise PermissionDenied

        from apps.accounts.models import User
        from apps.core.models import ActivityLog
        from apps.tasks.models import Task

        if request.method == "POST":
            action = request.POST.get("action")
            if action == "restore_task":
                task_id = request.POST.get("task_id")
                updated = Task.objects.filter(pk=task_id, archived_at__isnull=False).update(archived_at=None)
                if updated:
                    messages.success(request, f"Vazifa #{task_id} muvaffaqiyatli qayta tiklandi.")
                else:
                    messages.warning(request, "Vazifa topilmadi yoki allaqachon faol.")
                return redirect("admin:trash")

            if action == "restore_all_tasks":
                count = Task.objects.filter(archived_at__isnull=False).update(archived_at=None)
                messages.success(request, f"Jami {count} ta arxivlangan vazifa qayta tiklandi.")
                return redirect("admin:trash")

            if action == "activate_user":
                user_id = request.POST.get("user_id")
                updated = User.objects.filter(pk=user_id, is_active=False).update(is_active=True)
                if updated:
                    messages.success(request, f"Foydalanuvchi #{user_id} muvaffaqiyatli faollashtirildi.")
                return redirect("admin:trash")

            if action == "clear_cache":
                try:
                    cache.clear()
                    messages.success(request, "Tizim keshi muvaffaqiyatli tozalandi (Redis / Django cache).")
                except Exception as exc:
                    messages.error(request, f"Keshni tozalashda xatolik: {exc}")
                return redirect("admin:trash")

        archived_tasks = (
            Task.objects.filter(archived_at__isnull=False)
            .select_related("project", "created_by")
            .order_by("-archived_at")
        )
        inactive_users = User.objects.filter(is_active=False).order_by("-date_joined")
        deletion_logs = (
            ActivityLog.objects.filter(models.Q(verb__icontains="delete") | models.Q(verb__icontains="archive"))
            .select_related("actor")
            .order_by("-created_at")[:50]
        )
        admin_deletions = (
            LogEntry.objects.filter(action_flag=3)
            .select_related("user", "content_type")
            .order_by("-action_time")[:50]
        )

        stats = {
            "archived_tasks_count": archived_tasks.count(),
            "inactive_users_count": inactive_users.count(),
            "deletion_logs_count": deletion_logs.count(),
            "admin_deletions_count": admin_deletions.count(),
        }

        context = {
            **self.each_context(request),
            "title": "O‘chirilganlar va keshlar markazi",
            "stats": stats,
            "archived_tasks": archived_tasks[:50],
            "inactive_users": inactive_users[:50],
            "deletion_logs": deletion_logs,
            "admin_deletions": admin_deletions,
        }
        return TemplateResponse(request, "admin/trash.html", context)


teamflow_admin_site = TeamFlowAdminSite(name="teamflow_admin")
