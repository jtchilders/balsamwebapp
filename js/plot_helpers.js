
// Returns binned difference between event lists for to_state and from_state
// for a given list of job IDs. 
// Return format:
// {
//     "to_state": "<from-input>",
//     "from_state": "<from-input>",
//     "bins": see get_bin_data() description for details,
//     "xlabels": for plot config,
// }
function get_event_data_to_from(from_state,to_state,job_id_list){
    return new Promise(function (resolve,reject){
        let pr = [];
        // Get events for each state change for the list of job IDs
        pr.push(get_events(token,{job_id:job_id_list,to_state:to_state}));
        pr.push(get_events(token,{job_id:job_id_list,from_state:from_state}));
        
        // wait for event retrieval, then parse the events into the format:
        // {"to state": "", "from_state": "", }
        Promise.all(pr).then(function (responses){
            let evt_to = null;
            let evt_from = null;
            for(const response of responses){
                let data = response.data;
                let url = response.url;
                if(url.includes("to_state")){
                    evt_to = data;
                }
                else if(url.includes("from_state")){
                    evt_from = data;
                }
            }
            if( evt_to != null && evt_from != null){
                console.log(from_state,"->",to_state);
                let bin_data = get_bin_data(evt_to,evt_from);
                bin_data["to_state"] = to_state;
                bin_data["from_state"] = from_state;
                resolve(bin_data);
            }
            else{
                reject("failed to get binned data");
            }
        });
    });
}

// Get the current date/time range and bins from the user input fields
function get_user_settings(){
    let start_time = new Date(document.getElementById('start_time').value);
    let end_time = new Date(document.getElementById('end_time').value);
    let nbins = Number(document.getElementById('nbins').value);

    return {
        start_time: start_time,
        end_time: end_time,
        nbins: nbins
    }
}

// given a set of events that mark going to and from a state,
// retrieve the user defined range from the input fields (or default settings),
// then create two arrays. Each array represents a running count with increasing
// time bin of the number of events that occurred up to that point. The return 
// value is a dictionary containing:
// {
//   "bins": array equal to the difference of array_to[i] - array_from[i-1],
//   "xlables": for the plotter,
// }
function get_bin_data(evt_to,evt_from){
    let us = get_user_settings();
    // console.log(us.start_time);
    let total_time_ms = (us.end_time - us.start_time);
    let bin_time_ms = total_time_ms / us.nbins;
    let bin_time_min = bin_time_ms / 1000 / 60;
    
    let bin_center = Array(us.nbins);
    let bin_evt_to = Array(us.nbins);
    let bin_evt_from = Array(us.nbins);
    bin_evt_to[0] = 0;
    bin_evt_from[0] = 0;
    for(let i=0;i<us.nbins;i++){
        let bin_start = new Date(us.start_time);
        bin_start.setMinutes(us.start_time.getMinutes() + (i*bin_time_min));
        let bin_end = new Date(us.start_time);
        bin_end.setMinutes(us.start_time.getMinutes() + ((i+1)*bin_time_min)); 
        let center = new Date(us.start_time);
        center.setMinutes(us.start_time.getMinutes() + bin_time_min*(i+0.5));
        bin_center[i] = center;
        for(const evt of evt_to["results"]){
            let ts = new Date(evt["timestamp"]);
            if(bin_start < ts && ts < bin_end){
                bin_evt_to[i] += 1;
            }
        }
        for(const evt of evt_from["results"]){
            let ts = new Date(evt["timestamp"]);
            if(bin_start < ts && ts < bin_end){
                bin_evt_from[i] += 1;
            }
        }

        if(i<(us.nbins-1)){
            bin_evt_to[i+1] = bin_evt_to[i];
            bin_evt_from[i+1] = bin_evt_from[i];
        }
    }
    // console.log('bin_evt_to',bin_evt_to);
    // console.log('bin_evt_from',bin_evt_from);

    let bin_running = Array(us.nbins);
    bin_running[0] = 0;
    for(let i=1;i<us.nbins;i++){
        bin_running[i] = bin_evt_to[i] - bin_evt_from[i-1];
        // if(bin_running[i] < 0){
        //     bin_running[i] = 0;
        // }
    }
    // console.log('bin_running',bin_running);

    xlabels = [];
    const zeroPad = (num, places) => String(num).padStart(places, '0')
    for(let i=0;i<us.nbins;i++){
        let x = bin_center[i];
        let xstr = (x.getMonth()+1)+"-"+zeroPad(x.getDate(),2)+" "+zeroPad(x.getHours(),2)+":"+zeroPad(x.getMinutes(),2);
        xlabels.push(xstr);
    }
    return {
        bins: bin_running,
        xlabels: xlabels,
    }
}

function make_timeline(jdf,canvas_name){
    const chart_canvas = document.getElementById(canvas_name);

    let pr = [];
    pr.push(get_event_data_to_from("RUNNING","RUNNING",jdf["id"].values));
    // pr.push(get_event_data_to_from("JOB_FINISHED","JOB_FINISHED",jdf["id"].values));
    // pr.push(get_event_data_to_from("FAILED","FAILED",jdf["id"].values));
    // pr.push(get_event_data_to_from("CREATED","PREPROCESSED",jdf["id"].values));
    // pr.push(get_event_data_to_from("PREPROCESSED","RUNNING",jdf["id"].values));
    // pr.push(get_event_data_to_from("RUNNING","JOB_FINISHED",jdf["id"].values));
    // pr.push(get_event_data_to_from("RUNNING","FAILED",jdf["id"].values));

    Promise.all(pr).then(function (responses){

        var datasets =[];
        var xlabels = null;
        for(const bindata of responses){

            datasets.push({
                label: bindata.from_state, // + "->" + bindata.to_state,
                data: bindata.bins,
                borderWidth: 1
            });
            xlabels = bindata.xlabels;
        }

        var datasets = {
            labels: xlabels,
            datasets: datasets,
        };
        
        var chartOptions = {
            layout: {
                padding: 20
            },
            animations: {
                tension: {
                    duration: 10000,
                    easing: 'linear',
                    from: 1,
                    to: 0,
                    loop: true
                }
            },
            zoom: {
                enabled: true,
                mode: 'x',
            },
            plugins: {
                legend: {
                    display: true,

                }
            }
        };
        
        if(runbar != null){
            runbar.destroy();
        }
        runbar = new Chart(chart_canvas, {
            type: 'line',
            data: datasets,
            options: chartOptions
        });

    });
}
