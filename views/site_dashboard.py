from django.shortcuts import render
from django.http import JsonResponse,HttpResponse
import balsamwebapp.rest_interface as ri
import balsamwebapp.datetime_helpers as dth
from django.conf import settings
import pandas as pd
import matplotlib.pyplot as plt
import datetime,copy,os,json


READY = [
'CREATED',
'AWAITING_PARENTS',
'READY',
'STAGED_IN',
'PREPROCESSED',
'RESTART_READY'
]

# JOB_FINISHED = [
#     'JOB_FINISHED'
# ]

FAILED = [
    'RUN_ERROR',
    'RUN_TIMEOUT',
    'FAILED',
]

headers = None
gsite_id = None

def make_timeline(evtsdf,
                  start_datetime=datetime.datetime.now() - datetime.timedelta(days=7),
                  end_datetime=datetime.datetime.now(),
                  nbins = 7*24*60):
    
    unq_jid = pd.unique(evtsdf['job_id'])

    # current_state = {}
    # for jid in unq_jid:
    #     current_state[jid] = 'unset'
    
    datetime_index = start_datetime
    datetime_increment = (end_datetime - start_datetime) / nbins
    output = [{'RUNNING':0,'FAILED':0,'READY':0,'JOB_FINISHED':0}]
    for bin in range(nbins):
        bin_entry = copy.deepcopy(output[-1])
        bin_entry['timestamp'] = datetime_index
        intime = evtsdf[evtsdf['timestamp'] > datetime_index]
        intime = intime[intime['timestamp'] < datetime_index + datetime_increment]

        for jid in unq_jid:

            jdf = intime[intime['job_id'] == jid]

            for index,row in jdf.iterrows():

                try:
                    bin_entry[row['to_state']] += 1
                except KeyError:
                    bin_entry[row['to_state']] = 1

                try:
                    bin_entry[row['from_state']] = max(bin_entry[row['from_state']]-1,0)
                except KeyError:
                    bin_entry[row['from_state']] = 0
        
        bin_entry['READY'] = 0
        for state in READY:
            try:
                bin_entry['READY'] += bin_entry[state]
            except KeyError:
                continue
        
        bin_entry['FAILED'] = 0
        for state in FAILED:
            try:
                bin_entry['FAILED'] += bin_entry[state]
            except KeyError:
                continue
        output.append(bin_entry)
        datetime_index = datetime_index + datetime_increment
    
    df = pd.DataFrame(output[1:])
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    return df


def get_sitedf(headers,site_id):

    sitejson = ri.get_sites(headers,id=site_id)
    
    sitedf = pd.DataFrame(sitejson['results'])
    sitedf['last_refresh_obj'] = pd.to_datetime(sitedf['last_refresh'])
    now = pd.Timestamp.now()
    sitedf['last_refresh_diff'] = now - sitedf['last_refresh_obj']
    sitedf['site_expired'] = sitedf['last_refresh_diff'] > pd.Timedelta(hours=24)
    sitedf['nqueued'] = sitedf['queued_jobs'].apply(lambda x: len(x))

    return sitedf

def get_jobs(headers,site_id):
    jobjson = ri.get_jobs(headers,site_id=site_id)
    return int(jobjson['count']),pd.DataFrame(jobjson['results'])

def get_evtsdf(headers,jobs,timestamp_after=None,timestamp_before=None):
    reply = ri.get_logevt(headers,limit=100,job_id=jobs['id'].to_list(),timestamp_before=timestamp_before,timestamp_after=timestamp_after)
    evtsdf = pd.DataFrame(reply['results'])
    evtsdf['timestamp'] = pd.to_datetime(evtsdf['timestamp'])
    evtsdf = evtsdf.sort_values(by='timestamp')
    return evtsdf


def sitedash(request,site_id):
    global headers,evtsdf,gsite_id
    DEFAULT_START_TIME=datetime.datetime.now() - datetime.timedelta(days=7)
    DEFAULT_END_TIME=datetime.datetime.now()

    gsite_id = site_id
    headers = ri.get_headers()
    
    sitedf = get_sitedf(headers,site_id)
    job_count,jobs = get_jobs(headers,site_id)
    evtsdf = get_evtsdf(headers,jobs,DEFAULT_START_TIME,DEFAULT_END_TIME)
    
    statedf = make_timeline(evtsdf,nbins=100)
    statedf = statedf.fillna(0)
    statedf['timestampstr'] = statedf['timestamp'].dt.strftime('%Y-%m-%d %H:%M')

    inputs = {
        'jobs':jobs,
        'jobcount':job_count,
        'site':sitedf.iloc[0],
        'xlabels': json.dumps(statedf['timestampstr'].to_list()),
    }

    for x in ['RUNNING','FAILED','READY','JOB_FINISHED']:
        if len(statedf[x]) > 0:
            inputs[x] = json.dumps(statedf[x].to_list())


    return render(request, 'balsamwebapp/sitedash.html',inputs)


def select_date_range(request):
    if request.method == 'GET':
        start_time = datetime.datetime.strptime(request.GET['start_time'],'%Y-%m-%dT%H:%M')
        end_time = datetime.datetime.strptime(request.GET['end_time'],'%Y-%m-%dT%H:%M')
        nbins = int(request.GET['nbins'])
        inputs = {}
        if (end_time - start_time) < datetime.timedelta(hours=1):
            inputs['msg'] = '  Update failed: time window must be > 1 hour.'
            inputs['update'] = False
            return JsonResponse(inputs)

        job_count,jobs = get_jobs(headers,gsite_id)
        evtsdf = get_evtsdf(headers,jobs,start_time.strftime('%Y-%m-%d %H:%M:%S.%f'))
        statedf = make_timeline(evtsdf,
                                start_datetime=start_time,
                                end_datetime=end_time,
                                nbins=nbins)
        statedf = statedf.fillna(0)
        statedf['timestampstr'] = statedf['timestamp'].dt.strftime('%Y-%m-%d %H:%M')

        inputs = {'xlabels': statedf['timestampstr'].to_list()}
        for x in ['RUNNING','FAILED','READY','JOB_FINISHED']:
            if x in statedf and len(statedf[x]) > 0:
                inputs[x] = statedf[x].to_list()

        
        inputs['msg'] = ' Update Succeeded'
        inputs['update'] = True

        return JsonResponse(inputs)
    else:
        return HttpResponse("Request method is not a GET")