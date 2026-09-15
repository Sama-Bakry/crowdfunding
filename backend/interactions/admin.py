from django.contrib import admin

from .models import Comment, Donation, Rating, Report


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "donor",
        "project",
        "amount",
        "created_at",
    )
    list_filter = (
        "created_at",
    )
    search_fields = (
        "donor__email",
        "project__title",
    )
    readonly_fields = (
        "created_at",
    )


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "project",
        "created_at",
        "updated_at",
    )
    list_filter = (
        "created_at",
    )
    search_fields = (
        "user__email",
        "project__title",
        "content",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "project",
        "value",
        "created_at",
        "updated_at",
    )
    list_filter = (
        "value",
        "created_at",
    )
    search_fields = (
        "user__email",
        "project__title",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "reporter",
        "report_type",
        "project",
        "comment",
        "created_at",
    )
    list_filter = (
        "report_type",
        "created_at",
    )
    search_fields = (
        "reporter__email",
        "reason",
        "project__title",
    )
    readonly_fields = (
        "created_at",
    )