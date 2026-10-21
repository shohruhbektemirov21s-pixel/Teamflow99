"""Synthetic login burst test for the isolated scale database only."""
import itertools
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from locust import HttpUser, between, events, task
from locust.runners import WorkerRunner

fixtures = json.loads(Path(os.environ.get("LOAD_FIXTURES", "/artifacts/users-100000.json")).read_text())
counter = itertools.count()
fixture_workers = int(os.environ.get("LOAD_WORKERS", "1"))


class LoginUser(HttpUser):
    wait_time = between(300, 600)

    def on_start(self):
        host = urlparse(self.host)
        if host.hostname not in ("proxy", "localhost", "127.0.0.1"):
            raise RuntimeError("Login load tests are restricted to the isolated local stack.")
        worker_index = self.environment.runner.worker_index
        index = next(counter) * fixture_workers + worker_index
        if index >= len(fixtures):
            raise RuntimeError("Insufficient unique login fixtures.")
        user = fixtures[index]
        self.client.get("/api/auth/csrf/", name="auth/csrf", timeout=20)
        csrf = self.client.cookies.get("csrftoken")
        response = self.client.post(
            "/api/auth/login/",
            json={"username": user["username"], "password": user["password"]},
            headers={"X-CSRFToken": csrf or "", "Referer": self.host + "/"},
            name="auth/login",
            timeout=20,
        )
        if response.status_code == 200:
            self.client.post("/api/auth/logout/", name="auth/logout", timeout=20)


@events.quitting.add_listener
def enforce_thresholds(environment, **kwargs):
    if isinstance(environment.runner, WorkerRunner):
        return
    stats = environment.stats.total
    max_p95 = float(os.environ.get("LOAD_MAX_P95_MS", "1000"))
    if stats.num_requests == 0 or stats.fail_ratio >= 0.01 or stats.get_response_time_percentile(0.95) > max_p95:
        environment.process_exit_code = 1
