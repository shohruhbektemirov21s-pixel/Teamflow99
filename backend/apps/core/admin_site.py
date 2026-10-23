from django.contrib.admin import AdminSite
from django.utils import timezone


class TeamFlowAdminSite(AdminSite):
    site_header = "TeamFlow"
    site_title = "TeamFlow"
    index_title = "Boshqaruv markazi"

    def index(self, request, extra_context=None):
        from apps.accounts.models import User
        from apps.orders.models import Order
        from apps.projects.models import Project
        from apps.suggestions.models import Suggestion
        from apps.tasks.models import Task

        metrics = {
            "total_users": User.objects.count(),
            "pending_users": User.objects.filter(is_active=False).count(),
            "active_projects": Project.objects.exclude(
                stage__in=(Project.Stage.DONE, Project.Stage.REJECTED)
            ).count(),
            "open_tasks": Task.objects.filter(archived_at__isnull=True).exclude(status=Task.Status.DONE).count(),
            "pending_orders": Order.objects.filter(status=Order.Status.SUBMITTED).count(),
            "pending_suggestions": Suggestion.objects.filter(status=Suggestion.Status.PENDING).count(),
            "today": timezone.localdate(),
        }
        context = {**(extra_context or {}), "admin_metrics": metrics}
        return super().index(request, context)


teamflow_admin_site = TeamFlowAdminSite(name="teamflow_admin")
