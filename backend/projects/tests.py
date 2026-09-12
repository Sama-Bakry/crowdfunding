from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from .models import Category, Project, Tag


class ProjectModelTests(TestCase):
    
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="StrongPass123",
            first_name="Owner",
            last_name="User",
            phone_number="01012345678",
            is_active=True,
            is_email_verified=True,
        )

        self.category = Category.objects.create(name="Technology")

        self.project = Project.objects.create(
            owner=self.owner,
            title="Solar Water Pump",
            details="A solar powered water pump for rural farms.",
            category=self.category,
            target_amount=Decimal("100000.00"),
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=30),
        )

    def test_status_is_running_within_date_range(self):
        self.assertEqual(self.project.status, "running")
        self.assertTrue(self.project.is_running)

    def test_status_is_upcoming_before_start_date(self):
        self.project.start_date = timezone.localdate() + timedelta(days=5)
        self.project.end_date = timezone.localdate() + timedelta(days=35)
        self.project.save()

        self.assertEqual(self.project.status, "upcoming")

    def test_status_is_ended_after_end_date(self):
        self.project.start_date = timezone.localdate() - timedelta(days=30)
        self.project.end_date = timezone.localdate() - timedelta(days=1)
        self.project.save()

        self.assertEqual(self.project.status, "ended")

    def test_total_donations_defaults_to_zero_without_donations_app(self):
        self.assertEqual(self.project.total_donations, Decimal("0.00"))

    def test_can_be_cancelled_with_no_donations(self):
        self.assertTrue(self.project.can_be_cancelled())

    def test_cannot_be_cancelled_once_already_cancelled(self):
        self.project.cancel()

        self.assertTrue(self.project.is_cancelled)
        self.assertEqual(self.project.status, "cancelled")
        self.assertFalse(self.project.can_be_cancelled())

    def test_cannot_be_cancelled_after_end_date(self):
        self.project.start_date = timezone.localdate() - timedelta(days=30)
        self.project.end_date = timezone.localdate() - timedelta(days=1)
        self.project.save()

        self.assertFalse(self.project.can_be_cancelled())

    def test_cancel_raises_when_not_allowed(self):
        self.project.cancel()

        with self.assertRaises(ValueError):
            self.project.cancel()


class ProjectAPITests(TestCase):
   

    def setUp(self):
        self.client = APIClient()

        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="StrongPass123",
            first_name="Owner",
            last_name="User",
            phone_number="01012345678",
            is_active=True,
            is_email_verified=True,
        )

        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="StrongPass123",
            first_name="Other",
            last_name="User",
            phone_number="01098765432",
            is_active=True,
            is_email_verified=True,
        )

        self.category = Category.objects.create(name="Technology")

        self.project = Project.objects.create(
            owner=self.owner,
            title="Solar Water Pump",
            details="A solar powered water pump for rural farms.",
            category=self.category,
            target_amount=Decimal("100000.00"),
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=30),
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_anyone_can_list_projects(self):
        response = self.client.get(reverse("projects:project-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_authenticated_user_can_create_project_with_tags(self):
        self.authenticate(self.owner)

        payload = {
            "title": "School Library Fund",
            "details": "Building a small community library.",
            "category": self.category.id,
            "tags": ["books", "education"],
            "target_amount": "50000.00",
            "start_date": str(timezone.localdate()),
            "end_date": str(timezone.localdate() + timedelta(days=45)),
        }

        response = self.client.post(
            reverse("projects:project-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        project = Project.objects.get(pk=response.data["id"])

        self.assertEqual(project.owner, self.owner)
        self.assertEqual(
            set(project.tags.values_list("name", flat=True)),
            {"books", "education"},
        )

    def test_anonymous_user_cannot_create_project(self):
        payload = {
            "title": "Anonymous Project",
            "details": "Should not be allowed.",
            "category": self.category.id,
            "target_amount": "10000.00",
            "start_date": str(timezone.localdate()),
            "end_date": str(timezone.localdate() + timedelta(days=10)),
        }

        response = self.client.post(
            reverse("projects:project-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_end_date_must_be_after_start_date(self):
        self.authenticate(self.owner)

        payload = {
            "title": "Bad Dates Project",
            "details": "End date is before start date.",
            "category": self.category.id,
            "target_amount": "10000.00",
            "start_date": str(timezone.localdate()),
            "end_date": str(timezone.localdate() - timedelta(days=1)),
        }

        response = self.client.post(
            reverse("projects:project-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end_date", response.data)

    def test_owner_can_update_their_project(self):
        self.authenticate(self.owner)

        response = self.client.patch(
            reverse("projects:project-detail", args=[self.project.id]),
            {"title": "Updated Title"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.project.refresh_from_db()

        self.assertEqual(self.project.title, "Updated Title")

    def test_non_owner_cannot_update_project(self):
        self.authenticate(self.other_user)

        response = self.client.patch(
            reverse("projects:project-detail", args=[self.project.id]),
            {"title": "Hacked Title"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_cancel_project_with_no_donations(self):
        self.authenticate(self.owner)

        response = self.client.post(
            reverse("projects:project-cancel", args=[self.project.id]),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.project.refresh_from_db()

        self.assertTrue(self.project.is_cancelled)

    def test_non_owner_cannot_cancel_project(self):
        self.authenticate(self.other_user)

        response = self.client.post(
            reverse("projects:project-cancel", args=[self.project.id]),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.project.refresh_from_db()

        self.assertFalse(self.project.is_cancelled)

    def test_cancelling_twice_returns_bad_request(self):
        self.authenticate(self.owner)

        self.client.post(
            reverse("projects:project-cancel", args=[self.project.id]),
        )

        response = self.client.post(
            reverse("projects:project-cancel", args=[self.project.id]),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_staff_user_cannot_create_category(self):
        self.authenticate(self.owner)

        response = self.client.post(
            reverse("projects:category-list"),
            {"name": "Health"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_user_can_create_category(self):
        self.owner.is_staff = True
        self.owner.save(update_fields=["is_staff"])

        self.authenticate(self.owner)

        response = self.client.post(
            reverse("projects:category-list"),
            {"name": "Health"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_my_projects_only_returns_own_projects(self):
        Project.objects.create(
            owner=self.other_user,
            title="Someone Else's Project",
            details="Not mine.",
            category=self.category,
            target_amount=Decimal("20000.00"),
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=10),
        )

        self.authenticate(self.owner)

        response = self.client.get(reverse("projects:my-projects"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["title"],
            "Solar Water Pump",
        )
