from django.urls import path

from .views import (
    CommentDetailView,
    CommentListCreateView,
    DonationDetailView,
    DonationListCreateView,
    ProjectAverageRatingView,
    ProjectDonationListView,
    RatingDetailView,
    RatingListCreateView,
    ReportDetailView,
    ReportListCreateView,
    AdminReportListView,
)


urlpatterns = [
    # Donations
    path(
        "donations/",
        DonationListCreateView.as_view(),
        name="donation-list-create",
    ),
    path(
        "donations/<int:pk>/",
        DonationDetailView.as_view(),
        name="donation-detail",
    ),
    path(
        "projects/<int:project_pk>/donations/",
        ProjectDonationListView.as_view(),
        name="project-donations",
    ),

    # Comments
    path(
        "projects/<int:project_pk>/comments/",
        CommentListCreateView.as_view(),
        name="comment-list-create",
    ),
    path(
        "comments/<int:pk>/",
        CommentDetailView.as_view(),
        name="comment-detail",
    ),

    # Ratings
    path(
        "projects/<int:project_pk>/ratings/",
        RatingListCreateView.as_view(),
        name="rating-list-create",
    ),
    path(
        "ratings/<int:pk>/",
        RatingDetailView.as_view(),
        name="rating-detail",
    ),
    path(
        "projects/<int:project_pk>/ratings/average/",
        ProjectAverageRatingView.as_view(),
        name="project-average-rating",
    ),

    # Reports
    path(
        "reports/",
        ReportListCreateView.as_view(),
        name="report-list-create",
    ),
    path(
        "reports/<int:pk>/",
        ReportDetailView.as_view(),
        name="report-detail",
    ),
    path(
        "admin/reports/",
        AdminReportListView.as_view(),
        name="admin-report-list",
    ),
]