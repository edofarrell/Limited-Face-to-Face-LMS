function check(e) {
    const username = document.querySelector('input[name="username"]');
    const password = document.querySelector('input[name="password"]');
    const error = document.querySelector('.error');
    if (username.value.length === 0) {
        error.textContent = 'Username must be filled';
        e.preventDefault();
    } else if (password.value.length === 0) {
        error.textContent = 'Password must be filled';
        e.preventDefault();
    } else {
        e.currentTarget.submit();
    }
}

const myForm = document.querySelector('form');
myForm.addEventListener('submit', check)