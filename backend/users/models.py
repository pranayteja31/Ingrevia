from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    NutriScan User — full profile schema.

    Fields (beyond AbstractUser's id, username, email, password, date_joined, last_login):
    ─────────────────────────────────────────────────────────────────────────────
    IDENTITY
      name              Full display name
      email             Unique login credential (used as USERNAME_FIELD)

    DEMOGRAPHICS
      age               Age as string (e.g. "28"), optional
      gender            One of: male | female | non_binary | prefer_not_to_say

    PHYSICAL (for personalised health scoring)
      weight_kg         Body weight in kilograms, optional
      height_cm         Height in centimetres, optional

    HEALTH GOALS
      health_goals      Primary goal (e.g. "Weight Loss", "General Wellness")
      dietary_restrictions  Comma-separated flags (e.g. "vegan,gluten-free")
      known_allergens   JSON array of allergen strings to always highlight
                        (e.g. ["milk","gluten","eggs"])

    TIMESTAMPS
      created_at        Account creation time (auto-set on insert)
      updated_at        Last profile update time (auto-updated on save)
    """

    # ── Identity ──────────────────────────────────────────────────────────────
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)

    # ── Demographics ──────────────────────────────────────────────────────────
    age = models.CharField(max_length=10, blank=True, default='')

    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('non_binary', 'Non-binary'),
        ('prefer_not_to_say', 'Prefer not to say'),
    ]
    gender = models.CharField(
        max_length=20, choices=GENDER_CHOICES, blank=True, default=''
    )

    # ── Physical ──────────────────────────────────────────────────────────────
    weight_kg = models.FloatField(null=True, blank=True)
    height_cm = models.FloatField(null=True, blank=True)

    # ── Health ────────────────────────────────────────────────────────────────
    health_goals = models.CharField(
        max_length=200, blank=True, default='General Wellness'
    )
    dietary_restrictions = models.CharField(
        max_length=500, blank=True, default='',
        help_text='Comma-separated: vegan, vegetarian, gluten-free, dairy-free, halal, kosher, …',
    )
    known_allergens = models.JSONField(
        default=list, blank=True,
        help_text='JSON array of allergen names to always highlight, e.g. ["milk","gluten"]',
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    # date_joined comes from AbstractUser — we alias it as created_at via property
    updated_at = models.DateTimeField(auto_now=True)

    # ── Auth config ───────────────────────────────────────────────────────────
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'name']

    class Meta:
        db_table = 'nutriscan_user'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f'{self.name} <{self.email}>'

    @property
    def created_at(self):
        return self.date_joined

    @property
    def dietary_restrictions_list(self):
        """Return dietary_restrictions as a Python list."""
        if not self.dietary_restrictions:
            return []
        return [r.strip() for r in self.dietary_restrictions.split(',') if r.strip()]
