from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .models import User
from .serializers import RegisterSerializer, UserProfileSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """POST /api/auth/register/ — create account, return token + profile."""
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        # Flatten errors into a single readable string
        errors = serializer.errors
        msg = next(iter(next(iter(errors.values())))) if errors else 'Invalid data.'
        return Response({'error': str(msg)}, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': UserProfileSerializer(user).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """POST /api/auth/login/ — return token + profile."""
    email = request.data.get('email', '').lower().strip()
    password = request.data.get('password', '')

    if not email or not password:
        return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_obj = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'No account found with this email.'}, status=status.HTTP_401_UNAUTHORIZED)

    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response({'error': 'Incorrect password.'}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': UserProfileSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """POST /api/auth/logout/ — delete token."""
    request.user.auth_token.delete()
    return Response({'message': 'Logged out successfully.'})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile(request):
    """GET /api/auth/profile/ — fetch profile.
       PUT /api/auth/profile/ — update name, age, health_goals."""
    if request.method == 'GET':
        return Response(UserProfileSerializer(request.user).data)

    serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
