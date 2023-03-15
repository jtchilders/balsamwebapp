
var sites_data = null;
$(document).ready(function() {
    if(have_token()){
        send_site_data_request();
    }
    else{
        let tokenform = document.createElement("form");
        tokenform.id = "config_file_form";
        tokenform.onchange = function(){setTimeout(send_site_data_request,2000);};
        let tokenlabel = document.createElement("label");
        tokenlabel.appendChild(document.createTextNode("Select Balsam 'client.yml' file from your home directory: "));
        tokenform.appendChild(tokenlabel);
        let tokeninput = document.createElement("input");
        tokeninput.type="file";
        tokeninput.onchange=onBalsamTokenFileChange;
        tokenform.appendChild(tokeninput);
        
        let title = document.getElementById("title");
        document.body.insertBefore(tokenform,title);
    }
});

function send_site_data_request() {
    get_sites(token,fill_table);
}

function fill_table(xhttp){
    sites_data = JSON.parse(xhttp.responseText);
    document.getElementById("sites_count").textContent = sites_data["count"];
    document.getElementById("sites_recv").textContent = sites_data["results"].length;

    let sitedata = [];
    let idLookup = {};
    for(let i = 0;i < sites_data["results"].length; i++){
        result = sites_data["results"][i];
        let output = {};
        output["name"] = result["name"];
        output["queued_jobs"] = Object.keys(result["queued_jobs"]).length;

        let created = new Date(Date.parse(result["creation_date"]))
        output["creation_date"] = created;

        let last_refresh = new Date(Date.parse(result["last_refresh"]));
        let current_time = new Date();
        let diff = (current_time - last_refresh ) * 1e-3 / 60;
        let days = diff / 60 / 24;
        output["last_refresh"] = days.toFixed(4);
        idLookup[result["name"]] = result["id"];
        sitedata.push(output);
    }

    $("#sitedata").DataTable({
        data: sitedata,
        paging: false,
        ordering: true,
        info: false,
        searching: false,
        "columns": [
            { data: "name" },
            { data: "queued_jobs" },
            { data: "creation_date" },
            { data: "last_refresh"},
        ],
        "rowCallback":  function( row, data ) {
            if( parseFloat(data.last_refresh) < 1){
                // set name td class
                row.getElementsByTagName('td')[0].classList.add("False");
            }
            else{
                // set name td class
                row.getElementsByTagName('td')[0].classList.add("True");
            }
            // add link to name td
            const link = document.createElement("a");
            link.setAttribute("href", '/balsam/sitedash2/' + idLookup[data.name] + "/");
            link.textContent = data.name;
            row.getElementsByTagName('td')[0].textContent = "";
            row.getElementsByTagName('td')[0].appendChild(link);

        },
    });

    
    $('#sitedata td.True').each(function(){
        $(this).css('background-color','red');
        $(this).css('color','white');
    });
    $('#sitedata td.False').each(function(){
        $(this).css('background-color','green');
        $(this).css('color','white');
    });
    
}