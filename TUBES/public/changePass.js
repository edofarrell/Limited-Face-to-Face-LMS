function check(e) {
    const newPass = document.querySelector('#newpass');
    const newPassConf = document.querySelector('#confirmpass');
    const error = document.querySelector('.error');
    if (newPass.value.length === 0) {
        error.textContent = 'New password must be filled';
        e.preventDefault();
    } else if (newPass.value.length < 8) {
        error.textContent = 'New password must be at least 8 characters';
        e.preventDefault();
    } else if (newPass.value.length > 12) {
        error.textContent = 'New password max length is 12 characters';
        e.preventDefault();
    } else if (newPass.value !== newPassConf.value) {
        error.textContent = "New password didn't match";
        e.preventDefault();
    } else {
        e.currentTarget.submit();
    }
}

const myForm = document.querySelector('form');
myForm.addEventListener('submit', check)