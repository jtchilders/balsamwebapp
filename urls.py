from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('sites/', views.sites, name='sites'),
    path('sitedash/<str:site_id>/',views.sitedash, name='sitedash'),
    path('sitedash2/<str:site_id>/',views.sitedash2, name='sitedash2'),
    path('select_date_range/',views.select_date_range,name='select_date_range'),
    path('test_login/',views.test_login,name='test_login'),
    path('balsam_token_check/',views.balsam_token_check,name='balsam_token_check')
]