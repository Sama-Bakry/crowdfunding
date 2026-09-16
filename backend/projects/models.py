from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Avg, Sum
from django.utils import timezone
from django.utils.text import slugify


class Category(models.Model):
   
    name = models.CharField(
        max_length=100,
        unique=True,
    )

    slug = models.SlugField(
        max_length=120,
        unique=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Tag(models.Model):
    
    name = models.CharField(
        max_length=50,
        unique=True,
    )

    slug = models.SlugField(
        max_length=60,
        unique=True,
        blank=True,
    )

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Project(models.Model):
    

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )

    title = models.CharField(
        max_length=150,
    )

    details = models.TextField()

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="projects",
    )

    tags = models.ManyToManyField(
        Tag,
        related_name="projects",
        blank=True,
    )

    target_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("1.00"))],
    )

    start_date = models.DateField()

    end_date = models.DateField()

    is_cancelled = models.BooleanField(
        default=False,
    )

    is_featured = models.BooleanField(
        default=False,
    )

    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def total_donations(self):
        

        donations = getattr(self, "donations", None)

        if donations is None:
            return Decimal("0.00")

        total = donations.aggregate(total=Sum("amount"))["total"]

        return total or Decimal("0.00")

    @property
    def average_rating(self):
        """Calculates the average rating from related ratings."""
        ratings = getattr(self, "ratings", None)

        if ratings is None:
            return Decimal("0.0")

        avg = ratings.aggregate(avg=Avg("value"))["avg"]

        return Decimal(str(round(avg, 1))) if avg is not None else Decimal("0.0")

    @property
    def funding_progress(self):


        if self.target_amount <= 0:
            return Decimal("0.00")

        progress = (self.total_donations / self.target_amount) * 100

        return min(progress, Decimal("100.00"))

    @property
    def status(self):
        

        if self.is_cancelled:
            return "cancelled"

        today = timezone.localdate()

        if today < self.start_date:
            return "upcoming"

        if today > self.end_date:
            return "ended"

        return "running"

    @property
    def is_running(self):
        return self.status == "running"

    def can_be_cancelled(self):
      

        if self.is_cancelled or self.status == "ended":
            return False

        return self.total_donations < (self.target_amount * Decimal("0.25"))

    def cancel(self):
        if not self.can_be_cancelled():
            raise ValueError(
                "This project can no longer be cancelled."
            )

        self.is_cancelled = True
        self.cancelled_at = timezone.now()

        self.save(
            update_fields=[
                "is_cancelled",
                "cancelled_at",
                "updated_at",
            ]
        )


class ProjectImage(models.Model):
    

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(
        upload_to="project_images/",
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["uploaded_at"]

    def __str__(self):
        return f"Image for {self.project.title}"
