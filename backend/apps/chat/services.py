from django.db.models import Case, Count, F, IntegerField, Max, Q, When

from apps.core.api_utils import user_brief

from .models import ChatMessage


CONVERSATION_LIMIT = 100


def conversation_summaries(user):
    """Return one latest message per partner without one unread query per row."""
    latest_by_partner = (
        ChatMessage.objects.filter(Q(author=user) | Q(recipient=user))
        .annotate(
            partner_id=Case(
                When(author_id=user.pk, then=F("recipient_id")),
                default=F("author_id"),
                output_field=IntegerField(),
            )
        )
        .values("partner_id")
        .annotate(last_id=Max("id"))
        .order_by("-last_id")[:CONVERSATION_LIMIT]
    )
    partner_ids = [row["partner_id"] for row in latest_by_partner]
    last_ids = [row["last_id"] for row in latest_by_partner]

    unread_by_author = dict(
        ChatMessage.objects.filter(recipient=user, is_read=False, author_id__in=partner_ids)
        .values("author_id")
        .annotate(total=Count("id"))
        .values_list("author_id", "total")
    )
    messages = (
        ChatMessage.objects.filter(id__in=last_ids)
        .select_related("author", "recipient")
        .order_by("-created_at", "-id")
    )
    summaries = []
    seen_partner_ids = set()
    for message in messages:
        partner = message.recipient if message.author_id == user.pk else message.author
        if partner.pk in seen_partner_ids:
            continue
        seen_partner_ids.add(partner.pk)
        summaries.append(
            {
                "partner": user_brief(partner),
                "last_message": message.text[:100],
                "last_at": message.created_at,
                "outgoing": message.author_id == user.pk,
                "unread_count": unread_by_author.get(partner.pk, 0),
            }
        )
    return summaries


MESSAGE_LIMIT = 200  # suhbatda oxirgi N ta xabar — uzun yozishma butunlay yuklanmasin


def messages_with_partner(user, partner, *, after=None):
    """Oxirgi xabarlar; pollingda faqat `after` ID dan yangilari. Javob eskidan yangiga.

    Faqat olingan xabarlargacha o'qildi belgilanadi; bo'sh polling bazaga yozmaydi.
    """
    messages = ChatMessage.objects.filter(Q(author=user, recipient=partner) | Q(author=partner, recipient=user))
    if after is not None:
        messages = messages.filter(id__gt=after)
    latest = list(messages.order_by("-id")[:MESSAGE_LIMIT])
    if latest:
        ChatMessage.objects.filter(author=partner, recipient=user, is_read=False,
                                   id__lte=latest[0].pk).update(is_read=True)
    return latest[::-1]


def send_message(author, partner, text):
    return ChatMessage.objects.create(author=author, recipient=partner, text=text)
