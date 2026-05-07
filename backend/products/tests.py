from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


class ProductApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='tester',
            email='tester@example.com',
            name='Tester',
            password='password123',
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    @patch('products.views.requests.get')
    def test_barcode_lookup_returns_normalized_product(self, mock_get):
        response = Mock()
        response.json.return_value = {
            'status': 1,
            'product': {
                'product_name': 'Test Cereal',
                'brands': 'Example Foods',
                'nutriments': {'energy-kcal_100g': 120, 'sodium_100g': 0.2},
            },
        }
        response.raise_for_status.return_value = None
        mock_get.return_value = response

        result = self.client.get('/api/products/barcode/123456/')

        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data['id'], '123456')
        self.assertEqual(result.data['name'], 'Test Cereal')
        self.assertEqual(result.data['nutrients_100g']['sodium'], 200)

    @patch('products.views.ai_service')
    @patch('products.views.requests.get')
    def test_analyze_barcode_uses_shared_lookup_without_reentering_view(self, mock_get, mock_ai):
        mock_ai.is_configured.return_value = True
        mock_ai.extract_barcode.return_value = '98765'
        response = Mock()
        response.json.return_value = {
            'status': 1,
            'product': {
                'product_name': 'Detected Product',
                'brands': 'Detected Brand',
                'nutriments': {},
            },
        }
        response.raise_for_status.return_value = None
        mock_get.return_value = response

        result = self.client.post('/api/products/analyze-barcode/', {'image': 'abc'}, format='json')

        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data['id'], '98765')
        self.assertEqual(result.data['name'], 'Detected Product')
