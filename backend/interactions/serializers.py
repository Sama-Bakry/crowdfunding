from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Comment, Donation, Rating, Report


User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
        ]


class DonationSerializer(serializers.ModelSerializer):
    donor = UserBasicSerializer(read_only=True)

    class Meta:
        model = Donation
        fields = [
            "id",
            "donor",
            "project",
            "amount",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "donor",
            "created_at",
        ]

    def validate_amount(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "Donation amount must be at least 1."
            )

        return value

    def validate_project(self, project):
        if not project.is_running:
            raise serializers.ValidationError(
                "Donations are only allowed for running campaigns."
            )

        return project


class CommentSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "user",
            "project",
            "parent",
            "content",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
            "updated_at",
        ]

    def validate_content(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Comment cannot be empty."
            )

        return value

    def validate(self, attrs):
        project = attrs.get("project")

        if project is None and self.instance:
            project = self.instance.project

        if project is None:
            raise serializers.ValidationError(
                {"project": "Project is required."}
            )

        if not project.is_running:
            raise serializers.ValidationError(
                "Comments can only be added while "
                "the campaign is running."
            )

        parent = attrs.get("parent")

        if parent is not None:

            if parent.project_id != project.id:
                raise serializers.ValidationError(
                    {
                        "parent": (
                            "Reply must belong to the "
                            "same project."
                        )
                    }
                )

            # Prevent replying to a reply.
            if parent.parent_id is not None:
                raise serializers.ValidationError(
                    {
                        "parent": (
                            "Replies can only be made "
                            "to top-level comments."
                        )
                    }
                )

        return attrs


class RatingSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = Rating
        fields = [
            "id",
            "user",
            "project",
            "value",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
            "updated_at",
        ]

    def validate_value(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )

        return value

    def validate_project(self, project):
        if not project.is_running:
            raise serializers.ValidationError(
                "Ratings are only allowed for running campaigns."
            )

        return project


class ReportSerializer(serializers.ModelSerializer):
    reporter = UserBasicSerializer(read_only=True)

    class Meta:
        model = Report
        fields = [
            "id",
            "reporter",
            "project",
            "comment",
            "reason",
            "report_type",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "reporter",
            "created_at",
        ]

    def validate_reason(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Report reason cannot be empty."
            )

        return value

    def validate(self, attrs):
        report_type = attrs.get("report_type")
        project = attrs.get("project")
        comment = attrs.get("comment")

        if report_type == "project":
            if project is None:
                raise serializers.ValidationError(
                    {
                        "project": (
                            "Project is required for a project report."
                        )
                    }
                )

            if comment is not None:
                raise serializers.ValidationError(
                    {
                        "comment": (
                            "Comment must be empty for a project report."
                        )
                    }
                )

        elif report_type == "comment":
            if comment is None:
                raise serializers.ValidationError(
                    {
                        "comment": (
                            "Comment is required for a comment report."
                        )
                    }
                )

            if project is not None:
                raise serializers.ValidationError(
                    {
                        "project": (
                            "Project must be empty for a comment report."
                        )
                    }
                )

        else:
            raise serializers.ValidationError(
                {
                    "report_type": (
                        "Report type must be 'project' or 'comment'."
                    )
                }
            )

        return attrs