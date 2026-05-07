from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


class AuthApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_login_profile_and_logout_flow(self):
        payload = {
            'name': 'Open Source User',
            'email': 'user@example.com',
            'password': 'password123',
            'age': '25',
            'health_goals': 'General Wellness',
        }

        register_response = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(register_response.status_code, 201)
        token = register_response.data['token']
        self.assertTrue(token)

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        profile_response = self.client.get('/api/auth/profile/')
        self.assertEqual(profile_response.status_code, 200)
        self.assertEqual(profile_response.data['email'], 'user@example.com')

        logout_response = self.client.post('/api/auth/logout/')
        self.assertEqual(logout_response.status_code, 200)
        self.assertFalse(Token.objects.filter(key=token).exists())

        self.client.credentials()
        login_response = self.client.post(
            '/api/auth/login/',
            {'email': 'user@example.com', 'password': 'password123'},
            format='json',
        )
        self.assertEqual(login_response.status_code, 200)

    def test_register_rejects_duplicate_email(self):
        get_user_model().objects.create_user(
            username='existing',
            email='user@example.com',
            name='Existing User',
            password='password123',
        )

        response = self.client.post(
            '/api/auth/register/',
            {
                'name': 'Duplicate User',
                'email': 'user@example.com',
                'password': 'password123',
                'age': '30',
                'health_goals': 'General Wellness',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
