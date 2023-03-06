
const base_url = 'https://balsam-dev.alcf.anl.gov/'
const balsamTokenName = "balsam_token"
var token = null

function have_token(){
    if(token == null){
        return false;
    }
    else{
        return true;
    }
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
    console.log("in check balsam token");
    let local_token = getCookie(balsamTokenName);
    if (local_token != "") {
        console.log("have token");
        token = local_token;
    } else {
        let el = document.getElementById("config_file_form");
        el.style.visibility = "visible";
        console.log("no token found, enabled file browser");
    }
}

function onBalsamTokenFileChange(event) {
    console.log("onBalsamTokenFileChange");
    event.preventDefault();
    var reader = new FileReader();
    reader.onload = onBalsamTokenReaderLoad;
    reader.readAsText(event.target.files[0]);
}

function onBalsamTokenReaderLoad(event){
    event.preventDefault();
    // console.log(event.target.result);
    var lines = event.target.result.split('\n');
    var parts = lines[2].split(':');
    var token = parts[1].trim();
    console.log('token: '+token);
    // reply = get_sites(token,offset=10);
    setCookie(balsamTokenName,token,3);
    let el = document.getElementById("config_file_form");
    el.style.visibility = "hidden";
}

async function make_request(url,token){
    var xhttp = new XMLHttpRequest();
    xhttp.onload = function() {
        alert(`Loaded: ${xhttp.status} ${xhttp.response}`);
    };
    xhttp.onerror = function() { // only triggers if the request couldn't be made at all
        alert(`Network Error`);
    };
    xhttp.onprogress = function(event) { // triggers periodically
        // event.loaded - how many bytes downloaded
        // event.lengthComputable = true if the server sent Content-Length header
        // event.total - total number of bytes (if lengthComputable)
        alert(`Received ${event.loaded} of ${event.total}`);
    };
    xhttp.open("GET", "https://balsam-dev.alcf.anl.gov/sites/");
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.setRequestHeader("Authorization", "Bearer " + token);
    xhttp.send("");
    
    // if 'detail' in reply.keys() and 'Not authenticated' in reply['detail']:
    //     raise LoginExpired('Login Expired, reauthenticate')

    return xhttp.response;
}

function create_custom_url(path,kwargs){
    let url = base_url + path + '/?'
    for(let key in kwargs){
        let value = kwargs[key]
        if(value != null)
            url += key + '=' + value + '&'
    }
    if(url.endsWith('&'))
        url = url.slice(0,url.length-1);
    return url
}

function get_sites(token,limit=10,offset=0,
    id=null,
    name=null,
    ){

    url = create_custom_url('sites',{
            "limit":limit,
            "offset":offset,
            "id":id,
            "name":name
        });
    console.log(url)
    return make_request(url,token)
}