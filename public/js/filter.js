//This functions makes the filter container appears and desappears when the filter icon/button is clicked
function viewMode(){
    let filterBox = window.document.querySelector(".filter-box");

    if (filterBox.style.display === "none"){
        filterBox.style.display = "block";
    } else {
        filterBox.style.display = "none"
    };
};
