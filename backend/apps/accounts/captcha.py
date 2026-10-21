"""Small server-side CAPTCHA challenge used by sensitive account actions."""
import random
import secrets
from hmac import compare_digest

from django.core import signing
from django.core.cache import cache

SALT = "teamflow.account-captcha"
TTL_SECONDS = 300
KEY_PREFIX = "account-captcha:"


def issue():
    left = random.SystemRandom().randint(2, 19)
    right = random.SystemRandom().randint(2, 19)
    nonce = secrets.token_urlsafe(18)
    cache.set(f"{KEY_PREFIX}{nonce}", str(left + right), TTL_SECONDS)
    token = signing.dumps({"nonce": nonce}, salt=SALT, compress=True)
    return token, f"{left} + {right} = ?"


def verify(token, answer):
    try:
        payload = signing.loads(token, salt=SALT, max_age=TTL_SECONDS)
        nonce = payload["nonce"]
    except (TypeError, KeyError, signing.BadSignature, signing.SignatureExpired):
        return False
    expected = cache.get(f"{KEY_PREFIX}{nonce}")
    if expected is None or not compare_digest(str(expected), str(answer or "").strip()):
        return False
    cache.delete(f"{KEY_PREFIX}{nonce}")
    return True
