from django.conf import settings
from django.contrib import messages
from django.contrib.admin import AdminSite
from django.contrib.admin.models import LogEntry
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.db import connection, models
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils import timezone
from datetime import date, timedelta


class TeamFlowAdminSite(AdminSite):
    site_header = "TeamFlow"
    site_title = "TeamFlow"
    index_title = "Boshqaruv markazi"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("search/", self.admin_view(self.global_search_view), name="global_search"),
            path("recovery/", self.admin_view(self.trash_view), name="recovery"),
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
        from apps.core.models import ActivityLog, AdminDeletedRecord, Comment
        from apps.orders.models import Order
        from apps.projects.models import Project
        from apps.suggestions.models import Suggestion
        from apps.tasks.models import Task

        today = timezone.localdate()
        month_start = today.replace(day=1)
        can_view_users = request.user.has_perm("accounts.view_user")
        can_view_projects = request.user.has_perm("projects.view_project")
        can_view_tasks = request.user.has_perm("tasks.view_task")
        can_view_orders = request.user.has_perm("orders.view_order")
        can_view_suggestions = request.user.has_perm("suggestions.view_suggestion")
        can_view_chat = request.user.has_perm("chat.view_chatmessage")
        can_view_comments = request.user.has_perm("core.view_comment")
        can_view_activity = request.user.has_perm("core.view_activitylog")
        can_view_trash = request.user.is_superuser
        uz_months = ["YANVAR", "FEVRAL", "MART", "APREL", "MAY", "IYUN", "IYUL", "AVGUST", "SENTABR", "OKTABR", "NOYABR", "DEKABR"]
        uz_months_short = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"]
        uz_weekdays = ["DUSHANBA", "SESHANBA", "CHORSHANBA", "PAYSHANBA", "JUMA", "SHANBA", "YAKSHANBA"]
        formatted_date = f"{today.day} {uz_months[today.month - 1]} {today.year}, {uz_weekdays[today.weekday()]}"
        database_name = {"sqlite": "SQLite", "postgresql": "PostgreSQL"}.get(
            connection.vendor, connection.vendor.title()
        )
        cache_backend = settings.CACHES["default"]["BACKEND"].lower()
        admin_runtime = {
            "database": database_name,
            "cache": "Redis" if "redis" in cache_backend else "Django cache",
            "media": "Nginx protected media"
            if settings.PROTECTED_MEDIA_ACCEL_PREFIX
            else "Django media",
        }

        # Monthly counts for operational trends
        users_this_month = User.objects.filter(date_joined__date__gte=month_start).count() if can_view_users else 0
        projects_this_month = Project.objects.filter(created_at__date__gte=month_start).count() if can_view_projects else 0
        tasks_this_month = Task.objects.filter(created_at__date__gte=month_start).count() if can_view_tasks else 0
        chat_this_month = ChatMessage.objects.filter(created_at__date__gte=month_start).count() if can_view_chat else 0
        pending_this_month = User.objects.filter(is_active=False, date_joined__date__gte=month_start).count() if can_view_users else 0
        archived_this_month = Task.objects.filter(archived_at__date__gte=month_start).count() if can_view_trash else 0

        trends = {
            "users": {"text": f"+{users_this_month} bu oy" if users_this_month else "0 bu oy", "symbol": "↑" if users_this_month else "•", "type": "pos" if users_this_month else "neutral"},
            "pending": {"text": f"+{pending_this_month} bu oy" if pending_this_month else "0 bu oy", "symbol": "↑" if pending_this_month else "•", "type": "neutral"},
            "projects": {"text": f"+{projects_this_month} bu oy" if projects_this_month else "0 bu oy", "symbol": "↑" if projects_this_month else "•", "type": "pos" if projects_this_month else "neutral"},
            "tasks": {"text": f"+{tasks_this_month} bu oy" if tasks_this_month else "-1 bu oy", "symbol": "↑" if tasks_this_month else "↓", "type": "pos" if tasks_this_month else "neg"},
            "chat": {"text": f"+{chat_this_month} bu oy" if chat_this_month else "0 bu oy", "symbol": "↑" if chat_this_month else "•", "type": "pos" if chat_this_month else "neutral"},
            "trash": {"text": f"+{archived_this_month} bu oy" if archived_this_month else "0 bu oy", "symbol": "↑" if archived_this_month else "•", "type": "neg" if archived_this_month else "neutral"},
        }

        metrics = {
            "total_users": User.objects.count() if can_view_users else 0,
            "pending_users": User.objects.filter(is_active=False).count() if can_view_users else 0,
            "active_projects": Project.objects.exclude(
                stage__in=(Project.Stage.DONE, Project.Stage.REJECTED)
            ).count() if can_view_projects else 0,
            "open_tasks": Task.objects.filter(archived_at__isnull=True).exclude(status=Task.Status.DONE).count()
            if can_view_tasks else 0,
            "archived_tasks": Task.objects.filter(archived_at__isnull=False).count() if can_view_trash else 0,
            "pending_snapshots": AdminDeletedRecord.objects.filter(restored_at__isnull=True).count()
            if can_view_trash else 0,
            "pending_orders": Order.objects.filter(status=Order.Status.SUBMITTED).count() if can_view_orders else 0,
            "pending_suggestions": Suggestion.objects.filter(status=Suggestion.Status.PENDING).count()
            if can_view_suggestions else 0,
            "total_chat_messages": ChatMessage.objects.count() if can_view_chat else 0,
            "total_comments": Comment.objects.count() if can_view_comments else 0,
            "total_deletions": ActivityLog.objects.filter(
                models.Q(verb__icontains="delete") | models.Q(verb__icontains="archive")
            ).count() if can_view_activity else 0,
            "today": today,
            "formatted_date": formatted_date,
            "trends": trends,
        }

        # 14-day Multi-series Spline Chart for 'Tizim faolligi'
        fourteen_days = [today - timedelta(days=offset) for offset in range(13, -1, -1)]
        users_daily = [User.objects.filter(date_joined__date=d).count() for d in fourteen_days] if can_view_users else [0]*14
        proj_daily = [Project.objects.filter(created_at__date=d).count() for d in fourteen_days] if can_view_projects else [0]*14
        tasks_daily = [Task.objects.filter(created_at__date=d).count() for d in fourteen_days] if can_view_tasks else [0]*14
        chats_daily = [ChatMessage.objects.filter(created_at__date=d).count() for d in fourteen_days] if can_view_chat else [0]*14

        def _build_spline(data, max_scale=20, w=580, h=150, pad_x=24, pad_y=16):
            inner_w = w - (pad_x * 2)
            inner_h = h - (pad_y * 2)
            step_x = inner_w / 13.0
            scale_max = max(max_scale, max(data or [0]) or 1)
            pts = []
            for i, val in enumerate(data):
                px = pad_x + (i * step_x)
                py = h - pad_y - ((val / float(scale_max)) * inner_h)
                pts.append((px, py, val))
            if not pts:
                return '', '', []
            d = f'M {pts[0][0]:.1f} {pts[0][1]:.1f}'
            for i in range(len(pts) - 1):
                p0 = pts[i - 1] if i > 0 else pts[i]
                p1 = pts[i]
                p2 = pts[i + 1]
                p3 = pts[i + 2] if i + 2 < len(pts) else p2
                cp1x = p1[0] + (p2[0] - p0[0]) / 6.0
                cp1y = p1[1] + (p2[1] - p0[1]) / 6.0
                cp2x = p2[0] - (p3[0] - p1[0]) / 6.0
                cp2y = p2[1] - (p3[1] - p1[1]) / 6.0
                d += f' C {cp1x:.1f} {cp1y:.1f}, {cp2x:.1f} {cp2y:.1f}, {p2[0]:.1f} {p2[1]:.1f}'
            bottom_y = h - pad_y
            area_d = f'{d} L {pts[-1][0]:.1f} {bottom_y:.1f} L {pts[0][0]:.1f} {bottom_y:.1f} Z'
            dots = [{'x': round(p[0], 1), 'y': round(p[1], 1), 'val': p[2]} for p in pts]
            return d, area_d, dots

        u_path, u_area, u_dots = _build_spline(users_daily, max_scale=20)
        p_path, p_area, p_dots = _build_spline(proj_daily, max_scale=20)
        t_path, t_area, t_dots = _build_spline(tasks_daily, max_scale=20)
        c_path, c_area, c_dots = _build_spline(chats_daily, max_scale=20)

        timeline_labels = [
            f'{d.day} {uz_months_short[d.month - 1]}'
            for i, d in enumerate(fourteen_days)
            if i % 2 == 0 or i == 13
        ]

        system_activity = {
            'users': {'path': u_path, 'area': u_area, 'dots': u_dots},
            'projects': {'path': p_path, 'area': p_area, 'dots': p_dots},
            'tasks': {'path': t_path, 'area': t_area, 'dots': t_dots},
            'chats': {'path': c_path, 'area': c_area, 'dots': c_dots},
            'labels': timeline_labels,
            'y_axis': [20, 15, 10, 5, 0],
        }

        activity_chart = {"week": [], "month": []}
        if can_view_activity:
            week_days = [today - timedelta(days=offset) for offset in range(6, -1, -1)]
            week_counts = [
                ActivityLog.objects.filter(created_at__date=day).count()
                for day in week_days
            ]
            week_max = max(week_counts or [0]) or 1
            activity_chart["week"] = [
                {
                    "label": day.strftime("%a")[:3].upper(),
                    "date": day.strftime("%d.%m"),
                    "count": count,
                    "height": max(8, round((count / week_max) * 100)) if count else 8,
                }
                for day, count in zip(week_days, week_counts)
            ]

            month_points = []
            month_start = today.replace(day=1)
            for offset in range(5, -1, -1):
                year = month_start.year
                month = month_start.month - offset
                while month <= 0:
                    year -= 1
                    month += 12
                month_points.append(date(year, month, 1))
            month_counts = []
            for point in month_points:
                next_month = date(point.year + (point.month == 12), 1 if point.month == 12 else point.month + 1, 1)
                month_counts.append(
                    ActivityLog.objects.filter(created_at__date__gte=point, created_at__date__lt=next_month).count()
                )
            month_max = max(month_counts or [0]) or 1
            activity_chart["month"] = [
                {
                    "label": point.strftime("%b")[:3].upper(),
                    "count": count,
                    "height": max(8, round((count / month_max) * 100)) if count else 8,
                }
                for point, count in zip(month_points, month_counts)
            ]

        recent_chats = (
            ChatMessage.objects.select_related("author", "recipient").order_by("-created_at")[:6]
            if can_view_chat else []
        )
        recent_logs = (
            ActivityLog.objects.select_related("actor").order_by("-created_at")[:8]
            if can_view_activity else []
        )
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
        recent_archived_tasks = (
            Task.objects.filter(archived_at__isnull=False).order_by("-archived_at")[:5]
            if can_view_trash else []
        )
        recent_deleted_records = (
            AdminDeletedRecord.objects.select_related("content_type", "deleted_by")
            .filter(restored_at__isnull=True).order_by("-deleted_at")[:5]
            if can_view_trash else []
        )

        pending_queue = [
            {
                "title": "Yangi akkauntlar",
                "desc": "Faollashtirish navbatida",
                "count": metrics["pending_users"],
                "dot": "pink",
                "url": reverse("admin:accounts_user_changelist") + "?is_active__exact=0" if can_view_users else "#",
            },
            {
                "title": "Buyurtmalar",
                "desc": "Ko‘rib chiqilmagan so‘rovlar",
                "count": metrics["pending_orders"],
                "dot": "amber",
                "url": reverse("admin:orders_order_changelist") + "?status__exact=submitted" if can_view_orders else "#",
            },
            {
                "title": "Takliflar",
                "desc": "Rahbar qarorini kutmoqda",
                "count": metrics["pending_suggestions"],
                "dot": "purple",
                "url": reverse("admin:suggestions_suggestion_changelist") + "?status__exact=pending" if can_view_suggestions else "#",
            },
            {
                "title": "O'chirilgan vazifalar",
                "desc": "Arxivdagi vazifalar markazi",
                "count": metrics["archived_tasks"],
                "dot": "cyan",
                "url": reverse("admin:trash") if can_view_trash else "#",
            },
        ]

        context = {
            **(extra_context or {}),
            "admin_metrics": metrics,
            "admin_runtime": admin_runtime,
            "recent_activities": recent_activities,
            "recent_chats": recent_chats,
            "recent_archived_tasks": recent_archived_tasks,
            "recent_deleted_records": recent_deleted_records,
            "activity_chart": activity_chart,
            "system_activity": system_activity,
            "pending_queue": pending_queue,
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
                ("Topshiriqlar", "tasks.view_task", Task.objects.filter(
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
        from apps.core.models import ActivityLog, AdminDeletedRecord
        from apps.tasks.models import Task
        from apps.core.recovery import restore_snapshot

        if request.method == "POST":
            action = request.POST.get("action")
            if action == "restore_task":
                task_id = request.POST.get("task_id")
                updated = Task.objects.filter(pk=task_id, archived_at__isnull=False).update(archived_at=None)
                if updated:
                    messages.success(request, f"Topshiriq #{task_id} muvaffaqiyatli qayta tiklandi.")
                else:
                    messages.warning(request, "Topshiriq topilmadi yoki allaqachon faol.")
                return redirect("admin:trash")

            if action == "restore_all_tasks":
                count = Task.objects.filter(archived_at__isnull=False).update(archived_at=None)
                messages.success(request, f"Jami {count} ta arxivlangan topshiriq qayta tiklandi.")
                return redirect("admin:trash")

            if action == "restore_record":
                record_id = request.POST.get("record_id")
                record = AdminDeletedRecord.objects.filter(pk=record_id, restored_at__isnull=True).first()
                if not record:
                    messages.warning(request, "Tiklanmagan snapshot topilmadi yoki u allaqachon tiklangan.")
                else:
                    try:
                        restore_snapshot(record)
                        messages.success(request, f"{record.object_repr} muvaffaqiyatli qayta tiklandi.")
                    except Exception as exc:
                        record.restore_error = str(exc)[:500]
                        record.save(update_fields=["restore_error"])
                        messages.error(request, f"Tiklash amalga oshmadi: {exc}")
                return redirect("admin:trash")

            if action == "restore_all_records":
                restored = 0
                failed = 0
                for record in AdminDeletedRecord.objects.filter(restored_at__isnull=True).order_by("deleted_at")[:100]:
                    try:
                        restore_snapshot(record)
                        restored += 1
                    except Exception as exc:
                        record.restore_error = str(exc)[:500]
                        record.save(update_fields=["restore_error"])
                        failed += 1
                if restored:
                    messages.success(request, f"{restored} ta obyekt qayta tiklandi.")
                if failed:
                    messages.warning(request, f"{failed} ta snapshot tiklanmadi; sababini Recovery Center'da ko'ring.")
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
        deleted_records = AdminDeletedRecord.objects.select_related("content_type", "deleted_by").order_by("-deleted_at")
        pending_records = deleted_records.filter(restored_at__isnull=True)

        stats = {
            "archived_tasks_count": archived_tasks.count(),
            "inactive_users_count": inactive_users.count(),
            "deletion_logs_count": deletion_logs.count(),
            "admin_deletions_count": admin_deletions.count(),
            "snapshot_count": deleted_records.count(),
            "pending_snapshot_count": pending_records.count(),
        }

        context = {
            **self.each_context(request),
            "title": "O‘chirilganlar va keshlar markazi",
            "stats": stats,
            "archived_tasks": archived_tasks[:50],
            "inactive_users": inactive_users[:50],
            "deletion_logs": deletion_logs,
            "admin_deletions": admin_deletions,
            "deleted_records": deleted_records[:100],
        }
        return TemplateResponse(request, "admin/trash.html", context)


teamflow_admin_site = TeamFlowAdminSite(name="teamflow_admin")
