from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("core", "0001_initial")]

    operations = [
        migrations.AddIndex(
            model_name="comment",
            index=models.Index(fields=["target_type", "target_id", "created_at"], name="comment_target_feed_idx"),
        ),
        migrations.RemoveIndex(model_name="comment", name="core_commen_target__5bd5fc_idx"),
        migrations.AddIndex(
            model_name="activitylog",
            index=models.Index(fields=["-created_at", "-id"], name="activity_feed_idx"),
        ),
        migrations.AddIndex(
            model_name="activitylog",
            index=models.Index(fields=["target_type", "target_id"], name="activity_target_idx"),
        ),
        migrations.RemoveIndex(model_name="activitylog", name="core_activi_target__62004b_idx"),
    ]
