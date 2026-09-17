from django.shortcuts import get_object_or_404

from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import filters, generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
    IsAdminUser,
)
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Avg, Q, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Category, Project, ProjectImage, Tag
from .permissions import (
    IsAdminOrReadOnly,
    IsOwnerOrReadOnly,
    IsOwnerOrAdminOrReadOnly,
)
from .serializers import (
    CategorySerializer,
    ProjectDetailSerializer,
    ProjectImageSerializer,
    ProjectListSerializer,
    ProjectWriteSerializer,
    TagSerializer,
)


class CategoryListCreateView(generics.ListCreateAPIView):
    

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
   

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class TagListCreateView(generics.ListCreateAPIView):
    

    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]
    pagination_class = None

class HomeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        today = timezone.localdate()

        base_queryset = (
            Project.objects
            .select_related("category", "owner")
            .prefetch_related("tags", "images", "ratings")
        )

        running_projects = base_queryset.filter(
            is_cancelled=False,
            start_date__lte=today,
            end_date__gte=today,
        )

        highest_rated = (
            running_projects
            .annotate(
                calculated_average_rating=Avg("ratings__value")
            )
            .filter(
                calculated_average_rating__isnull=False
            )
            .order_by(
                "-calculated_average_rating",
                "-created_at",
            )[:5]
        )

        latest = (
            running_projects
            .order_by("-created_at")[:5]
        )

        featured = (
            running_projects
            .filter(is_featured=True)
            .order_by("-created_at")[:5]
        )

        categories = Category.objects.all().order_by("name")

        return Response(
            {
                "highest_rated": ProjectListSerializer(
                    highest_rated,
                    many=True,
                    context={"request": request},
                ).data,

                "latest": ProjectListSerializer(
                    latest,
                    many=True,
                    context={"request": request},
                ).data,

                "featured": ProjectListSerializer(
                    featured,
                    many=True,
                    context={"request": request},
                ).data,

                "categories": CategorySerializer(
                    categories,
                    many=True,
                ).data,
            }
        )

class ProjectFeatureToggleView(APIView):

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        project = get_object_or_404(
            Project,
            pk=pk,
        )

        project.is_featured = not project.is_featured

        project.save(
            update_fields=[
                "is_featured",
                "updated_at",
            ]
        )

        return Response(
            {
                "detail": (
                    "Project featured successfully."
                    if project.is_featured
                    else "Project unfeatured successfully."
                ),
                "is_featured": project.is_featured,
            },
            status=status.HTTP_200_OK,
        )

    
class ProjectListCreateView(generics.ListCreateAPIView):
   

    queryset = Project.objects.select_related(
        "category",
        "owner",
    ).prefetch_related(
        "tags",
        "images",
    )

    permission_classes = [IsAuthenticated]

    filter_backends = [
    DjangoFilterBackend,
    filters.SearchFilter,
    filters.OrderingFilter,
    ]

    filterset_fields = ["category"]
    search_fields = ["title"]
    ordering_fields = ["created_at", "target_amount"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]

        return super().get_permissions()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectWriteSerializer

        return ProjectListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        tag = self.request.query_params.get("tag")

        if tag:
            queryset = queryset.filter(tags__name__iexact=tag)

        return queryset.distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request

        return context


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    

    queryset = Project.objects.select_related(
        "category",
        "owner",
    ).prefetch_related(
        "tags",
        "images",
    )

    permission_classes = [IsOwnerOrAdminOrReadOnly]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ProjectWriteSerializer

        return ProjectDetailSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request

        return context


class SimilarProjectsView(generics.ListAPIView):

    serializer_class = ProjectListSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        project = get_object_or_404(
            Project,
            pk=self.kwargs["pk"],
        )

        today = timezone.localdate()

        project_tags = project.tags.all()

        return (
            Project.objects
            .select_related("category", "owner")
            .prefetch_related("tags", "images")
            .filter(
                is_cancelled=False,
                start_date__lte=today,
                end_date__gte=today,
            )
            .exclude(pk=project.pk)
            .filter(
                Q(category_id=project.category_id)
                | Q(tags__in=project_tags)
            )
            .annotate(
                shared_tag_count=Count(
                    "tags",
                    filter=Q(tags__in=project_tags),
                    distinct=True,
                )
            )
            .distinct()
            .order_by(
                "-shared_tag_count",
                "-created_at",
            )[:4]
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    
class MyProjectsView(generics.ListAPIView):
   

    serializer_class = ProjectListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(
            owner=self.request.user,
        ).select_related(
            "category",
        ).prefetch_related(
            "tags",
            "images",
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request

        return context


class ProjectCancelView(APIView):
    

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response(
                {
                    "detail": "Project not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if project.owner_id != request.user.id:
            return Response(
                {
                    "detail": "You do not have permission to cancel this project."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not project.can_be_cancelled():
            return Response(
                {
                    "detail": (
                        "This project can no longer be cancelled. Projects "
                        "can only be cancelled while total donations remain "
                        "below 25% of the target amount."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        project.cancel()

        return Response(
            {
                "detail": "Project has been cancelled successfully.",
                "status": project.status,
            },
            status=status.HTTP_200_OK,
        )


class ProjectImageListCreateView(generics.ListCreateAPIView):
   

    serializer_class = ProjectImageSerializer
    pagination_class = None

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]

        return [IsAuthenticated()]

    def get_queryset(self):
        return ProjectImage.objects.filter(
            project_id=self.kwargs["project_pk"],
        )

    def get_project(self):
        return get_object_or_404(
            Project,
            pk=self.kwargs["project_pk"],
        )

    def perform_create(self, serializer):
        project = self.get_project()

        if project.owner_id != self.request.user.id:
            raise PermissionDenied(
                "You do not have permission to add images to this project."
            )

        serializer.save(project=project)


class ProjectImageDeleteView(generics.DestroyAPIView):
    

    serializer_class = ProjectImageSerializer
    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "image_pk"

    def get_queryset(self):
        return ProjectImage.objects.filter(
            project_id=self.kwargs["project_pk"],
        )

    def perform_destroy(self, instance):
        if instance.project.owner_id != self.request.user.id:
            raise PermissionDenied(
                "You do not have permission to remove this image."
            )

        instance.delete()
