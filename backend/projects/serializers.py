from django.utils import timezone
from django.db.models import Avg
from rest_framework import serializers

from .models import Category, Project, ProjectImage, Tag


def _can_be_cancelled_by_request(obj, context):
   
    request = context.get("request")

    if request is None or not request.user.is_authenticated:
        return False

    if request.user != obj.owner:
        return False

    return obj.can_be_cancelled()


class CategorySerializer(serializers.ModelSerializer):


    class Meta:
        model = Category

        fields = [
            "id",
            "name",
            "slug",
        ]

        extra_kwargs = {
            "slug": {
                "required": False,
            },
        }


class TagSerializer(serializers.ModelSerializer):
    

    class Meta:
        model = Tag

        fields = [
            "id",
            "name",
            "slug",
        ]

        extra_kwargs = {
            "slug": {
                "required": False,
            },
        }


class ProjectImageSerializer(serializers.ModelSerializer):
  
    image = serializers.FileField()
    class Meta:
        model = ProjectImage

        fields = [
            "id",
            "image",
            "uploaded_at",
        ]

        read_only_fields = [
            "id",
            "uploaded_at",
        ]


class ProjectListSerializer(serializers.ModelSerializer):
    
    category = CategorySerializer(
        read_only=True,
    )

    cover_image = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    status = serializers.CharField(
        read_only=True,
    )

    funding_progress = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True,
    )

    is_cancelled = serializers.BooleanField(
        read_only=True,
    )

    can_be_cancelled = serializers.SerializerMethodField()

    class Meta:
        model = Project

        fields = [
           "id",
           "title",
           "category",
           "target_amount",
           "funding_progress",
           "average_rating",
           "status",
           "is_cancelled",
           "is_featured",
           "can_be_cancelled",
           "start_date",
           "end_date",
           "cover_image",
           "details",
           
   ]

    def get_can_be_cancelled(self, obj):
        return obj.can_be_cancelled()
    def get_average_rating(self, obj):
        return obj.average_rating
    def get_cover_image(self, obj):
        first_image = obj.images.first()

        if not first_image:
            return None

        request = self.context.get("request")

        if request is not None:
            return request.build_absolute_uri(first_image.image.url)

        return first_image.image.url


class ProjectDetailSerializer(serializers.ModelSerializer):
  
    average_rating = serializers.SerializerMethodField()
    owner = serializers.SerializerMethodField()

    is_owner = serializers.SerializerMethodField()

    category = CategorySerializer(
        read_only=True,
    )

    tags = TagSerializer(
        many=True,
        read_only=True,
    )

    images = ProjectImageSerializer(
        many=True,
        read_only=True,
    )

    status = serializers.CharField(
        read_only=True,
    )

    total_donations = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    funding_progress = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True,
    )

    can_be_cancelled = serializers.SerializerMethodField()

    class Meta:
        model = Project

        fields = [
            "id",
            "owner",
            "is_owner",
            "title",
            "details",
            "category",
            "tags",
            "images",
            "target_amount",
            "total_donations",
            "funding_progress",
            "average_rating",
            "start_date",
            "end_date",
            "status",
            "is_cancelled",
            "can_be_cancelled",
            "created_at",
            "updated_at",
        ]

    def get_owner(self, obj):
        return {
            "id": obj.owner.id,
            "first_name": obj.owner.first_name,
            "last_name": obj.owner.last_name,
        }
    
    def get_average_rating(self, obj):
     average = obj.ratings.aggregate(
        average=Avg("value")
    )["average"]

     if average is None:
        return 0

     return round(float(average), 2)

    def get_is_owner(self, obj):
        request = self.context.get("request")

        return bool(
            request
            and request.user.is_authenticated
            and request.user == obj.owner
        )

    def get_can_be_cancelled(self, obj):
        return obj.can_be_cancelled()

class ProjectWriteSerializer(serializers.ModelSerializer):
    

    tags = serializers.ListField(
        child=serializers.CharField(
            max_length=50,
        ),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Project

        fields = [
            "id",
            "title",
            "details",
            "category",
            "tags",
            "target_amount",
            "start_date",
            "end_date",
        ]

    def validate_title(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Title cannot be empty."
            )

        return value

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Target amount must be greater than zero."
            )

        return value

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date",
            getattr(self.instance, "start_date", None),
        )

        end_date = attrs.get(
            "end_date",
            getattr(self.instance, "end_date", None),
        )

        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError(
                {
                    "end_date": "End date must be after the start date."
                }
            )

        if self.instance is None and start_date and start_date < timezone.localdate():
            raise serializers.ValidationError(
                {
                    "start_date": "Start date cannot be in the past."
                }
            )

        return attrs

    def _set_tags(self, project, tag_names):
        tags = []

        for raw_name in tag_names:
            name = raw_name.strip()

            if not name:
                continue

            existing_tag = Tag.objects.filter(name__iexact=name).first()

            if existing_tag:
                tag = existing_tag
            else:
                tag = Tag.objects.create(name=name)

            tags.append(tag)

        project.tags.set(tags)

    def create(self, validated_data):
        tag_names = validated_data.pop("tags", [])

        project = Project.objects.create(
            owner=self.context["request"].user,
            **validated_data,
        )

        self._set_tags(project, tag_names)

        return project

    def update(self, instance, validated_data):
        tag_names = validated_data.pop("tags", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()

        if tag_names is not None:
            self._set_tags(instance, tag_names)

        return instance
