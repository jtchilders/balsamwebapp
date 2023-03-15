
const base_url = 'https://balsam-dev.alcf.anl.gov/'
const balsamTokenName = "balsam_token"
var token = null
var client_id;
var device_code;

function have_token(){
    if(token == null){
        checkBalsamToken();
        if(token == null){
            return false;
        }
    }
    return true;
}

function generate_uuid() {
    return this.crypto.randomUUID();
}
const poll = async function (fn, fnCondition, ms) {
    let result = await fn();
    while (fnCondition(result)) {
        await wait(ms);
        result = await fn();
    }
    return result;
};

const wait = function (ms = 1000) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
};

function get_token() {
    return new Promise( function(resolve,reject){
        (function check_for_token(){
            console.log("checking for token");
            var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance 
            xmlhttp.onload = function() {
                // print JSON response
                    console.log("got token onload",this);
                if (this.status >= 200 && this.status < 300) {
                    // parse JSON
                    const response = JSON.parse(this.responseText);
                    console.log("got token",response);
                    resolve(response);
                    // setCookie(balsamTokenName, response['access_token'],3);
                    // polling=0;
                }
                else{
                    console.log("did not get token",this);
                    let rd = JSON.parse(this.responseText);
                    if(rd["detail"].includes("authorization_pending")){
                        setTimeout(check_for_token,2000);
                    }
                    else{
                        reject({
                            status: this.status,
                            statusText: this.statusText,
                            response: this.response,
                        });
                    }
                }
            };
            data = "grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code="+device_code+"&client_id="+String(client_id);

            var theUrl = "/auth/device/token";
            xmlhttp.open("POST", theUrl);
            xmlhttp.setRequestHeader("Accept", "application/json");
            xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            xmlhttp.send(data);
        })();
    });
}

function send_login_request() {
    return new Promise(function (resolve,reject) {
        console.log("In send_login_request");
        client_id = generate_uuid();
        data = "client_id="+String(client_id);

        var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance 
        xmlhttp.onload = () => {
            // print JSON response
            if (xmlhttp.status >= 200 && xmlhttp.status < 300) {
                // parse JSON
                const response = JSON.parse(xmlhttp.responseText);
                console.log("send_login_request onload:",response);
                device_code = response['device_code'];
                window.open(response['verification_uri_complete'], "_blank");
                resolve({
                    response: xmlhttp.response,
                    status: xmlhttp.status,
                    statusText: xmlhttp.statusText,
                });
            }
            else{
                reject({
                    status: xmlhttp.status,
                    statusText: xmlhttp.statusText,
                    response: xmlhttp.response,
                });
            }
        };
        var theUrl = "/auth/device/login";
        xmlhttp.open("POST", theUrl);
        xmlhttp.setRequestHeader("Accept", "application/json");
        xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xmlhttp.send(data);
    });
}

function do_login(){
    send_login_request().then(function (response){
        console.log('done send login reqeuest:',response);

        get_token().then(function (response){
            console.log('checked for token: ',response)
        }).catch(function (response){
            console.log('caught after checked for token:',response);
        });

    }).catch(function (response){
        console.log('caught after send login reqeuest:',response);
    });
}


function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
        c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
        }
    }
    return "";
}

function checkBalsamToken() {
    let local_token = getCookie(balsamTokenName);
    if (local_token != "") {
        token = local_token;
    } else {
        console.log("no token found");
    }
}

function onBalsamTokenFileChange(event) {
    event.preventDefault();
    var reader = new FileReader();
    reader.onload = onBalsamTokenReaderLoad;
    reader.readAsText(event.target.files[0]);
}

function onBalsamTokenReaderLoad(event){
    event.preventDefault();
    var lines = event.target.result.split('\n');
    var parts = lines[2].split(':');
    token = parts[1].trim();
    // reply = get_sites(token,offset=10);
    setCookie(balsamTokenName,token,3);
    let el = document.getElementById("config_file_form");
    el.style.display = "none";
}

function make_get_request(url,token){
    return new Promise(function (resolve,reject) {
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                data: JSON.parse(xhr.response),
                url: url
              });
            } else {
                let reply = JSON.parse(xhr.response);
                if(reply["detail"].includes("Could not validate credentials")){
                    alert("credentials are probably expired. Login again and delete the cookie for this page.")
                }
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText,
                    response: xhr.response,
                });
            }
        };
        xhr.onerror = function () {
            reject({
              status: xhr.status,
              statusText: xhr.statusText
            });
          };
        // console.log(url);
        xhr.open("GET", url);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Authorization", "Bearer " + token);
        xhr.send("");
    });
}

