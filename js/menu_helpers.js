
document.addEventListener("DOMContentLoaded", function(){
    // make it as accordion for smaller screens
    if (window.innerWidth > 992) {

        document.querySelectorAll('.navbar .nav-item').forEach(function(everyitem){

            everyitem.addEventListener('mouseover', function(e){

                let el_link = this.querySelector('a[data-bs-toggle]');

                if(el_link != null){
                    let nextEl = el_link.nextElementSibling;
                    el_link.classList.add('show');
                    nextEl.classList.add('show');
                }

            });
            everyitem.addEventListener('mouseleave', function(e){
                let el_link = this.querySelector('a[data-bs-toggle]');

                if(el_link != null){
                    let nextEl = el_link.nextElementSibling;
                    el_link.classList.remove('show');
                    nextEl.classList.remove('show');
                }


            })
        });

    }
// end if innerWidth
}); 


function fill_sites_menu(){
    let sitemenu = document.getElementById("sitedash-dropdown");
    
    for(let i = 0;i < sites_data["results"].length; i++){
        result = sites_data["results"][i];
        let local_site_id = result["id"];
        let local_site_name = result["name"];

        let li = document.createElement("li");
        let link = document.createElement("a");
        link.setAttribute("href", '/static/balsamwebapp/sitedash.html?site_id=' + local_site_id);
        link.textContent = local_site_name;
        link.classList.add("dropdown-item");

        li.appendChild(link);
        sitemenu.appendChild(li);
    }
}