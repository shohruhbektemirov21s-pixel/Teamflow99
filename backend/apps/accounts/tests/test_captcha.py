from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import Role
from apps.panel.tests.factories import make_user


@override_settings(CAPTCHA_REQUIRED=True)
class AccountCaptchaTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = make_user(Role.DEVELOPER)

    def register_payload(self):
        from apps.accounts.models import Specialty

        specialty = Specialty.objects.create(name="Backend")
        return {
            "first_name": "Ali", "last_name": "Test", "specialty": specialty.pk,
            "role": Role.DEVELOPER, "username": "captcha_user", "password": "Kuchli-parol-2026",
        }

    def test_challenge_returns_question_without_answer(self):
        response = self.client.get("/api/auth/captcha/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("challenge", response.data)
        self.assertRegex(response.data["question"], r"^\d+ \+ \d+ = \?$")
        self.assertNotIn("answer", response.data)

    @patch("apps.accounts.api.verify_captcha", return_value=False)
    def test_register_login_and_password_change_require_captcha(self, _verify):
        response = self.client.post("/api/auth/register/", self.register_payload(), format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("captcha_answer", response.data["fields"])

        self.user.set_password("Kuchli-parol-2026")
        self.user.save(update_fields=["password"])
        response = self.client.post("/api/auth/login/", {"username": self.user.username, "password": "Kuchli-parol-2026"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/auth/password/", {
            "current_password": "Kuchli-parol-2026", "new_password": "Yangi-parol-2026",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("captcha_answer", response.data["fields"])

    @patch("apps.accounts.api.verify_captcha", return_value=True)
    def test_valid_captcha_allows_sensitive_actions(self, _verify):
        response = self.client.post("/api/auth/register/", {
            **self.register_payload(), "captcha_challenge": "signed", "captcha_answer": "21",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)

        self.user.set_password("Kuchli-parol-2026")
        self.user.save(update_fields=["password"])
        response = self.client.post("/api/auth/login/", {
            "username": self.user.username, "password": "Kuchli-parol-2026",
            "captcha_challenge": "signed", "captcha_answer": "21",
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/auth/password/", {
            "current_password": "Kuchli-parol-2026", "new_password": "Yangi-parol-2026",
            "captcha_challenge": "signed", "captcha_answer": "21",
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
