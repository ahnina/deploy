/**
 * Function that changes the hidden index input to submit the form
 * @param {Event} event 
 * @param {HTMLFormElement} form 
 */
export function submitFormWithNewIndex(event, form) {
    let indexInput = document.querySelector("#index-exhibition");
    let EventValue = event.target.value; 
    let indexValue = EventValue; 
    let indexChange = {'n': 1, 'p': -1}
    if (indexChange[EventValue]) {
        const params = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
        });
        
        let newIndex = (parseInt(params.index) + parseInt(indexChange[EventValue]));

        if (newIndex < 1) {
            newIndex = 1;
        }

        indexValue = newIndex
    } 

    indexInput.value = indexValue;
    form.requestSubmit();
}


/**
 * Function to submit the form. Used when an input changes. 
 * @param {Event} event 
 * @param {HTMLFormElement} form 
 */
export function submitForm(event, form) {
    form.requestSubmit();
}