from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class AdminDashboardUITests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_superuser(
            username="ui-admin",
            password="Admin-parol-2026",
            email="admin@example.com",
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

    def test_admin_list_pages_keep_the_custom_shell(self):
        response = self.client.get(reverse("admin:accounts_user_changelist"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "admin/teamflow.css")
        self.assertContains(response, "Foydalanuvchilar")
