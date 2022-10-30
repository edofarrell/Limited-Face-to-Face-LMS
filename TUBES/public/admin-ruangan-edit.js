function changeCommand(e) {
    const myForm = document.querySelector("form");
    myForm.action = "/ubahRuangan/delete";
}

function check(e) {
    const kapasitas = document.querySelector('input[name="kapasitas"]');
    const error = document.querySelector('.error');
    if (kapasitas.value.length === 0) {
        error.textContent = 'Kapasitas must be filled';
        e.preventDefault();
    } else {
        e.currentTarget.submit();
    }
}

const deleteBtn = document.querySelector('#delete');
deleteBtn.addEventListener('click', changeCommand);

const myForm = document.querySelector('form');
myForm.addEventListener('submit', check)