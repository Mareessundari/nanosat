document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');

    registrationForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent the default form submission

        // Get form data
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        // Validate form fields
        if (!name || !email || !password) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            // Send POST request to the server
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            // Parse the server response
            const result = await response.json();

            // Show the response message in an alert
            if (response.ok) {
                alert(result.message); // Alert the response message (e.g., "Registration successful!")
                if (result.message === 'Registration successful!') {
                    registrationForm.reset(); // Optionally, clear the form after success
                }
            } else {
                alert('Registration failed. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during registration. Please try again later.');
        }
    });
});



document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }

    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault(); // Prevent default form submission
        console.log('Login button clicked!');

        // Get form data
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        console.log({ email, password }); // Log input values for debugging

        if (!email || !password) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            
            const response = await fetch('http://localhost:8080/login', {
                method: 'POST',
                headers: {
                    //'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
            
                },
                credentials: "include",
                body: JSON.stringify({ email, password })
            })

            
            const result = await response.json();
            console.log('Response from server:', result); // Log the server response

            if (response.ok) {
                alert(result.message); // Show the success message
        
                window.location.href = 'satellite.html'; 
             } else {
                alert('Login failed: ' + result.message);
            }
        
        } catch (error) {
            console.error('Error during login:', error);
            alert('An error occurred. Please try again later.');
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
document.getElementById('generateReport').addEventListener('submit', async (event) => {
    event.preventDefault();
    // alert('The report downloaded and sent successfully to the emailID!!!');
    try {
        // Show loading alert
        alert('Generating the report, please wait...');
         const response = fetch('/generateReport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' ,
                //'Authorization': `Bearer ${token}`,
            },
            credentials : 'include',
            body: JSON.stringify(formData),
            //body: JSON.stringify({ email }),
        })
        if (!response.ok) {
            throw new Error('Failed to generate report.');
        }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Merged_Report.pdf';
            a.click();
            window.URL.revokeObjectURL(url); // Free memory
            alert("Satellite report generated and sent to your email!");
          
    }         
         catch(error){
            console.error("Error:", error);
            alert('An error occurred while generating the report');
        }
            });
        });
    