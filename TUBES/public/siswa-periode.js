const statusBox = document.querySelectorAll('.status');
for(const e of statusBox){
    const status = e.value;
    if(status==='Bersedia'){
        e.parentElement.style.backgroundColor = "green";
    }else{
        e.parentElement.style.backgroundColor = "red";
    }
}

const tersedia = document.querySelectorAll('p.Tersedia');
for(const b of tersedia){
    const input = b.textContent.split('/');
    const curr = parseInt(input[0]);
    const max = parseInt(input[1]);
    const status = b.nextElementSibling.firstElementChild.value;
    if(curr>=max && status!=='Bersedia'){
        const button = b.nextElementSibling.nextElementSibling;
        button.style.backgroundColor = "grey";
        button.disabled = true;
    }
}