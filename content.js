chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "insertCode") {
        insertCode(request.code);
    }
});

function insertCode(code) {
    // Priority list of input types and attributes to look for
    const priorityList = [
        { selector: 'input[type="text"][name*="code" i]', attribute: 'name' },
        { selector: 'input[type="number"][name*="code" i]', attribute: 'name' },
        { selector: 'input[placeholder*="code" i]', attribute: 'placeholder' },
        { selector: 'input[id*="code" i]', attribute: 'id' },
        { selector: 'input[name*="otp" i]', attribute: 'name' },
        { selector: 'input[placeholder*="otp" i]', attribute: 'placeholder' },
        { selector: 'input[id*="otp" i]', attribute: 'id' },
        { selector: 'input[type="text"]', attribute: 'type' },
        { selector: 'input[type="number"]', attribute: 'type' }
    ];

    let targetInput = null;

    // Try to find an input field based on the priority list
    for (const priority of priorityList) {
        const inputs = document.querySelectorAll(priority.selector);
        if (inputs.length > 0) {
            targetInput = inputs[0];
            console.log(`Found input with ${priority.attribute} containing "code" or "otp":`, targetInput);
            break;
        }
    }

    if (targetInput) {
        // Insert the code
        targetInput.value = code;
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Code inserted successfully');

        // Focus and highlight the input field
        targetInput.focus();
        targetInput.select();
    } else {
        console.log('No suitable input field found for inserting the code');
        alert('No suitable input field found for inserting the code. Please enter it manually.');
    }
}