
// Returns binned difference between event lists for to_state and from_state
// for a given list of job IDs. 
// Return format:
// {
//     "to_state": "<from-input>",
//     "from_state": "<from-input>",
//     "bins": see get_bin_data() description for details,
//     "xlabels": for plot config,
// }
function get_event_data_to_from(from_state,to_state,joblist){
    return new Promise(function (resolve,reject){
        let pr = [];
        // Get events for each state change for the list of job IDs
        pr.push(get_events(token,{job_id:joblist["id"].values,to_state:to_state}));
        pr.push(get_events(token,{job_id:joblist["id"].values,from_state:from_state}));
        
        // wait for event retrieval, then parse the events into the format:
        // {"to state": "", "from_state": "", }
        Promise.all(pr).then(function (responses){
            let evt_to = null;
            let evt_from = null;
            for(const response of responses){
                let data = response.data;
                let url = response.url;

                console.log(JSON.stringify(data["results"]));
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
    // let total_time_ms = (us.end_time - us.start_time);
    // let bin_time_ms = total_time_ms / us.nbins;
    // let bin_time_min = bin_time_ms / 1000 / 60;
    let endDateTime = us.end_time;
    let startDateTime = us.start_time;
    let numBins = us.nbins;
    const binSize = Math.floor((endDateTime - startDateTime) / numBins);
    let binCenters = [];
    let jobCounts = [];
    
    // let bin_center = Array(numBins);
    let bin_evt_to = Array(numBins);
    let bin_evt_from = Array(numBins);
    bin_evt_to[0] = 0;
    bin_evt_from[0] = 0;
    for(let i=0;i<numBins;i++){
        // let bin_start = new Date(us.start_time);
        // bin_start.setMinutes(us.start_time.getMinutes() + (i*bin_time_min));
        // let bin_end = new Date(us.start_time);
        // bin_end.setMinutes(us.start_time.getMinutes() + ((i+1)*bin_time_min)); 
        // let center = new Date(us.start_time);
        // center.setMinutes(us.start_time.getMinutes() + bin_time_min*(i+0.5));
        let binStart = startDateTime + i * binSize;
        let binEnd = binStart + binSize;
        let binCenter = binStart + Math.floor(binSize / 2);
        binCenters.push(new Date(binCenter));
        // bin_center[i] = center;
        for(const evt of evt_to["results"]){
            let ts = new Date(evt["timestamp"]);
            if(binStart < ts && ts < binEnd){
                bin_evt_to[i] += 1;
            }
        }
        for(const evt of evt_from["results"]){
            let ts = new Date(evt["timestamp"]);
            if(binStart < ts && ts < binEnd){
                bin_evt_from[i] += 1;
            }
        }

        if(i<(numBins-1)){
            bin_evt_to[i+1] = bin_evt_to[i];
            bin_evt_from[i+1] = bin_evt_from[i];
        }
    }
    // console.log('bin_evt_to',bin_evt_to);
    // console.log('bin_evt_from',bin_evt_from);

    let bin_running = Array(numBins);
    bin_running[0] = 0;
    for(let i=1;i<numBins;i++){
        bin_running[i] = bin_evt_to[i] - bin_evt_from[i-1];
        // if(bin_running[i] < 0){
        //     bin_running[i] = 0;
        // }
    }
    // console.log('bin_running',bin_running);

    xlabels = [];
    const zeroPad = (num, places) => String(num).padStart(places, '0');
    for(let i=0;i<numBins;i++){
        let x = binCenters[i];
        let xstr = (x.getMonth()+1)+"-"+zeroPad(x.getDate(),2)+" "+zeroPad(x.getHours(),2)+":"+zeroPad(x.getMinutes(),2);
        xlabels.push(xstr);
    }
    return {
        bins: bin_running,
        xlabels: xlabels,
    }
}

function make_timeline(bjhist,jhist,canvas_name){
    const chart_canvas = document.getElementById(canvas_name);
    // make bin labels
    let us = get_user_settings();
    let endTime = us.end_time;
    let startTime = us.start_time;
    let numBins = us.nbins;
    let xlabels = [];
    let binSize = (endTime - startTime) / numBins;
    const zeroPad = (num, places) => String(num).padStart(places, '0');
    // console.log("startTime: ",startTime," binSize: ",binSize);
    for(let i=0;i<numBins;i++){
        let binCenter = new Date(startTime.getTime() + ( (i + 0.5) * binSize ) );
        let x = binCenter;
        let xstr = (x.getMonth()+1)+"-"+zeroPad(x.getDate(),2)+" "+zeroPad(x.getHours(),2)+":"+zeroPad(x.getMinutes(),2);
        // console.log("i = ",i,"binCenter: ", binCenter, " xstr: ",xstr);
        xlabels.push(xstr);
    }

    var datasets = [];

    // add batch jobs:
    datasets.push({
        label: "Batch Job Nodes Available",
        data: bjhist,
        borderWidth: 1
    });
    // add RUNNING jobs:
    datasets.push({
        label: "Nodes RUNNING Jobs",
        data: jhist['RUNNING'],
        borderWidth: 1
    });
    
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
}


function generateJobHistogram(events, jobs, startTime, endTime, numBins, increment_by_num_nodes = true) {
    const binSize = (endTime - startTime) / numBins;
    let histogram = {};

    // loop over each job
    jobs.forEach(job => {
        // get events for this job
        const job_events = events.filter(event => job.id == event.job_id);
        // sort them by timestamp
        const sortedEvents = job_events.sort((a, b) => {
            const timeA = Date.parse(a.timestamp);
            const timeB = Date.parse(b.timestamp);
            return timeA - timeB;
        });

        // increment by num_nodes or just 1
        let increment = 1;
        if(increment_by_num_nodes){
            increment = job.num_nodes;
        }

        // keep track of last event's state and bin
        let last_state = "";
        let last_bin = 0;
        // loop over the sorted events
        for(let event of sortedEvents){
            // get event timestamp
            const timestamp = new Date(event.timestamp).getTime();
            // if event occurred within the window
            if(timestamp >= startTime && timestamp <= endTime){
                const to_state = event.to_state;
                const from_state = event.from_state;
                const binIndex = Math.floor((timestamp - startTime) / binSize);
                if(!Object.keys(histogram).includes(to_state)){
                    histogram[to_state] = Array(numBins).fill(0);
                }

                if(last_state == from_state){
                    for(let i=last_bin;i<binIndex+1;i++){
                        histogram[from_state][i] += increment;
                    }
                }
                last_state = to_state;
                last_bin = binIndex;
            }
            else{
                last_state = event.to_state;
                last_bin = 0;
            }

        }

        for(let i=last_bin;i<numBins;i++){
            histogram[last_state][i] += increment;
        }

    });

    return histogram;
}


function generateBatchJobHistogram(batch_jobs, startTime, endTime, numBins, increment_by_num_nodes = true) {
    const binSize = (endTime - startTime) / numBins;
    let histogram = Array(numBins).fill(0);

    // loop over each job
    batch_jobs.forEach(job => {
        
        let job_start = new Date(job.start_time);
        let job_end =  new Date(job.end_time);

        // increment by num_nodes or just 1
        let increment = 1;
        if(increment_by_num_nodes){
            increment = job.num_nodes;
        }

        // if batch job didn't occur within the histogram time window continue
        if( (job_start < startTime && job_end < startTime) || (job_start > endTime && job_end > endTime) ){
            return;
        }
        // if the job_start is below the window, but the end is during
        else if (job_start < startTime && job_end < endTime){
            let lastBin = Math.floor((job_end - startTime) / binSize);
            for(let i=0;i<lastBin;i++){
                histogram[i] += increment;
            }
        }
        // if the job_start and job_end are inside the window
        else if(job_start > startTime && job_start < endTime && job_end > startTime && job_end < endTime){
            let firstBin = Math.floor((job_start - startTime) / binSize);
            let lastBin = Math.floor((job_end - startTime) / binSize) + 1;
            for(let i=firstBin;i<lastBin;i++){
                histogram[i] += increment;
            }
        }
        // job_start is during window, but job_end is above window
        else if(job_start > startTime && jobStart < endTime && job_end > startTime && job_end > endTime){
            let firstBin = Math.floor((job_start - startTime) / binSize);
            let lastBin = numBins;
            for(let i=firstBin;i<lastBin;i++){
                histogram[i] += increment;
            }
        }
        else{
            console.log("should not get here");
        }


    });

    return histogram;
}


function update_job_barchart(table_jdf){
    // adding chartjs
    const chart_canvas = document.getElementById('state_barchart');
    let grp = table_jdf.groupby(["state"]);
    let running = 0;
    if("RUNNING" in grp.colDict){
        running = grp.colDict["RUNNING"].state.length;
    }
    let done = 0;
    if("JOB_FINISHED" in grp.colDict){
        done = grp.colDict["JOB_FINISHED"].state.length;
    }
    let ready = 0;
    for(const st of ['CREATED',
                    'AWAITING_PARENTS',
                    'READY',
                    'STAGED_IN',
                    'PREPROCESSED',
                    'RESTART_READY']){
        if(st in grp.colDict){
            ready = ready + grp.colDict[st].state.length;
        }
    }
    let failed = 0;
    for(const st of [
                    'RUN_ERROR',
                    'RUN_TIMEOUT',
                    'FAILED',]){
        if(st in grp.colDict){
            failed = failed + grp.colDict[st].state.length;
        }
    }

    var data = {
            data: [ready,running,done,failed],
            backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(255, 159, 64, 0.2)',
            'rgba(255, 205, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(201, 203, 207, 0.2)'
            ],
            borderColor: [
            'rgb(255, 99, 132)',
            'rgb(255, 159, 64)',
            'rgb(255, 205, 86)',
            'rgb(75, 192, 192)',
            'rgb(54, 162, 235)',
            'rgb(153, 102, 255)',
            'rgb(201, 203, 207)'
            ],
            borderWidth: 1
        };
    var datasets = {
        labels: ["ready","running","finished","failed"],
        datasets: [data],
    };
    
    var chartOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
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
                display: false
            }
        }
    };
    
    if(barchart != null){
        barchart.destroy();
    }
    barchart = new Chart(chart_canvas, {
        type: 'bar',
        data: datasets,
        options: chartOptions
    });
}
