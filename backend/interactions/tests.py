from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from projects.models import Category, Project

from .models import Comment, Donation, Rating, Report


User = get_user_model()


class InteractionTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="user1@test.com",
            password="TestPassword123",
            first_name="User",
            last_name="One",
            phone_number="01011111111",
        )

        self.other_user = User.objects.create_user(
            email="user2@test.com",
            password="TestPassword123",
            first_name="User",
            last_name="Two",
            phone_number="01022222222",
        )

        self.category = Category.objects.create(
            name="Test Category",
            slug="test-category",
        )

        today = timezone.localdate()

        self.running_project = Project.objects.create(
            owner=self.user,
            title="Running Project",
            details="Test project",
            category=self.category,
            target_amount=Decimal("10000.00"),
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=10),
        )

        self.ended_project = Project.objects.create(
            owner=self.user,
            title="Ended Project",
            details="Ended test project",
            category=self.category,
            target_amount=Decimal("10000.00"),
            start_date=today - timedelta(days=10),
            end_date=today - timedelta(days=1),
        )

    # =====================================================
    # DONATIONS
    # =====================================================

    def test_authenticated_user_can_create_donation(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/interactions/donations/",
            {
                "project": self.running_project.id,
                "amount": "100.00",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            Donation.objects.count(),
            1,
        )

        donation = Donation.objects.first()

        self.assertEqual(
            donation.donor,
            self.user,
        )

        self.assertEqual(
            donation.amount,
            Decimal("100.00"),
        )

    def test_donation_below_one_is_rejected(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/interactions/donations/",
            {
                "project": self.running_project.id,
                "amount": "0.50",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            Donation.objects.count(),
            0,
        )

    def test_donation_to_ended_project_is_rejected(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/interactions/donations/",
            {
                "project": self.ended_project.id,
                "amount": "100.00",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            Donation.objects.count(),
            0,
        )

    def test_donation_history_contains_only_current_user_donations(self):
        Donation.objects.create(
            donor=self.user,
            project=self.running_project,
            amount=Decimal("100.00"),
        )

        Donation.objects.create(
            donor=self.other_user,
            project=self.running_project,
            amount=Decimal("200.00"),
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            "/api/interactions/donations/"
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        data = response.data

        if isinstance(data, dict):
            data = data["results"]

        self.assertEqual(
            len(data),
            1,
        )

        self.assertEqual(
            Decimal(str(data[0]["amount"])),
            Decimal("100.00"),
        )

    # =====================================================
    # COMMENTS
    # =====================================================

    def test_authenticated_user_can_create_comment(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/interactions/projects/"
            f"{self.running_project.id}/comments/",
            {
                "content": "This is a test comment.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            Comment.objects.filter(
                user=self.user,
                project=self.running_project,
            ).exists()
        )

    def test_empty_comment_is_rejected(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/interactions/projects/"
            f"{self.running_project.id}/comments/",
            {
                "content": "   ",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_user_cannot_edit_another_users_comment(self):
        comment = Comment.objects.create(
            user=self.other_user,
            project=self.running_project,
            content="Original comment",
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            f"/api/interactions/comments/{comment.id}/",
            {
                "content": "Trying to edit another user comment",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_comment_cannot_be_edited_after_project_ends(self):
        comment = Comment.objects.create(
            user=self.user,
            project=self.ended_project,
            content="Old comment",
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            f"/api/interactions/comments/{comment.id}/",
            {
                "content": "Trying to edit ended project comment",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_authenticated_user_can_reply_to_comment(self):
        comment = Comment.objects.create(
            user=self.other_user,
            project=self.running_project,
            content="Original comment",
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/interactions/projects/"
            f"{self.running_project.id}/comments/",
            {
                "content": "This is a reply.",
                "parent": comment.id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        reply = Comment.objects.get(
            content="This is a reply.",
        )

        self.assertEqual(
            reply.user,
            self.user,
        )

        self.assertEqual(
            reply.project,
            self.running_project,
        )

        self.assertEqual(
            reply.parent,
            comment,
        )

    def test_reply_to_comment_from_another_project_is_rejected(self):
        other_project = Project.objects.create(
            owner=self.other_user,
            title="Other Project",
            details="Another test project",
            category=self.category,
            target_amount=Decimal("5000.00"),
            start_date=timezone.localdate() - timedelta(days=1),
            end_date=timezone.localdate() + timedelta(days=10),
        )

        comment = Comment.objects.create(
            user=self.other_user,
            project=other_project,
            content="Comment from another project",
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/interactions/projects/"
            f"{self.running_project.id}/comments/",
            {
                "content": "Invalid reply.",
                "parent": comment.id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_reply_to_reply_is_rejected(self):
        comment = Comment.objects.create(
            user=self.other_user,
            project=self.running_project,
            content="Top-level comment",
        )

        reply = Comment.objects.create(
            user=self.user,
            project=self.running_project,
            parent=comment,
            content="First reply",
        )

        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(
            f"/api/interactions/projects/"
            f"{self.running_project.id}/comments/",
            {
                "content": "Reply to a reply.",
                "parent": reply.id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # =====================================================
    # RATINGS
    # =====================================================

    def test_user_can_rate_running_project(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/interactions/projects/"
            f"{self.running_project.id}/ratings/",
            {
                "value": 5,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            Rating.objects.filter(
                user=self.user,
                project=self.running_project,
                value=5,
            ).exists()
        )

    def test_rating_outside_range_is_rejected(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/interactions/projects/"
            f"{self.running_project.id}/ratings/",
            {
                "value": 6,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_user_can_update_existing_rating(self):
        Rating.objects.create(
            user=self.user,
            project=self.running_project,
            value=3,
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/interactions/projects/"
            f"{self.running_project.id}/ratings/",
            {
                "value": 5,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        rating = Rating.objects.get(
            user=self.user,
            project=self.running_project,
        )

        self.assertEqual(
            rating.value,
            5,
        )

    def test_rating_cannot_be_updated_after_project_ends(self):
        Rating.objects.create(
            user=self.user,
            project=self.ended_project,
            value=3,
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            f"/api/interactions/projects/"
            f"{self.ended_project.id}/ratings/",
            {
                "value": 5,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    # =====================================================
    # REPORTS
    # =====================================================

    def test_user_can_report_project(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/interactions/reports/",
            {
                "project": self.running_project.id,
                "reason": "Inappropriate project",
                "report_type": "project",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            Report.objects.filter(
                reporter=self.user,
                project=self.running_project,
                report_type="project",
            ).exists()
        )

    def test_user_can_report_comment(self):
        comment = Comment.objects.create(
            user=self.other_user,
            project=self.running_project,
            content="Comment to report",
        )

        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/interactions/reports/",
            {
                "comment": comment.id,
                "reason": "Inappropriate comment",
                "report_type": "comment",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            Report.objects.filter(
                reporter=self.user,
                comment=comment,
                report_type="comment",
            ).exists()
        )

    def test_invalid_project_report_is_rejected(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/interactions/reports/",
            {
                "reason": "Invalid report",
                "report_type": "project",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
