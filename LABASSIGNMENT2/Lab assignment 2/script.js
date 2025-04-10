
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('paymentForm');
            const successMessage = document.getElementById('successMessage');
            
            // Current date reference (April 09, 2025)
            const currentDate = new Date(2025, 3, 9); // Note: months are 0-indexed
            
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                
                // Reset previous error states
                resetErrors();
                
                // Validate all fields
                const isFullNameValid = validateFullName();
                const isEmailValid = validateEmail();
                const isPhoneValid = validatePhone();
                const isAddressValid = validateAddress();
                const isCardNumberValid = validateCardNumber();
                const isExpiryDateValid = validateExpiryDate();
                const isCvvValid = validateCvv();
                
                // If all validations pass
                if (isFullNameValid && isEmailValid && isPhoneValid && 
                    isAddressValid && isCardNumberValid && isExpiryDateValid && isCvvValid) {
                    
                    // Show success message
                    successMessage.style.display = 'block';
                    
                    // Reset form
                    form.reset();
                    
                    // Hide success message after 3 seconds
                    setTimeout(() => {
                        successMessage.style.display = 'none';
                    }, 3000);
                }
            });
            
            function resetErrors() {
                // Remove error classes from all inputs
                const inputs = form.querySelectorAll('input');
                inputs.forEach(input => {
                    input.classList.remove('error');
                });
                
                // Hide all error messages
                const errorMessages = form.querySelectorAll('.error-message');
                errorMessages.forEach(message => {
                    message.style.display = 'none';
                });
            }
            
            function showError(inputId, errorMessage) {
                const input = document.getElementById(inputId);
                const errorElement = document.getElementById(`${inputId}Error`);
                
                input.classList.add('error');
                errorElement.textContent = errorMessage;
                errorElement.style.display = 'block';
            }
            
            function validateFullName() {
                const fullName = document.getElementById('fullName').value.trim();
                const regex = /^[A-Za-z ]+$/;
                
                if (!fullName) {
                    showError('fullName', 'Full Name is required');
                    return false;
                }
                
                if (!regex.test(fullName)) {
                    showError('fullName', 'Only alphabetical characters and spaces allowed');
                    return false;
                }
                
                return true;
            }
            
            function validateEmail() {
                const email = document.getElementById('email').value.trim();
                const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                
                if (!email) {
                    showError('email', 'Email is required');
                    return false;
                }
                
                if (!regex.test(email)) {
                    showError('email', 'Please enter a valid email address');
                    return false;
                }
                
                return true;
            }
            
            function validatePhone() {
                const phone = document.getElementById('phone').value.trim();
                const regex = /^\d{10,15}$/;
                
                if (!phone) {
                    showError('phone', 'Phone number is required');
                    return false;
                }
                
                if (!regex.test(phone)) {
                    showError('phone', 'Phone number must contain 10-15 digits only');
                    return false;
                }
                
                return true;
            }
            
            function validateAddress() {
                const address = document.getElementById('address').value.trim();
                
                if (!address) {
                    showError('address', 'Address is required');
                    return false;
                }
                
                return true;
            }
            
            function validateCardNumber() {
                const cardNumber = document.getElementById('cardNumber').value.trim();
                const regex = /^\d{16}$/;
                
                if (!cardNumber) {
                    showError('cardNumber', 'Credit card number is required');
                    return false;
                }
                
                if (!regex.test(cardNumber)) {
                    showError('cardNumber', 'Credit card number must be exactly 16 digits');
                    return false;
                }
                
                return true;
            }
            
            function validateExpiryDate() {
                const expiryDate = document.getElementById('expiryDate').value.trim();
                const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
                
                if (!expiryDate) {
                    showError('expiryDate', 'Expiry date is required');
                    return false;
                }
                
                if (!regex.test(expiryDate)) {
                    showError('expiryDate', 'Please use MM/YY format');
                    return false;
                }
                
                // Parse the expiry date
                const [month, year] = expiryDate.split('/');
                const expiryMonth = parseInt(month, 10);
                const expiryYear = 2000 + parseInt(year, 10); // Convert YY to YYYY
                
                // Create date objects for comparison
                const expiryDateObj = new Date(expiryYear, expiryMonth - 1, 1); // First day of expiry month
                const nextMonthDateObj = new Date(expiryYear, expiryMonth, 1); // First day of next month
                
                // The card expires at the end of the month, so we compare with next month's first day
                if (nextMonthDateObj <= currentDate) {
                    showError('expiryDate', 'Expiry date must be in the future');
                    return false;
                }
                
                return true;
            }
            
            function validateCvv() {
                const cvv = document.getElementById('cvv').value.trim();
                const regex = /^\d{3}$/;
                
                if (!cvv) {
                    showError('cvv', 'CVV is required');
                    return false;
                }
                
                if (!regex.test(cvv)) {
                    showError('cvv', 'CVV must be exactly 3 digits');
                    return false;
                }
                
                return true;
            }
        });
   