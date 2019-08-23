# -*- coding: utf-8 -*-
# Generated by Django 1.11.20 on 2019-05-29 10:30
from django.db import migrations
from django.contrib.auth.models import User
from reversion import revisions as reversion

from indigo_api.data_migrations import FixSignificantWhitespace


def forwards(apps, schema_editor):
    from indigo_api.models import Document

    db_alias = schema_editor.connection.alias
    user = User.objects.filter(pk=1).first()
    migration = FixSignificantWhitespace()

    for doc in Document.objects.using(db_alias).filter(deleted=False):
        if migration.migrate_document(doc):
            if user:
                doc.updated_by_user = user

            with reversion.create_revision():
                if user:
                    reversion.set_user(user)
                reversion.set_comment("Remove erroneous meaningful whitespace")
                doc.save()


class Migration(migrations.Migration):

    dependencies = [
        ('indigo_api', '0099_populate_task_closed_by'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
