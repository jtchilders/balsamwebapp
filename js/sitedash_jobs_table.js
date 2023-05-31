

function make_table(df){
    let idx = df.index;
    let val = df.values;
    // console.log(idx)
    // console.log(val)

    let table = document.createElement('table');
    table.classList.add('job_popup_table');
    let tbody = document.createElement('tbody');
    table.appendChild(tbody);

    for(let i=0;i<idx.length;i++){
        let x = String(idx[i]);
        let y = val[i][0];
        let tr = document.createElement('tr');
        tbody.appendChild(tr);
        let td_x = document.createElement('td');
        td_x.textContent = x;
        tbody.appendChild(td_x);
        let td_y = document.createElement('td');
        if(x.includes("data") || x.includes("tags") || x.includes("launch_params")){
            td_y.textContent = JSON.stringify(y);
        }
        else if(x.includes("last_update")){
            let yy = new Date(y);
            td_y.textContent = yy.toString();
        }
        else{
            td_y.textContent = y;
        }
        tbody.appendChild(td_y);
    }
    return table;
}


function update_jobs_table(jdf){
    let table_jdf = jdf.loc({columns:["id","app_id","batch_job_id","tagstr","state"]});

    if(jobtable == null){
        jobtable = $('#jobdata').DataTable({
            data: table_jdf.values,
            paging: false,
            ordering: true,
            info: false
        });
    }
    else{
        jobtable.clear().draw();
        jobtable.rows.add(table_jdf.values).draw();
    }

    $('#jobdata tbody').on('click', 'tr', function () {
        $(this).toggleClass('selected');
    });

    $('#job-details-button').click(function () {
        let data = jobtable.rows('.selected').data();
        let nrows = data.length;
        if(nrows > 1){
            alert('must only select 1 row for details.');
        }
        else{
            console.log('data = ',data[0]);
            let row = data[0];
            let jobid = row[0];
            location.href = '/static/balsamwebapp/jobdetails.html?job_id=' + jobid;
        }
    });


    $('#job-delete-button').click(function () {
        let data = jobtable.rows('.selected').data();
        let nrows = data.length;
        let confirm_delete = confirm("Are you sure you would like to delete " + nrows + " jobs from the central Balsam database?");
        console.log('delete jobs: ',confirm_delete);
        if(confirm_delete){
            // make list of job ids
            let jobids = [];
            for(let i=0;i<nrows;i++){
                jobids.push(data[i][0]);
            }
            delete_jobs(token,{id:jobids}).then(function (response){
                console.log(response);
                location.reload();
            });
        }
        // if(nrows > 1){
        //     alert('must only select 1 row for details.');
        // }
        // else{
        //     console.log('data = ',data[0]);
        //     let row = data[0];
        //     let jobid = row[0];
        //     location.href = '/static/balsamwebapp/jobdetails.html?job_id=' + jobid;
        // }
    });

    return table_jdf;
}