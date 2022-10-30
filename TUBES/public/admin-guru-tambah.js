function check(e) {
    const nama = document.querySelector('input[name="nmGuru"]');
    const error = document.querySelector('.error');
    if (nama.value.length === 0) {
        error.textContent = 'Nama guru perlu diisi';
        e.preventDefault();
    } else {
        e.currentTarget.submit();
    }
}

const myForm = document.querySelector('form');
myForm.addEventListener('submit', check)