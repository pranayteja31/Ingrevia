from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'name', 'age', 'health_goals', 'is_active', 'date_joined']
    search_fields = ['email', 'name']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('NutriScan Profile', {'fields': ('name', 'age', 'health_goals')}),
    )
