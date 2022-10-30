function check(e) {
    const nama = document.querySelector('input[name="nama"]');
    const username = document.querySelector('input[name="uname"]');
    const role = document.querySelector('select[name="role1"]');
    const password = document.querySelector('input[name="pword"]');
    const error = document.querySelector('.error');

    if (nama.value.legth === 0 || username.value.length === 0 || role.value.length === 0 || password.value.length === 0) {
        error.textContent = 'Semua data akun perlu diisi';
        e.preventDefault();
    } else if (password.value.length < 8 || password.value.length > 12) {
        error.textContent = 'Panjang password 8-12 karakter';
        e.preventDefault();
    } else {
        e.currentTarget.submit();
    }
}

const myForm = document.querySelector('form');
myForm.addEventListener('submit', check)