const search = document.querySelector('input[name="search"]').value;
const pagination = document.querySelectorAll('a.pagiA');
for(const p of pagination){
    p.href += `&search=${search}`;
}