from django.shortcuts import render
from .index import index
from .site_dashboard import sitedash,select_date_range
from .test_login import test_login
from .balsam_token_check import balsam_token_check

def sitedash2(request,site_id):
    return render(request, 'balsamwebapp/sitedash2.html',{"site_id":site_id})
def sites(request):
    return render(request, 'balsamwebapp/sites.html',{})