from django.urls import path

from .views import (
    CategoryDetailView,
    CategoryListCreateView,
    MyProjectsView,
    ProjectCancelView,
    ProjectDetailView,
    ProjectImageDeleteView,
    ProjectImageListCreateView,
    ProjectListCreateView,
    TagListCreateView,
)


app_name = "projects"


urlpatterns = [
    path(
        "categories/",
        CategoryListCreateView.as_view(),
        name="category-list",
    ),
    path(
        "categories/<int:pk>/",
        CategoryDetailView.as_view(),
        name="category-detail",
    ),
    path(
        "tags/",
        TagListCreateView.as_view(),
        name="tag-list",
    ),
    path(
        "my-projects/",
        MyProjectsView.as_view(),
        name="my-projects",
    ),
    path(
        "",
        ProjectListCreateView.as_view(),
        name="project-list",
    ),
    path(
        "<int:pk>/",
        ProjectDetailView.as_view(),
        name="project-detail",
    ),
    path(
        "<int:pk>/cancel/",
        ProjectCancelView.as_view(),
        name="project-cancel",
    ),
    path(
        "<int:project_pk>/images/",
        ProjectImageListCreateView.as_view(),
        name="project-image-list",
    ),
    path(
        "<int:project_pk>/images/<int:image_pk>/",
        ProjectImageDeleteView.as_view(),
        name="project-image-detail",
    ),
]
