# -*- coding: utf-8 -*-
# Generated by Django 1.11.23 on 2019-12-05 11:14
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('indigo_api', '0122_annotation_selectors'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='task',
            name='anchor_id',
        ),
    ]
