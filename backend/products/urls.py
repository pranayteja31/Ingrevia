from django.urls import path
from . import views

urlpatterns = [
    path('search/', views.search_products, name='product-search'),
    path('barcode/<str:barcode>/', views.product_by_barcode, name='product-barcode'),
    path('analyze-label/', views.analyze_label, name='analyze-label'),
    path('analyze-barcode/', views.analyze_barcode, name='analyze-barcode'),
]
