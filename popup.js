document.addEventListener('DOMContentLoaded', function() {
    const fetchButton = document.getElementById('fetchCode');
    const insertButton = document.getElementById('insertCode');
    const copyButton = document.getElementById('copyCode');
    const codeDisplay = document.getElementById('codeDisplay');
    const codeValue = document.getElementById('codeValue');
    const statusDisplay = document.getElementById('statusDisplay');
    const loadingIndicator = document.getElementById('loadingIndicator');

    fetchButton.addEventListener('click', fetchLoginCode);
    insertButton.addEventListener('click', insertCode);
    copyButton.addEventListener('click', copyCode);

    async function fetchLoginCode() {
        try {
            showLoading(true);
            updateStatus('Authenticating...', '#4299e1');
            const token = await getAuthToken();

            updateStatus('Fetching recent emails...', '#4299e1');
            const emails = await fetchRecentEmails(token);

            updateStatus('Searching for login code...', '#4299e1');
            const code = extractCodeFromEmails(emails);

            if (code) {
                codeValue.textContent = code;
                codeDisplay.style.display = 'block';
                insertButton.style.display = 'flex';
                copyButton.style.display = 'flex';
                updateStatus('Code found!', '#48bb78');
            } else {
                updateStatus('No login code found in recent emails.', '#ecc94b');
            }
        } catch (error) {
            console.error('Error:', error);
            updateStatus(`Error: ${error.message}`, '#f56565');
        } finally {
            showLoading(false);
        }
    }

    function updateStatus(message, color) {
        statusDisplay.textContent = message;
        statusDisplay.style.color = color;
    }

    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
        fetchButton.disabled = isLoading;
        fetchButton.style.opacity = isLoading ? '0.5' : '1';
    }

    function getAuthToken() {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, function(token) {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(token);
                }
            });
        });
    }

    async function fetchRecentEmails(token) {
        const response = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages?q=newer_than:1d`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        return Promise.all(data.messages.map(msg => fetchEmailContent(token, msg.id)));
    }

    async function fetchEmailContent(token, messageId) {
        const response = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.json();
    }

    function extractCodeFromEmails(emails) {
        const codePatterns = [
            /(?:code|pin)(?:\s+is)?[:.\s]*(\d{4,8})/i,
            /(\d{4,8})(?:\s+is your|:\s+use this)\s+(?:code|pin)/i,
            /(?:use|enter)(?:\s+code)?[:.\s]*(\d{4,8})/i,
            /verification code[:.\s]*(\d{4,8})/i,
            /(?:^|\s)(\d{4,8})(?=\s|$)/  // Fallback: any 4-8 digit number
        ];

        for (let email of emails) {
            try {
                const body = decodeEmailBody(email);
                console.log('Decoded email body:', body); // For debugging

                for (let pattern of codePatterns) {
                    const match = body.match(pattern);
                    if (match) {
                        console.log('Match found:', match[1]);
                        return match[1];
                    }
                }
            } catch (error) {
                console.error('Error processing email:', error);
            }
        }
        return null;
    }

    function decodeEmailBody(email) {
        let body = '';
        if (email.payload.parts) {
            body = email.payload.parts.find(part => part.mimeType === 'text/plain')?.body?.data || '';
        } else if (email.payload.body?.data) {
            body = email.payload.body.data;
        }
        
        if (!body) {
            console.warn('Unable to find email body');
            return '';
        }
        
        try {
            return atob(body.replace(/-/g, '+').replace(/_/g, '/'));
        } catch (error) {
            console.error('Error decoding email body:', error);
            return '';
        }
    }

    function insertCode() {
        const code = codeValue.textContent;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "insertCode", code: code});
        });
        window.close();
    }

    function copyCode() {
        const code = codeValue.textContent;
        navigator.clipboard.writeText(code).then(() => {
            updateStatus('Code copied to clipboard!', '#48bb78');
            setTimeout(() => {
                window.close();
            }, 1000);
        }, (err) => {
            console.error('Could not copy text: ', err);
            updateStatus('Failed to copy code', '#f56565');
        });
    }
});