function changeCommand(e) {
    const myForm = document.querySelector("form");
    myForm.action = "/ubahAkun/delete";
}

const deleteBtn = document.querySelector('#delete');
deleteBtn.addEventListener('click', changeCommand);