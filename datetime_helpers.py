import datetime

def get_time(datetime_str):
    # 'last_refresh': '2022-06-03T16:42:07.704588'
    return datetime.strptime(datetime_str,'%Y-%m-%dT%H:%M:%S.%f')

def set_time(dt):
    return dt.strftime('%Y-%m-%dT%H:%M:%S.%f')
