from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import Role
from apps.chat.models import ChatMessage
from apps.core.models import ActivityLog
from apps.notifications.models import Notification
from apps.tasks.models import Task
from config.urls import teamflow_admin_site


class AdminDashboardUITests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_superuser(
            username="ui-admin",
            password="Admin-parol-2026",
            email="admin@example.com",
        )
        self.dev = User.objects.create_user(
            username="dev-ali",
            password="Dev-parol-2026",
            first_name="Ali",
            last_name="Valiyev",
            role=Role.DEVELOPER,
            is_active=True,
        )
        self.pm = User.objects.create_user(
            username="pm-nodir",
            password="Pm-parol-2026",
            first_name="Nodir",
            last_name="Qodirov",
            role=Role.PM,
            is_active=True,
        )
        self.inactive = User.objects.create_user(
            username="inactive-user",
            password="In-parol-2026",
            first_name="Jasur",
            last_name="Toshov",
            role=Role.DEVELOPER,
            is_active=False,
        )
        self.client.force_login(self.admin)

    def test_dashboard_has_teamflow_shell_and_operational_metrics(self):
        response = self.client.get(reverse("admin:index"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "admin/teamflow.css")
        self.assertContains(response, "Boshqaruv markazi")
        self.assertContains(response, "Jami foydalanuvchi")
        self.assertContains(response, "Tasdiqlash kutilmoqda")
        self.assertContains(response, "Tezkor amallar")
        self.assertContains(response, "tf-admin-sidebar")
        self.assertContains(response, "Tizim faol")
        self.assertContains(response, "tf-dashboard-toolbar")
        self.assertContains(response, "Foydalanuvchilar")
        self.assertContains(response, "Buyurtmalar")
        self.assertContains(response, "O'chirilgan vazifalar")
        self.assertContains(response, "Yozishmalar (Chat)")
        self.assertContains(response, "Barcha bo'limlar")
        self.assertContains(response, "admin/teamflow.js")
        self.assertContains(response, 'data-testid="admin-dashboard"')
        self.assertContains(response, 'data-testid="admin-sidebar"')
        self.assertContains(response, 'data-testid="admin-left-sidebar"')
        self.assertContains(response, 'data-testid="admin-simple-panel"')
        self.assertContains(response, 'data-testid="admin-nav-projects"')
        self.assertContains(response, 'data-testid="admin-nav-tasks"')
        self.assertContains(response, 'data-testid="admin-nav-chat"')
        self.assertContains(response, 'data-testid="admin-nav-trash"')
        self.assertContains(response, "O'chirilganlar")
        self.assertContains(response, "Chat")
        self.assertContains(response, 'data-testid="admin-kpi-grid"')
        self.assertContains(response, 'data-testid="admin-global-search"')
        self.assertContains(response, 'data-testid="admin-theme-toggle"')
        self.assertContains(response, 'data-testid="admin-command-palette"')
        self.assertIn(response.context["admin_runtime"]["database"], {"SQLite", "PostgreSQL"})
        self.assertIn(response.context["admin_runtime"]["cache"], {"Django cache", "Redis"})
        self.assertIn("media", response.context["admin_runtime"])
        self.assertNotContains(response, "testuser123")
        self.assertNotContains(response, "↑ +2 bu oy")

    def test_shell_uses_real_navigation_counts(self):
        ChatMessage.objects.create(
            author=self.dev,
            recipient=self.pm,
            text="Admin navigatsiyasi uchun xabar",
        )
        Notification.objects.create(
            recipient=self.admin,
            kind=Notification.Kind.COMMENT,
            message="Tekshirilmagan bildirishnoma",
        )

        response = self.client.get(reverse("admin:index"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'data-testid="notification-count">1<')
        self.assertContains(response, 'data-testid="chat-count">1<')

    def test_global_search_finds_records_and_handles_empty_query(self):
        task = Task.objects.create(title="Mobil admin tekshiruvi", created_by=self.pm)

        response = self.client.get(reverse("admin:global_search"), {"q": "Mobil admin"})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Qidiruv natijalari")
        self.assertContains(response, task.title)
        self.assertContains(response, reverse("admin:tasks_task_change", args=[task.pk]))

        empty_response = self.client.get(reverse("admin:global_search"), {"q": "   "})
        self.assertEqual(empty_response.status_code, 200)
        self.assertContains(empty_response, "Qidirish uchun kamida 2 ta belgi kiriting")

    def test_admin_pages_keep_the_left_navigation_panel(self):
        response = self.client.get(reverse("admin:tasks_task_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "tf-admin-sidebar")
        self.assertContains(response, 'data-testid="admin-sidebar"')
        self.assertContains(response, 'data-testid="admin-page-shell"')
        self.assertContains(response, reverse("admin:index"))
        self.assertContains(response, reverse("admin:accounts_user_changelist"))
        self.assertContains(response, reverse("admin:projects_project_changelist"))
        self.assertContains(response, reverse("admin:chat_chatmessage_changelist"))
        self.assertContains(response, reverse("admin:trash"))

    def test_admin_list_pages_keep_the_custom_shell(self):
        response = self.client.get(reverse("admin:accounts_user_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "admin/teamflow.css")
        self.assertContains(response, "Foydalanuvchilar")

    def test_all_admin_surfaces_share_the_figma_shell(self):
        urls = (
            reverse("admin:accounts_user_changelist"),
            reverse("admin:projects_project_add"),
            reverse("admin:global_search"),
            reverse("admin:trash"),
        )

        for url in urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 200)
                self.assertContains(response, 'data-testid="admin-page-shell"')
                self.assertContains(response, 'data-testid="admin-topbar"')
                self.assertContains(response, 'data-testid="admin-left-sidebar"')
                self.assertContains(response, "tf-admin-page")

    def test_login_keeps_the_teamflow_visual_system(self):
        self.client.logout()
        response = self.client.get(reverse("admin:login"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "admin/teamflow.css")
        self.assertContains(response, "tf-login-page")
        self.assertContains(response, "Admin panelga kirish")

    def test_chat_messages_are_accessible_in_admin(self):
        ChatMessage.objects.create(
            author=self.dev,
            recipient=self.pm,
            text="Assalomu alaykum, vazifani topshirdim, ko‘rib bering.",
        )
        response = self.client.get(reverse("admin:chat_chatmessage_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Ali Valiyev")
        self.assertContains(response, "Nodir Qodirov")
        self.assertContains(response, "Assalomu alaykum, vazifani topshirdim")

    def test_archived_tasks_and_filter_in_admin(self):
        active_task = Task.objects.create(
            title="Faol vazifa",
            created_by=self.pm,
        )
        archived_task = Task.objects.create(
            title="Arxivlangan vazifa",
            created_by=self.pm,
            archived_at=timezone.now(),
        )

        resp_all = self.client.get(reverse("admin:tasks_task_changelist"))
        self.assertEqual(resp_all.status_code, 200)
        self.assertContains(resp_all, active_task.title)
        self.assertContains(resp_all, archived_task.title)
        self.assertContains(resp_all, "O‘chirilgan")
        self.assertContains(resp_all, "Faol")

        resp_archived = self.client.get(reverse("admin:tasks_archivedtask_changelist"))
        self.assertEqual(resp_archived.status_code, 200)
        self.assertContains(resp_archived, archived_task.title)
        self.assertNotContains(resp_archived, active_task.title)

    def test_task_restore_action_in_admin(self):
        archived_task = Task.objects.create(
            title="Qayta tiklanadigan vazifa",
            created_by=self.pm,
            archived_at=timezone.now(),
        )

        response = self.client.post(
            reverse("admin:tasks_archivedtask_changelist"),
            {
                "action": "restore_selected_tasks",
                "_selected_action": [str(archived_task.pk)],
            },
            follow=True,
        )
        self.assertEqual(response.status_code, 200)
        archived_task.refresh_from_db()
        self.assertIsNone(archived_task.archived_at)

    def test_dashboard_displays_recent_chats_and_deletions(self):
        ChatMessage.objects.create(
            author=self.dev,
            recipient=self.pm,
            text="Loyiha fayllari yangilandi.",
        )
        ActivityLog.objects.create(
            actor=self.pm,
            verb="task_deleted",
            message="Nodir Qodirov vazifani arxivladi: Test vazifa",
        )

        response = self.client.get(reverse("admin:index"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Loyiha fayllari yangilandi.")
        self.assertContains(response, "Nodir Qodirov vazifani arxivladi: Test vazifa")
        self.assertContains(response, "O‘chirildi")

    def test_dedicated_trash_page_get_and_actions(self):
        archived_task = Task.objects.create(
            title="Maxsus arxivlangan vazifa",
            created_by=self.pm,
            archived_at=timezone.now(),
        )

        # 1. GET /admin/trash/
        response = self.client.get(reverse("admin:trash"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "O‘chirilganlar va keshlar markazi")
        self.assertContains(response, "Maxsus arxivlangan vazifa")
        self.assertContains(response, "Jasur Toshov")
        self.assertContains(response, "Keshni tozalash")

        # 2. POST /admin/trash/ restore_task
        post_resp = self.client.post(
            reverse("admin:trash"),
            {"action": "restore_task", "task_id": archived_task.pk},
            follow=True,
        )
        self.assertEqual(post_resp.status_code, 200)
        archived_task.refresh_from_db()
        self.assertIsNone(archived_task.archived_at)

        # 3. POST /admin/trash/ clear_cache
        cache_resp = self.client.post(
            reverse("admin:trash"),
            {"action": "clear_cache"},
            follow=True,
        )
        self.assertEqual(cache_resp.status_code, 200)
        self.assertContains(cache_resp, "Tizim keshi muvaffaqiyatli tozalandi")

    def test_trash_and_cache_center_is_restricted_to_superusers(self):
        staff = get_user_model().objects.create_user(
            username="limited-staff",
            password="Limited-parol-2026",
            is_staff=True,
            is_active=True,
        )
        self.client.force_login(staff)

        response = self.client.get(reverse("admin:trash"))

        self.assertEqual(response.status_code, 403)

    def test_dashboard_does_not_expose_records_without_view_permission(self):
        ChatMessage.objects.create(
            author=self.dev,
            recipient=self.pm,
            text="Faqat chat ruxsati bor admin ko'rishi kerak",
        )
        Task.objects.create(
            title="Faqat vazifa ruxsati bor admin ko'rishi kerak",
            created_by=self.pm,
            archived_at=timezone.now(),
        )
        ActivityLog.objects.create(
            actor=self.pm,
            verb="task_deleted",
            message="Faqat log ruxsati bor admin ko'rishi kerak",
        )
        staff = get_user_model().objects.create_user(
            username="dashboard-staff",
            password="Limited-parol-2026",
            is_staff=True,
            is_active=True,
        )
        staff.user_permissions.add(
            Permission.objects.get(codename="view_user", content_type__app_label="accounts")
        )
        self.client.force_login(staff)

        response = self.client.get(reverse("admin:index"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["admin_metrics"]["total_chat_messages"], 0)
        self.assertEqual(response.context["recent_activities"], [])
        self.assertEqual(list(response.context["recent_archived_tasks"]), [])
        self.assertNotContains(response, reverse("admin:projects_project_changelist"))
        self.assertNotContains(response, reverse("admin:chat_chatmessage_changelist"))
        self.assertNotContains(response, reverse("admin:orders_order_changelist"))
        self.assertNotContains(response, reverse("admin:trash"))
        self.assertNotContains(response, "Faqat chat ruxsati bor admin ko'rishi kerak")
        self.assertNotContains(response, "Faqat vazifa ruxsati bor admin ko'rishi kerak")
        self.assertNotContains(response, "Faqat log ruxsati bor admin ko'rishi kerak")

    def test_all_models_are_registered_in_admin(self):
        # Tizimdagi 30 dan ortiq barcha modellar admin panelda ro'yxatdan o'tgan
        self.assertGreaterEqual(len(teamflow_admin_site._registry), 30)
