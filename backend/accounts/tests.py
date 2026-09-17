from datetime import timedelta

from django.core import mail
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient

from .models import User
from .tokens import (
    generate_activation_token,
    generate_password_reset_token,
)


class AccountTestMixin:
    def create_user(
        self,
        email="user@example.com",
        phone_number="01012345678",
        password="StrongPass123",
        is_active=True,
        is_email_verified=True,
        **extra_fields,
    ):
        return User.objects.create_user(
            email=email,
            phone_number=phone_number,
            password=password,
            first_name="Test",
            last_name="User",
            is_active=is_active,
            is_email_verified=is_email_verified,
            **extra_fields,
        )


class UserModelTests(AccountTestMixin, TestCase):

    def test_user_can_be_created_with_email(self):
        user = self.create_user()

        self.assertEqual(user.email, "user@example.com")
        self.assertTrue(user.check_password("StrongPass123"))

    def test_password_is_hashed(self):
        user = self.create_user()

        self.assertNotEqual(
            user.password,
            "StrongPass123",
        )

        self.assertTrue(
            user.check_password("StrongPass123")
        )

    def test_email_is_unique(self):
        self.create_user()

        with self.assertRaises(Exception):
            self.create_user()

    def test_phone_number_is_unique(self):
        self.create_user()

        with self.assertRaises(Exception):
            self.create_user(
                email="another@example.com",
                phone_number="01012345678",
            )


class RegistrationAPITests(AccountTestMixin, TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_user_can_register(self):
        payload = {
            "email": "newuser@example.com",
            "phone_number": "01011111111",
            "first_name": "New",
            "last_name": "User",
            "password": "StrongPass123",
            "confirm_password": "StrongPass123",
        }

        response = self.client.post(
            reverse("accounts:register"),
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        user = User.objects.get(
            email="newuser@example.com"
        )

        self.assertFalse(user.is_active)
        self.assertFalse(user.is_email_verified)
        self.assertTrue(user.check_password("StrongPass123"))

    def test_registration_sends_activation_email(self):
        payload = {
            "email": "activation@example.com",
            "phone_number": "01022222222",
            "first_name": "Activation",
            "last_name": "Test",
            "password": "StrongPass123",
            "confirm_password": "StrongPass123",
        }

        response = self.client.post(
            reverse("accounts:register"),
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            len(mail.outbox),
            1,
        )

        self.assertIn(
            "Activate",
            mail.outbox[0].subject,
        )

    def test_duplicate_email_is_rejected(self):
        self.create_user()

        payload = {
            "email": "user@example.com",
            "phone_number": "01033333333",
            "first_name": "Another",
            "last_name": "User",
            "password": "StrongPass123",
            "confirm_password": "StrongPass123",
        }

        response = self.client.post(
            reverse("accounts:register"),
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_duplicate_phone_number_is_rejected(self):
        self.create_user()

        payload = {
            "email": "another@example.com",
            "phone_number": "01012345678",
            "first_name": "Another",
            "last_name": "User",
            "password": "StrongPass123",
            "confirm_password": "StrongPass123",
        }

        response = self.client.post(
            reverse("accounts:register"),
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_password_confirmation_is_required(self):
        payload = {
            "email": "password@example.com",
            "phone_number": "01044444444",
            "first_name": "Password",
            "last_name": "Test",
            "password": "StrongPass123",
            "confirm_password": "DifferentPass123",
        }

        response = self.client.post(
            reverse("accounts:register"),
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )


class ActivationAPITests(AccountTestMixin, TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = self.create_user(
            email="activation@example.com",
            phone_number="01055555555",
            is_active=False,
            is_email_verified=False,
        )

    def test_valid_activation_activates_user(self):
        token = generate_activation_token(self.user)

        response = self.client.get(
            reverse(
                "accounts:activate",
                args=[token],
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.user.refresh_from_db()

        self.assertTrue(
            self.user.is_active
        )

        self.assertTrue(
            self.user.is_email_verified
        )

    def test_activation_token_cannot_be_used_for_invalid_token(self):
        response = self.client.get(
            reverse(
                "accounts:activate",
                args=["invalid-token"],
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_already_activated_account_is_handled(self):
        self.user.is_active = True
        self.user.is_email_verified = True
        self.user.save(
            update_fields=[
                "is_active",
                "is_email_verified",
            ]
        )

        token = generate_activation_token(
            self.user
        )

        response = self.client.get(
            reverse(
                "accounts:activate",
                args=[token],
            )
        )

        self.assertIn(
            response.status_code,
            [
                status.HTTP_200_OK,
                status.HTTP_400_BAD_REQUEST,
            ],
        )


class LoginAPITests(AccountTestMixin, TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = self.create_user(
            email="login@example.com",
            phone_number="01066666666",
        )

    def test_user_can_login(self):
        response = self.client.post(
            reverse("accounts:login"),
            {
                "email": "login@example.com",
                "password": "StrongPass123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "access",
            response.data,
        )

        self.assertIn(
            "refresh",
            response.data,
        )

    def test_invalid_password_is_rejected(self):
        response = self.client.post(
            reverse("accounts:login"),
            {
                "email": "login@example.com",
                "password": "WrongPassword123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_unverified_user_cannot_login(self):
        self.user.is_active = False
        self.user.is_email_verified = False
        self.user.save(
            update_fields=[
                "is_active",
                "is_email_verified",
            ]
        )

        response = self.client.post(
            reverse("accounts:login"),
            {
                "email": "login@example.com",
                "password": "StrongPass123",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )


class PasswordResetAPITests(AccountTestMixin, TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = self.create_user(
            email="reset@example.com",
            phone_number="01077777777",
        )

    def test_forgot_password_request_succeeds(self):
        response = self.client.post(
            reverse("accounts:forgot-password"),
            {
                "email": "reset@example.com",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(mail.outbox),
            1,
        )

    def test_password_reset_token_can_be_generated(self):
        token = generate_password_reset_token(
            self.user
        )

        self.assertTrue(token)

        self.assertIsInstance(
            token,
            str,
        )


class AccountAuthenticationTests(AccountTestMixin, TestCase):

    def setUp(self):
        self.client = APIClient()

        self.user = self.create_user(
            email="auth@example.com",
            phone_number="01088888888",
        )

    def authenticate(self):
        self.client.force_authenticate(
            user=self.user
        )

    def test_authenticated_user_can_access_profile(self):
        self.authenticate()

        response = self.client.get(
            reverse("accounts:profile")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_anonymous_user_cannot_access_profile(self):
        response = self.client.get(
            reverse("accounts:profile")
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )


class UserFieldValidationTests(AccountTestMixin, TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_invalid_email_is_rejected(self):
        payload = {
            "email": "not-an-email",
            "phone_number": "01099999999",
            "first_name": "Test",
            "last_name": "User",
            "password": "StrongPass123",
            "confirm_password": "StrongPass123",
        }

        response = self.client.post(
            reverse("accounts:register"),
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_invalid_egyptian_phone_is_rejected(self):
        payload = {
            "email": "phone@example.com",
            "phone_number": "123456789",
            "first_name": "Test",
            "last_name": "User",
            "password": "StrongPass123",
            "confirm_password": "StrongPass123",
        }

        response = self.client.post(
            reverse("accounts:register"),
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )