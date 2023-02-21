from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('sitedash/<str:site_id>/',views.sitedash, name='sitedash'),
    path('select_date_range/',views.select_date_range,name='select_date_range'),
    path('test_login/',views.test_login,name='test_login'),
]