from django.shortcuts import render
from django.http import Http404
from django.conf import settings
import pandas as pd
import balsamwebapp.rest_interface as ri
from balsamwebapp.views.site_dashboard import sitedash

def index(request):

    headers = ri.get_headers()
    
    site_data = ri.get_sites(headers)
    sitedf = pd.DataFrame(site_data['results'])
    sitedf['last_refresh_obj'] = pd.to_datetime(sitedf['last_refresh'])
    now = pd.Timestamp.now()
    sitedf['last_refresh_diff'] = now - sitedf['last_refresh_obj']
    sitedf['site_expired'] = sitedf['last_refresh_diff'] > pd.Timedelta(hours=24)
    sitedf['nqueued'] = sitedf['queued_jobs'].apply(lambda x: len(x))

    return render(request, 'balsamwebapp/index.html', {'site_data': sitedf})