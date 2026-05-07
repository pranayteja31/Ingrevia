from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


class HistoryApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='history',
            email='history@example.com',
            name='History User',
            password='password123',
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def test_add_update_list_and_clear_history(self):
        first = self.client.post(
            '/api/history/',
            {'product_id': 'abc', 'name': 'First Name', 'brand': 'Brand A'},
            format='json',
        )
        self.assertEqual(first.status_code, 201)

        second = self.client.post(
            '/api/history/',
            {'product_id': 'abc', 'name': 'Updated Name', 'brand': 'Brand B'},
            format='json',
        )
        self.assertEqual(second.status_code, 200)

        history = self.client.get('/api/history/')
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.data), 1)
        self.assertEqual(history.data[0]['name'], 'Updated Name')

        clear = self.client.delete('/api/history/')
        self.assertEqual(clear.status_code, 204)
        self.assertEqual(self.client.get('/api/history/').data, [])
