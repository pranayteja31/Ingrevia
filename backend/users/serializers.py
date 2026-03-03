from rest_framework import serializers
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    # Accept dietary_restrictions as either a comma-string or a list from the client
    dietary_restrictions = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = [
            'name', 'email', 'password',
            'age', 'gender',
            'weight_kg', 'height_cm',
            'health_goals', 'dietary_restrictions', 'known_allergens',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        email = validated_data.pop('email').lower()
        name = validated_data.pop('name')

        # Auto-generate a unique username from email prefix
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}{counter}'
            counter += 1

        user = User(username=username, email=email, name=name, **validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Full profile — used for GET /profile, PUT /profile, and in auth responses."""
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)
    dietary_restrictions_list = serializers.ListField(
        child=serializers.CharField(), read_only=True
    )

    class Meta:
        model = User
        fields = [
            'id', 'name', 'email',
            'age', 'gender',
            'weight_kg', 'height_cm',
            'health_goals', 'dietary_restrictions', 'dietary_restrictions_list',
            'known_allergens',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'email', 'created_at', 'updated_at', 'dietary_restrictions_list']
