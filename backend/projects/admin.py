from django.contrib import admin

from .models import Category, Project, ProjectImage, Tag


class ProjectImageInline(admin.TabularInline):
    model = ProjectImage
    extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ["name"]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ["name"]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "owner",
        "category",
        "target_amount",
        "status",
        "is_featured",
        "is_cancelled",
        "created_at",
    ]

    list_filter = ["category", "is_featured", "is_cancelled"]
    list_editable = ["is_featured"]
    search_fields = ["title", "owner__email"]
    filter_horizontal = ["tags"]
    inlines = [ProjectImageInline]
