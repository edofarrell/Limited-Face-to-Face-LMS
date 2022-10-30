function check(e) {
    const kode = document.querySelector('input[name="kodeRuangan"]');
    const kapasitas = document.querySelector('input[name="kapasitas"]');
    const error = document.querySelector('.error');
    if (kode.value.length === 0) {
        error.textContent = 'Kode Ruangan must be filled';
        e.preventDefault();
    } else if (kapasitas.value.length === 0) {
        error.textContent = 'Kapasitas must be filled';
        e.preventDefault();
    } else {
        e.currentTarget.submit();
    }
}

const myForm = document.querySelector('form');
myForm.addEventListener('submit', check)