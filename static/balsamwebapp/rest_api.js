
const base_url = 'https://balsam-dev.alcf.anl.gov/'
const balsamTokenName = "balsam_token"
var token = null

function have_token(){
    if(token == null){
        checkBalsamToken();
        if(token == null){
            return false;
        }
    }
    return true;
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
        console.log("no token found, enabled file browser");
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

async function make_request(url,token,onload){
    var xhttp = new XMLHttpRequest();
    xhttp.onload = function(){onload(xhttp)};
    xhttp.onerror = function() { // only triggers if the request couldn't be made at all
        alert(`make_request: Network Error`);
    };
    // xhttp.onprogress = function(event) { // triggers periodically
    //     // event.loaded - how many bytes downloaded
    //     // event.lengthComputable = true if the server sent Content-Length header
    //     // event.total - total number of bytes (if lengthComputable)
    //     console.log(`Received ${event.loaded} of ${event.total}`);
    // };
    xhttp.open("GET", "https://balsam-dev.alcf.anl.gov/sites/");
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.setRequestHeader("Authorization", "Bearer " + token);
    xhttp.send("");
}

function create_custom_url(path,kwargs){
    let url = base_url + path + '/?'
    for(let key in kwargs){
        let value = kwargs[key]
        if(value != null){
            if(Array.isArray(value)){
                for(let i=0;i<value.length;i++){
                    url += key + '=' + str(value[i]) + '&'
                }
            }
            else{
                url += key + '=' + value + '&'
            }
        }
    }
    if(url.endsWith('&'))
        url = url.slice(0,url.length-1);
    return url
}

function get_sites(token,onload_callback,limit=10,offset=0,
    name=null,
    path=null,
    id=null, // one or array
    last_refresh_after=null,
    ){

    url = create_custom_url('sites',{
            "limit":limit,
            "offset":offset,
            "id":id,
            "name":name,
            "last_refresh_after":last_refresh_after,
        });
    make_request(url,token,onload_callback)
}

function get_apps(token,onload_callback,limit=10,offset=0,
    id=null, // one or array
    name=null,
    site_id=null, // one or array
    site_path=null,
    site_name=null,
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
    console.log(url)
    make_request(url,token,onload_callback)
}


function get_jobs(token,onload_callback,limit=10,offset=0,
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
    ){

    url = create_custom_url('jobs',{
            "limit":limit,
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
    make_request(url,token,onload_callback)
}
