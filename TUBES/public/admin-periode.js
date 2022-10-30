const statusBox = document.querySelectorAll('p.status');
for(const e of statusBox){
    const status = e.textContent;
    const printBtn = e.parentElement.nextElementSibling.nextElementSibling.firstElementChild;
    if(status==='Selesai'){
        e.parentElement.style.backgroundColor = "green";
    }else if (status==='Dibuka'){
        e.parentElement.style.backgroundColor = "yellow";
        printBtn.style.pointerEvents = "none";
        printBtn.parentElement.style.backgroundColor = "grey";
    }else{
        e.parentElement.style.backgroundColor = "red";
        printBtn.style.pointerEvents = "none";
        printBtn.parentElement.style.backgroundColor = "grey";
    }
}

const filter = document.querySelector('select').value;
const pagination = document.querySelectorAll('a.pagiA');
for(const p of pagination){
    p.href += `&filter=${filter}`;
}