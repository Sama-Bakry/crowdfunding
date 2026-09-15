from django.db import transaction
from django.db.models import Avg
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Comment, Donation, Rating, Report
from .serializers import (
    CommentSerializer,
    DonationSerializer,
    RatingSerializer,
    ReportSerializer,
)


class DonationListCreateView(generics.ListCreateAPIView):
    serializer_class = DonationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Donation.objects
            .filter(donor=self.request.user)
            .select_related("donor", "project")
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        project = serializer.validated_data["project"]

        # Lock the project row to avoid inconsistent donation totals
        # if multiple donations happen at the same time.
        project = (
            project.__class__.objects
            .select_for_update()
            .get(pk=project.pk)
        )

        if not project.is_running:
            return Response(
                {
                    "detail": (
                        "Donations are only allowed for running campaigns."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        donation = Donation.objects.create(
            donor=request.user,
            project=project,
            amount=serializer.validated_data["amount"],
        )

        output_serializer = self.get_serializer(donation)

        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
        )


class DonationDetailView(generics.RetrieveAPIView):
    serializer_class = DonationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Donation.objects
            .filter(donor=self.request.user)
            .select_related("donor", "project")
        )


class ProjectDonationListView(generics.ListAPIView):
    serializer_class = DonationSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return (
            Donation.objects
            .filter(project_id=self.kwargs["project_pk"])
            .select_related("donor", "project")
        )


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]

        return [permissions.AllowAny()]

    def get_queryset(self):
        return (
            Comment.objects
            .filter(project_id=self.kwargs["project_pk"])
            .select_related("user", "project")
        )

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # The project is determined by the URL.
        data["project"] = self.kwargs["project_pk"]

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        comment = serializer.save(
            user=request.user
        )

        output_serializer = self.get_serializer(comment)

        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED,
        )
class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommentSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [permissions.IsAuthenticated()]

        return [permissions.AllowAny()]

    def get_queryset(self):
        return (
            Comment.objects
            .select_related("user", "project")
        )

    def update(self, request, *args, **kwargs):
        comment = self.get_object()

        if comment.user_id != request.user.id:
            return Response(
                {
                    "detail": (
                        "You can only edit your own comments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not comment.project.is_running:
            return Response(
                {
                    "detail": (
                        "Comments can only be edited while "
                        "the campaign is running."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().update(
            request,
            *args,
            **kwargs,
        )

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()

        if comment.user_id != request.user.id:
            return Response(
                {
                    "detail": (
                        "You can only delete your own comments."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(
            request,
            *args,
            **kwargs,
        )


class RatingListCreateView(generics.ListCreateAPIView):
    serializer_class = RatingSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]

        return [permissions.AllowAny()]

    def get_queryset(self):
        return (
            Rating.objects
            .filter(project_id=self.kwargs["project_pk"])
            .select_related("user", "project")
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        project_id = self.kwargs["project_pk"]

        existing_rating = Rating.objects.filter(
            user=request.user,
            project_id=project_id,
        ).select_related("project").first()

        if existing_rating:

            if not existing_rating.project.is_running:
                return Response(
                    {
                        "detail": (
                            "Ratings can only be updated while "
                            "the campaign is running."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            data = request.data.copy()

            serializer = self.get_serializer(
                existing_rating,
                data=data,
                partial=True,
            )

        else:
            data = request.data.copy()

            # The project comes from the URL.
            data["project"] = project_id

            serializer = self.get_serializer(
                data=data
            )

        serializer.is_valid(
            raise_exception=True
        )

        rating = serializer.save(
            user=request.user
        )

        output_serializer = self.get_serializer(
            rating
        )

        return Response(
            output_serializer.data,
            status=(
                status.HTTP_200_OK
                if existing_rating
                else status.HTTP_201_CREATED
            ),
        )

class RatingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Rating.objects
            .filter(user=self.request.user)
            .select_related("user", "project")
        )

    def update(self, request, *args, **kwargs):
        rating = self.get_object()

        if not rating.project.is_running:
            return Response(
                {
                    "detail": (
                        "Ratings can only be updated while "
                        "the campaign is running."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().update(
            request,
            *args,
            **kwargs,
        )


class ProjectAverageRatingView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, project_pk):
        result = Rating.objects.filter(
            project_id=project_pk
        ).aggregate(
            average_rating=Avg("value")
        )

        average_rating = result["average_rating"]

        if average_rating is None:
            average_rating = 0

        return Response(
            {
                "project": project_pk,
                "average_rating": round(float(average_rating), 2),
            }
        )


class ReportListCreateView(generics.ListCreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Report.objects
            .filter(reporter=self.request.user)
            .select_related(
                "reporter",
                "project",
                "comment",
            )
        )

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class ReportDetailView(generics.RetrieveAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Report.objects
            .filter(reporter=self.request.user)
            .select_related(
                "reporter",
                "project",
                "comment",
            )
        )