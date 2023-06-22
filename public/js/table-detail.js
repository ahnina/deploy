// Temporary function that shows the over view of the table and occults the others 
function toggleToOverView(){
    document.querySelector("table.table").style.display = "table";
    document.querySelector("section.table-details-content").style.display ="none";
    document.querySelector("section.sampleDatas").style.display="none";
};
// Temporary function that shows the details of the table and occults the others 
function toggleToDetail(){
    document.querySelector("table.table").style.display = "none";
    document.querySelector("section.table-details-content").style.display ="grid";
    document.querySelector("section.sampleDatas").style.display="none";
};
// Temporary function that shows the sample of the table and occults the others 
function toggleToSample(){
    document.querySelector("section.sampleDatas").style.display="grid";
    document.querySelector("section.table-details-content").style.display="none";
    document.querySelector("table.table").style.display="none";

};

function selected(element){
    // Selects the buttons in the nav on the top of the table details
    let tabs = document.getElementsByClassName("nav-bat-top-butom");
    // Verifys every buttom of the top nav 

    console.log(tabs)
    for(let i = 0; i < tabs.length; i++){
        let tab = tabs[i];
        if(tab.classList.contains("selected")){
            tab.classList.remove("selected");
        }
    };
    element.classList.add("selected");
}