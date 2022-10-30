const error = document.querySelector('p.error');
if(error.textContent !== ''){
    const button = document.querySelector('.KotakView');
    button.firstElementChild.style.pointerEvents = "none";
    button.style.backgroundColor = "grey";
}