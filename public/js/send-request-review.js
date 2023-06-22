/**
 * Function to do an Ajax to send the form data with a json
 * @param {Event} event 
 */
export function sendCustumizedData(event) {
    const connectionKeys = ["mechanics", "updateFrequency"];
    const eventType = event.submitter.dataset.type;
    const status = eventType == "accept" ? 2 : 3;

    event.preventDefault();    
    let fields = document.querySelectorAll('form fieldset.field');
    let values = {"fields": {}, 'status': status};

    let baseInputs = document.querySelectorAll('form > input:not([disabled])');
    values = joinObjects(values, getInputsValues(baseInputs));

    let inputsTable = document.querySelectorAll('form > details > fieldset > section > div > input:not([disabled])');
    let selectsTable = document.querySelectorAll('form > details > fieldset > section > div > select:not([disabled])');
    let textareaTable = document.querySelectorAll('form > details > fieldset > section > div > textarea:not([disabled])');

    fields.forEach(field => { 
        let id = field.querySelector('input:not([disabled])[name=fieldID]').value;

        let inputs = field.querySelectorAll('input:not([disabled])');
        let selects = field.querySelectorAll('select:not([disabled])');
        let textarea = field.querySelectorAll('select:not([disabled])');

        let fieldVar = {}
        fieldVar = getInputsValues(inputs);
        fieldVar = joinObjects(fieldVar, getInputsValues(selects));
        fieldVar = joinObjects(fieldVar, getInputsValues(textarea));
        values["fields"][id] = fieldVar;
    });
    
    values["table"] = getInputsValues(inputsTable);
    values["table"] = joinObjects(values["table"], getInputsValues(selectsTable));
    values["table"] = joinObjects(values["table"], getInputsValues(textareaTable));

    connectionKeys.forEach((key) => {
        if (values["table"][key]) {
            let obj = {};
            obj[key] = values["table"][key];
            values["connection"] = joinObjects(values["connection"], obj);
            delete values["table"][key];
        }
    });
    
    postFetch('/request', values).then((response) => {
        console.log(response);
        window.location.href = "/requests";
    }).catch((error) => {
        console.log(error)
        window.location.href = "/requests";
    });
}   


async function postFetch(url, values) {
    const head = {
        method: "POST", 
        mode: "cors", 
        cache: "no-cache",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(values), 
    };

    return new Promise((resolve, reject) => {
        fetch(url, head).then(result => resolve(result)).catch(err => reject(err));
    });
}


/**
 * Function to create a object with the key being the name and the value being the input value
 * @param {HTMLCollection} inputs 
 * @returns {'object'}
 */
function getInputsValues(inputs) {
    let values = {};
    inputs.forEach((input) => {
        let name = input.name;
        values[name] = joinObjects(values[name], input.value);
    });
    
    return values;
}


/**
 * Function to join objects
 * @param {'object'} BaseObject 
 * @param {'object'} objectToJoin 
 * @returns {'object'}
 */
function joinObjects(BaseObject, objectToJoin) {
    if (undefined == BaseObject || null == BaseObject) {
        BaseObject = objectToJoin;
    } else {
        BaseObject = Object.assign(BaseObject, objectToJoin);
    }

    return BaseObject;
}