function create_custom_url(path,kwargs){
    let url = base_url + path + '/?'
    for(let key in kwargs){
        let value = kwargs[key]
        // console.log("kwargs:",key," = ",value);
        if(value != null){
            if(Array.isArray(value)){
                for(let i=0;i<value.length;i++){
                    url += key + '=' + String(value[i]) + '&'
                }
            }
            else{
                url += key + '=' + value + '&'
            }
        }
    }
    if(url.endsWith('&'))
        url = url.slice(0,url.length-1);
    // console.log(url);
    return url
}

function get_sites(token,
    {
        limit=10,
        offset=0,
        name=null,
        path=null,
        id=null, // one or array
        last_refresh_after=null
    } = {}
    ){

    url = create_custom_url('sites',{
            "limit":limit,
            "offset":offset,
            "id":id,
            "name":name,
            "path":path,
            "last_refresh_after":last_refresh_after,
        });
    return make_get_request(url,token)
}

function get_apps(token,
    {
        limit=10,
        offset=0,
        id=null, // one or array
        name=null,
        site_id=null, // one or array
        site_path=null,
        site_name=null
    } = {}
    ){

    url = create_custom_url('apps',{
            "limit":limit,
            "offset":offset,
            "id":id,
            "name":name,
            "site_id":site_id,
            "site_path":site_path,
            "site_name":site_name,
        });
    // console.log("get_apps:",url,site_id);
    return make_get_request(url,token)
}


function get_jobs(token,
    {
        limit=10,
        offset=0,
        id=null, // one or array
        parent_id=null, // one or array
        app_id=null, // one or array
        site_id=null, // one or array
        batch_job_id=null, // one or array
        last_update_before=null,
        last_update_after=null,
        workdir__contains=null,
        state__ne=null, // CREATED, AWAITING_PARENTS, READY, STAGED_IN, PREPROCESSED, RUNNING, RUN_DONE, RUN_ERROR, RUN_TIMEOUT, RESTART_READY, POSTPROCESSED, STAGED_OUT, JOB_FINISHED, FAILED
        state=null, // one or array
        tags=null, // one or array
        pending_file_cleanup=null,
        ordering=null, // last_update, -last_update, id, -id, state, -state, workdir, -workdir
    } = {}
    ){

    url = create_custom_url('jobs',{
            "limit":limit,
            "offset":offset,
            "id":id,
            "parent_id":parent_id,
            "app_id":app_id,
            "site_id":site_id,
            "batch_job_id":batch_job_id,
            "last_update_before":last_update_before,
            "last_update_after":last_update_after,
            "workdir__contains":workdir__contains,
            "state__ne":state__ne,
            "state":state,
            "tags":tags,
            "pending_file_cleanup":pending_file_cleanup,
            "ordering":ordering,
        });
    console.log(url)
    return make_get_request(url,token)
}


function get_batch_jobs(token,
    {
        limit=10,
        offset=0,
        id=null, // one or array
        site_id=null, // one or array
        state=null, // one or array
        scheduler_id=null,
        queue=null,
        ordering=null, // start_time, -start_time
        start_time_before=null,
        start_time_after=null,
        end_time_before=null,
        end_time_after=null,
        filter_tags=null, // one or array
    } = {}
    ){

    url = create_custom_url('batch-jobs',{
            "limit":limit,
            "offset":offset,
            "id":id,
            "site_id":site_id,
            "state":state,
            "scheduler_id":scheduler_id,
            "queue":queue,
            "ordering":ordering,
            "start_time_before":start_time_before,
            "start_time_after":start_time_after,
            "end_time_before":end_time_before,
            "end_time_after":end_time_after,
            "filter_tags":filter_tags,
        });
    console.log(url)
    return make_get_request(url,token)
}

function get_events(token,
    {
        limit=10,
        offset=0,
        id=null, // one or array
        job_id=null, // one or array
        batch_job_id=null,
        scheduler_id=null,
        tags=null, // one or array
        data=null, // one or array
        timestamp_before=null, // one or array
        timestamp_after=null,
        from_state=null,
        to_state=null,
        ordering=null, // timestamp, -timestamp
    } = {}
    ){

    url = create_custom_url('events',{
            "limit":limit,
            "offset":offset,
            "id":id,
            "job_id":job_id,
            "batch_job_id":batch_job_id,
            "scheduler_id":scheduler_id,
            "tags":tags,
            "data":data,
            "timestamp_before":timestamp_before,
            "timestamp_after":timestamp_after,
            "from_state":from_state,
            "to_state":to_state,
            "ordering":ordering,
        });
    // console.log(url)
    return make_get_request(url,token)
}
