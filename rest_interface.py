import requests,yaml
from django.http import Http404


base_url = 'https://balsam-dev.alcf.anl.gov/'

class LoginExpired(Exception):
    "Raised when the input value is less than 18"
    pass


def get_headers(balsam_yaml_filename="/mntdir/.balsam/client.yml"):
    with open(balsam_yaml_filename, "r") as stream:
        try:
            client_data = yaml.safe_load(stream)
        except yaml.YAMLError as exc:
            raise Http404("Failed to find balsam client yaml file")
    
    key = client_data['token']

    header = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + str(key)
    }

    return header


def make_request(url,headers):
    response = requests.get(url,headers=headers)
    reply = response.json()
    
    if 'detail' in reply.keys() and 'Not authenticated' in reply['detail']:
        raise LoginExpired('Login Expired, reauthenticate')
    
    return reply
    

def create_custom_url(base_url,path,**kwargs):
    url = base_url + path + '/?'
    for key,value in kwargs.items():
        if value is not None:
            if isinstance(value,list):
                for item in value:
                    url += key + '=' + str(item) + '&'
            else:
                url += key + '=' + str(value) + '&'
    if url.endswith('&'):
        url = url[0:-1]
    return url


def get_jobs(headers,limit=10,offset=0,
            id=None,
            parent_id=None,
            app_id=None,
            site_id=None,
            batch_job_id=None,
            last_update_before=None,
            last_update_after=None,
            state=None,
            tags=None):
    
    url = create_custom_url(base_url,'jobs',limit=limit,offset=offset,
                            id=id,
                            parent_id=parent_id,
                            app_id=app_id,
                            site_id=site_id,
                            batch_job_id=batch_job_id,
                            last_update_before=last_update_before,
                            last_update_after=last_update_after,
                            state=state,
                            tags=tags,
                            )

    return make_request(url,headers)

def get_logevt(headers,limit=10,offset=0,
               id=None,
               job_id=None,
               batch_job_id=None,
               scheduler_id=None,
               tags=None,
               timestamp_before=None,
               timestamp_after=None,
               from_state=None,
              ):
    
    url = create_custom_url(base_url,'events',limit=limit,offset=offset,
                            id=id,
                            job_id=job_id,
                            batch_job_id=batch_job_id,
                            scheduler_id=scheduler_id,
                            tags=tags,
                            timestamp_before=timestamp_before,
                            timestamp_after=timestamp_after,
                            from_state=from_state,
                            )
    return make_request(url,headers)


def get_sites(headers,limit=10,offset=0,
              id=None,
              name=None,
              ):

    url = create_custom_url(base_url,'sites',limit=limit,offset=offset,
                            id=id,
                            name=name,
                            )
    return make_request(url,headers)
