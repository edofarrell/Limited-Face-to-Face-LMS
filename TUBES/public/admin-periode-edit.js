function changeCommand(e) {
    const myForm = document.querySelector("form");
    myForm.action = "/ubahPeriode/delete";
}

function check(e) {
    const mulai = document.querySelector('input[name="tglMulai"]');
    const selesai = document.querySelector('input[name="tglSelesai"]');
    const kapasitas = document.querySelector('input[name="kap"]');
    const error = document.querySelector('.error');
    if (mulai.value.length === 0 || selesai.value.length === 0 || kapasitas.value.length === 0) {
        error.textContent = 'Semua data periode perlu diisi';
        e.preventDefault();
    } else if (kapasitas.value < 0 || kapasitas.value > 100) {
        error.textContent = 'Persentase kapasitas harus pada interval 1-100';
        e.preventDefault();
    } else {
        e.currentTarget.submit();
    }
}

const deleteBtn = document.querySelector('#delete');
deleteBtn.addEventListener('click', changeCommand);

const myForm = document.querySelector('form');
myForm.addEventListener('submit', check)