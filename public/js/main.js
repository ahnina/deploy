import { submitFormWithNewIndex, submitForm } from "./search.js";
import { sendCustumizedData } from "./send-request-review.js";

/**
 ********************************************************************************
 * The main file added all functions based in what elements the page has.
 ********************************************************************************
 */
document.addEventListener('DOMContentLoaded', () => {
    let exhibitionForm = document.querySelector("#change-exhibition");
    let requestReviewForm = document.querySelector("#request-review-form");
    
    if (exhibitionForm != undefined && exhibitionForm && exhibitionForm != null) {
        let buttonsChangeIndex = document.querySelectorAll("#change-exhibition .button-change-index");
        let maxRowsSelect = document.querySelector("#change-exhibition #maxRows");
        let maxRowsOption = document.querySelectorAll("#change-exhibition #maxRows option");


        const params = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
        });

        let maxRows = params.maxRows;

        maxRowsOption.forEach((element) => {
            if (element.value == maxRows) {
                element.selected = true;
            }
        });

        buttonsChangeIndex.forEach((element) => {
            element.addEventListener('click', (e) => {
                submitFormWithNewIndex(e, exhibitionForm);
            });
        });
    
        maxRowsSelect.addEventListener('change', (e) => {
            submitForm(e, exhibitionForm);
        })
    }

    if (requestReviewForm != undefined && requestReviewForm && requestReviewForm != null) {
        requestReviewForm.addEventListener('submit', (event) => {
            sendCustumizedData(event);
        });
    }
    
        
});
