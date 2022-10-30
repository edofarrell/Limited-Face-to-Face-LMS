function changeCommand(e) {
    const myForm = document.querySelector("form");
    myForm.action = "/ubahGuru/delete";
}

const deleteBtn = document.querySelector('#delete');
deleteBtn.addEventListener('click', changeCommand);